import { supabase } from "@/integrations/supabase/client";

export interface UpsertGradeParams {
  assignmentId: string;
  studentId: string;
  studentName: string;
  scores: number[];
  maxTotal: number;
  feedback?: string | null;
  confidenceVals?: number[] | null;
  source?: "manual" | "ocr";
}

/**
 * The single write path for grade_records, used by both manual grade entry
 * (useGrades.upsertGrade) and every OCR import flow. Keeping one function
 * guarantees OCR-sourced and manually-typed grades are stored identically and
 * computed identically downstream by useGradeBook/gradingConfig.
 */
export async function upsertGradeRecord(params: UpsertGradeParams): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // grade_records denormalizes class_id/semester from the assignment
  // for fast querying, so resolve it once up front.
  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("class_id, semester")
    .eq("id", params.assignmentId)
    .single();
  if (assignmentError) throw assignmentError;

  const scoreTotal = params.scores.reduce((sum, s) => sum + (s || 0), 0);

  const { error } = await supabase.from("grade_records").upsert(
    {
      assignment_id: params.assignmentId,
      student_id: params.studentId,
      class_id: assignment.class_id,
      student_name: params.studentName,
      scores: params.scores,
      score_numeric: scoreTotal,
      feedback: params.feedback ?? null,
      confidence_vals: params.confidenceVals ?? null,
      source: params.source ?? "manual",
      semester: assignment.semester,
      user_id: userId,
    },
    { onConflict: "student_id,assignment_id" }
  );
  if (error) throw error;
}
