import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { upsertGradeRecord } from "@/lib/gradeWrites";

export type GradeRow = Tables<"grade_records">;

export function useGrades(assignmentId: string | undefined) {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("grade_records")
      .select("*")
      .eq("assignment_id", assignmentId);
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
      source?: "manual" | "ocr";
    }) => {
      if (!assignmentId) return;
      await upsertGradeRecord({ assignmentId, ...params });
      await refresh();
    },
    [assignmentId, refresh]
  );

  return { grades, loading, upsertGrade, refresh };
}
