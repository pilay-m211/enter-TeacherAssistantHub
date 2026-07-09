import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOcrScan, type ClassRecordTableOcrResult } from "@/hooks/useOcrScan";
import { useOcrImportAudit } from "@/hooks/useOcrImportAudit";
import { upsertGradeRecord } from "@/lib/gradeWrites";
import { matchStudentByName } from "@/lib/studentMatching";
import type { StudentRow } from "@/hooks/useStudents";
import type { AssignmentRow, CreateAssignmentInput } from "@/hooks/useAssignments";
import type { AssignmentComponent } from "@/lib/depedGrading";

export interface OcrTableColumnMapping {
  header: string;
  /** Existing assignment this column maps to, or null if it should become a new assignment. */
  assignmentId: string | null;
  /** Used only when assignmentId is null (creating a new assignment for this column). */
  newAssignmentMaxScore: number;
  newAssignmentComponent: AssignmentComponent;
  include: boolean;
}

export interface OcrTableRowDraft {
  ocrName: string;
  nameConfidence: number;
  studentId: string | null;
  matchScore: number;
  isNewStudent: boolean;
  scores: (number | null)[];
  scoreConfidence: number[];
  include: boolean;
}

interface ImportContext {
  classId: string;
  quarter: number;
  students: StudentRow[];
  assignments: AssignmentRow[];
  addStudents: (names: string[]) => Promise<void>;
  createAssignment: (input: CreateAssignmentInput) => Promise<AssignmentRow | undefined>;
}

export function useOcrTableImport() {
  const { scan, isScanning, error } = useOcrScan("class_record_table");
  const { logImport } = useOcrImportAudit();

  const [columns, setColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<OcrTableColumnMapping[]>([]);
  const [rows, setRows] = useState<OcrTableRowDraft[]>([]);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<ClassRecordTableOcrResult | null>(null);

  const runScan = useCallback(
    async (file: File, quarter: number, students: StudentRow[]) => {
      const outcome = await scan(file, { hint_quarter: quarter });
      if (!outcome) return false;

      const { result, storagePath: path } = outcome;
      setStoragePath(path);
      setRawResult(result);
      setColumns(result.columns);
      setColumnMappings(
        result.columns.map((header) => ({
          header,
          assignmentId: null,
          newAssignmentMaxScore: 100,
          newAssignmentComponent: "written_work",
          include: true,
        }))
      );
      setRows(
        result.rows.map((row) => {
          const { student, score } = matchStudentByName(row.name, students);
          return {
            ocrName: row.name,
            nameConfidence: row.name_confidence,
            studentId: student?.id ?? null,
            matchScore: score,
            isNewStudent: false,
            scores: row.scores,
            scoreConfidence: row.score_confidence,
            include: true,
          };
        })
      );
      return true;
    },
    [scan]
  );

  const avgConfidence = useMemo(() => {
    const values: number[] = [];
    for (const row of rows) {
      values.push(row.nameConfidence);
      values.push(...row.scoreConfidence);
    }
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [rows]);

  const reset = useCallback(() => {
    setColumns([]);
    setColumnMappings([]);
    setRows([]);
    setStoragePath(null);
    setRawResult(null);
  }, []);

  /**
   * Commits reviewed rows through the exact same write paths manual entry uses
   * (addStudents / createAssignment / upsertGradeRecord). Nothing here is a
   * separate OCR data model — it writes into students / files / grade_ledger.
   */
  const commit = useCallback(
    async (ctx: ImportContext) => {
      // 1. Resolve columns -> real assignment IDs, creating new assignments where needed.
      const columnToAssignmentId = new Map<number, string>();
      for (let colIndex = 0; colIndex < columnMappings.length; colIndex++) {
        const mapping = columnMappings[colIndex];
        if (!mapping.include) continue;

        if (mapping.assignmentId) {
          columnToAssignmentId.set(colIndex, mapping.assignmentId);
          continue;
        }

        const created = await ctx.createAssignment({
          name: mapping.header,
          gradingType: "simple",
          maxScorePerQuestion: mapping.newAssignmentMaxScore,
          component: mapping.newAssignmentComponent,
          quarter: ctx.quarter,
        });
        if (created) columnToAssignmentId.set(colIndex, created.id);
      }

      // 2. Add any brand-new students the teacher confirmed should be created,
      // then re-fetch the roster directly so we get their generated IDs.
      const newStudentNames = rows
        .filter((r) => r.include && r.isNewStudent && !r.studentId)
        .map((r) => r.ocrName);

      let freshStudents = ctx.students;
      if (newStudentNames.length > 0) {
        await ctx.addStudents(newStudentNames);
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("folder_id", ctx.classId)
          .order("name", { ascending: true });
        freshStudents = data ?? ctx.students;
      }

      const resolveStudentId = (row: OcrTableRowDraft): string | null => {
        if (row.studentId) return row.studentId;
        if (row.isNewStudent) {
          const match = freshStudents.find(
            (s) => s.name.trim().toLowerCase() === row.ocrName.trim().toLowerCase()
          );
          return match?.id ?? null;
        }
        return null;
      };

      // 3. Write grades — same upsertGradeRecord function manual entry uses.
      let rowsCommitted = 0;
      for (const row of rows) {
        if (!row.include) continue;
        const studentId = resolveStudentId(row);
        if (!studentId) continue;

        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
          const assignmentId = columnToAssignmentId.get(colIndex);
          if (!assignmentId) continue;
          const score = row.scores[colIndex];
          if (score === null || score === undefined) continue;

          const assignment = ctx.assignments.find((a) => a.id === assignmentId);
          const maxTotal =
            assignment != null
              ? (assignment.max_score_per_q ?? 100) * (assignment.question_count ?? 1)
              : columnMappings[colIndex]?.newAssignmentMaxScore ?? 100;

          await upsertGradeRecord({
            assignmentId,
            studentId,
            studentName: row.ocrName,
            scores: [score],
            maxTotal,
            confidenceVals: [row.scoreConfidence[colIndex] ?? 1],
            source: "ocr",
          });
          rowsCommitted++;
        }
      }

      // 4. Audit log — metadata only, never a duplicate of the grade data itself.
      if (storagePath) {
        await logImport({
          folderId: ctx.classId,
          fileId: null,
          mode: "class_record_table",
          storagePath,
          rawResult,
          rowsExtracted: rows.length,
          rowsCommitted,
          avgConfidence,
        });
      }

      reset();
      return rowsCommitted;
    },
    [columnMappings, columns, rows, storagePath, rawResult, avgConfidence, logImport, reset]
  );

  return {
    isScanning,
    error,
    columns,
    columnMappings,
    setColumnMappings,
    rows,
    setRows,
    avgConfidence,
    runScan,
    commit,
    reset,
    hasResult: columns.length > 0,
  };
}
