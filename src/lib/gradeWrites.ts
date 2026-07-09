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
 * The single write path for grade_ledger, used by both manual grade entry
 * (useGrades.upsertGrade) and every OCR import flow. Keeping one function
 * guarantees OCR-sourced and manually-typed grades are stored identically and
 * computed identically downstream by useGradeBook/depedGrading.
 */
export async function upsertGradeRecord(params: UpsertGradeParams): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase.from("grade_ledger").upsert(
    {
      file_id: params.assignmentId,
      student_id: params.studentId,
      student_name: params.studentName,
      scores: params.scores,
      max_total: params.maxTotal,
      feedback: params.feedback ?? null,
      confidence_vals: params.confidenceVals ?? null,
      source: params.source ?? "manual",
      user_id: userId,
    },
    { onConflict: "file_id,student_id" }
  );
  if (error) throw error;
}
