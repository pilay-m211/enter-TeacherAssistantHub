import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClassRow } from "@/hooks/useClasses";
import type { StudentRow } from "@/hooks/useStudents";
import type { AssignmentRow } from "@/hooks/useAssignments";
import type { GradeRow } from "@/hooks/useGrades";
import {
  COMPONENT_WEIGHTS_BY_SUBJECT_GROUP,
  computeComponentPercentages,
  computeInitialGrade,
  computeQuarterlyGrade,
  computeSemesterFinalGrade,
  remarksFor,
  type AssignmentComponent,
  type SubjectGroup,
} from "@/lib/gradingConfig";

export interface QuarterStudentGrade {
  studentId: string;
  studentName: string;
  writtenWorkPct: number | null;
  performanceTaskPct: number | null;
  quarterlyAssessmentPct: number | null;
  initialGrade: number | null;
  quarterlyGrade: number | null;
}

export interface StudentYearSummary {
  studentId: string;
  studentName: string;
  quarterlyGrades: Array<number | null>; // index 0 = Q1 ... index 3 = Q4
  finalGrade: number | null;
  remarks: "PASSED" | "FAILED" | "INCOMPLETE";
}

export interface GradeBookData {
  classItem: ClassRow | null;
  students: StudentRow[];
  assignmentsByQuarter: Record<number, AssignmentRow[]>;
  quarterGrades: Record<number, QuarterStudentGrade[]>;
  yearSummary: StudentYearSummary[];
}

function scoreTotal(scores: number[] | null | undefined): number {
  return (scores ?? []).reduce((sum, s) => sum + (s || 0), 0);
}

export function useGradeBook(classId: string | undefined) {
  const [classItem, setClassItem] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!classId) return;
    let active = true;

    (async () => {
      setLoading(true);

      const [classRes, rosterRes, assignmentsRes] = await Promise.all([
        supabase.from("classes").select("*").eq("id", classId).maybeSingle(),
        supabase.from("class_students").select("student_id, students(*)").eq("class_id", classId),
        supabase.from("assignments").select("*").eq("class_id", classId),
      ]);

      const rosterStudents: StudentRow[] = (rosterRes.data ?? [])
        .map((row) => {
          const student = row.students as unknown as import("@/hooks/useStudents").StudentRecord | null;
          if (!student) return null;
          const name = [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || student.last_name;
          return {
            ...student,
            name,
            folder_id: classId,
            status: student.is_archived ? ("inactive" as const) : ("active" as const),
            student_number: student.lrn,
          };
        })
        .filter((s): s is StudentRow => s !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      const assignmentIds = (assignmentsRes.data ?? []).map((a) => a.id);
      let gradeRows: GradeRow[] = [];
      if (assignmentIds.length > 0) {
        const gradesRes = await supabase.from("grade_records").select("*").in("assignment_id", assignmentIds);
        gradeRows = gradesRes.data ?? [];
      }

      if (active) {
        setClassItem(classRes.data ?? null);
        setStudents(rosterStudents);
        setAssignments(assignmentsRes.data ?? []);
        setGrades(gradeRows);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [classId, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const data = useMemo<GradeBookData>(() => {
    const subjectGroup = (classItem?.subject_group as SubjectGroup) ?? "core";
    const weights = COMPONENT_WEIGHTS_BY_SUBJECT_GROUP[subjectGroup];

    const assignmentsByQuarter: Record<number, AssignmentRow[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const assignment of assignments) {
      const quarter = assignment.quarter ?? 1;
      assignmentsByQuarter[quarter]?.push(assignment);
    }

    const gradeByAssignmentAndStudent = new Map<string, GradeRow>();
    for (const grade of grades) {
      gradeByAssignmentAndStudent.set(`${grade.assignment_id}:${grade.student_id}`, grade);
    }

    const quarterGrades: Record<number, QuarterStudentGrade[]> = { 1: [], 2: [], 3: [], 4: [] };
    const quarterlyByStudent = new Map<string, Array<number | null>>();
    for (const student of students) {
      quarterlyByStudent.set(student.id, [null, null, null, null]);
    }

    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterAssignments = assignmentsByQuarter[quarter] ?? [];

      for (const student of students) {
        const entries = quarterAssignments.map((assignment) => {
          const grade = gradeByAssignmentAndStudent.get(`${assignment.id}:${student.id}`);
          const rawTotal = grade?.scores ? scoreTotal(grade.scores) : grade?.score_numeric ?? 0;
          const maxTotal = (assignment.max_score_per_q ?? assignment.max_score ?? 0) * (assignment.question_count ?? 1);
          return {
            component: (assignment.component as AssignmentComponent) ?? "written_oral",
            scoreTotal: rawTotal ?? 0,
            maxTotal,
          };
        });

        const pcts = computeComponentPercentages(entries);
        const initialGrade = computeInitialGrade(pcts, weights);
        const quarterlyGrade = initialGrade !== null ? computeQuarterlyGrade(initialGrade) : null;

        quarterGrades[quarter].push({
          studentId: student.id,
          studentName: student.name,
          writtenWorkPct: pcts.writtenOralPct,
          performanceTaskPct: pcts.performanceTaskPct,
          quarterlyAssessmentPct: pcts.examinationPct,
          initialGrade,
          quarterlyGrade,
        });

        const arr = quarterlyByStudent.get(student.id);
        if (arr) arr[quarter - 1] = quarterlyGrade;
      }
    }

    const yearSummary: StudentYearSummary[] = students.map((student) => {
      const quarterlyGradesArr = quarterlyByStudent.get(student.id) ?? [null, null, null, null];
      const finalGrade = computeSemesterFinalGrade(quarterlyGradesArr);
      return {
        studentId: student.id,
        studentName: student.name,
        quarterlyGrades: quarterlyGradesArr,
        finalGrade,
        remarks: remarksFor(finalGrade),
      };
    });

    return { classItem, students, assignmentsByQuarter, quarterGrades, yearSummary };
  }, [classItem, students, assignments, grades]);

  return { ...data, assignments, grades, loading, refresh };
}
