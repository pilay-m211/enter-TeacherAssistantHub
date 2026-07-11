import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClassRow } from "@/hooks/useClasses";
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

export interface AssignmentGradeDetail {
  assignmentId: string;
  name: string;
  component: AssignmentComponent;
  quarter: number;
  rawScore: number;
  maxScore: number;
  source: "manual" | "ocr";
  feedback: string | null;
  updatedAt: string | null;
}

export interface QuarterGradeSummary {
  quarter: number;
  writtenWorkPct: number | null;
  performanceTaskPct: number | null;
  quarterlyAssessmentPct: number | null;
  initialGrade: number | null;
  quarterlyGrade: number | null;
  assignments: AssignmentGradeDetail[];
}

function scoreTotal(scores: number[] | null | undefined): number {
  return (scores ?? []).reduce((sum, s) => sum + (s || 0), 0);
}

/**
 * Reuses the exact same DepEd computation functions as useGradeBook, filtered
 * to a single student. No new grading logic — this is a read-only view over
 * the same assignments/grade_records rows.
 */
export function useStudentGradeHistory(studentId: string | undefined, classId: string | undefined) {
  const [classItem, setClassItem] = useState<ClassRow | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !classId) return;
    let active = true;

    (async () => {
      setLoading(true);
      const [classRes, assignmentsRes] = await Promise.all([
        supabase.from("classes").select("*").eq("id", classId).maybeSingle(),
        supabase.from("assignments").select("*").eq("class_id", classId),
      ]);

      const assignmentIds = (assignmentsRes.data ?? []).map((a) => a.id);
      let gradeRows: GradeRow[] = [];
      if (assignmentIds.length > 0) {
        const gradesRes = await supabase
          .from("grade_records")
          .select("*")
          .in("assignment_id", assignmentIds)
          .eq("student_id", studentId);
        gradeRows = gradesRes.data ?? [];
      }

      if (active) {
        setClassItem(classRes.data ?? null);
        setAssignments(assignmentsRes.data ?? []);
        setGrades(gradeRows);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [studentId, classId]);

  const quarters = useMemo<QuarterGradeSummary[]>(() => {
    const subjectGroup = (classItem?.subject_group as SubjectGroup) ?? "core";
    const weights = COMPONENT_WEIGHTS_BY_SUBJECT_GROUP[subjectGroup];

    const gradeByAssignment = new Map<string, GradeRow>();
    for (const grade of grades) gradeByAssignment.set(grade.assignment_id, grade);

    const result: QuarterGradeSummary[] = [];
    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterAssignments = assignments.filter((a) => (a.quarter ?? 1) === quarter);

      const details: AssignmentGradeDetail[] = quarterAssignments.map((assignment) => {
        const grade = gradeByAssignment.get(assignment.id);
        const rawScore = grade?.scores ? scoreTotal(grade.scores) : grade?.score_numeric ?? 0;
        const maxScore = (assignment.max_score_per_q ?? assignment.max_score ?? 0) * (assignment.question_count ?? 1);
        return {
          assignmentId: assignment.id,
          name: assignment.title,
          component: (assignment.component as AssignmentComponent) ?? "written_oral",
          quarter,
          rawScore: rawScore ?? 0,
          maxScore,
          source: (grade?.source as "manual" | "ocr") ?? "manual",
          feedback: grade?.feedback ?? null,
          updatedAt: grade?.updated_at ?? null,
        };
      });

      const entries = details.map((d) => ({ component: d.component, scoreTotal: d.rawScore, maxTotal: d.maxScore }));
      const pcts = computeComponentPercentages(entries);
      const initialGrade = computeInitialGrade(pcts, weights);
      const quarterlyGrade = initialGrade !== null ? computeQuarterlyGrade(initialGrade) : null;

      result.push({
        quarter,
        writtenWorkPct: pcts.writtenOralPct,
        performanceTaskPct: pcts.performanceTaskPct,
        quarterlyAssessmentPct: pcts.examinationPct,
        initialGrade,
        quarterlyGrade,
        assignments: details,
      });
    }
    return result;
  }, [classItem, assignments, grades]);

  const finalGrade = useMemo(
    () => computeSemesterFinalGrade(quarters.map((q) => q.quarterlyGrade)),
    [quarters]
  );
  const remarks = useMemo(() => remarksFor(finalGrade), [finalGrade]);

  return { classItem, quarters, finalGrade, remarks, loading };
}
