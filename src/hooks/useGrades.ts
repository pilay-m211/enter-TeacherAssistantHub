import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GradeRow = Tables<"grade_ledger">;

export function useGrades(assignmentId: string | undefined) {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("grade_ledger")
      .select("*")
      .eq("file_id", assignmentId);
    setGrades(data ?? []);
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertGrade = useCallback(
    async (params: {
      studentId: string;
      studentName: string;
      scores: number[];
      maxTotal: number;
      feedback?: string;
      confidenceVals?: number[];
    }) => {
      if (!assignmentId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("grade_ledger")
        .upsert(
          {
            file_id: assignmentId,
            student_id: params.studentId,
            student_name: params.studentName,
            scores: params.scores,
            max_total: params.maxTotal,
            feedback: params.feedback ?? null,
            confidence_vals: params.confidenceVals ?? null,
            user_id: userId,
          },
          { onConflict: "file_id,student_id" }
        );
      if (error) throw error;
      await refresh();
    },
    [assignmentId, refresh]
  );

  return { grades, loading, upsertGrade, refresh };
}
