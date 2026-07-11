import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  classCount: number;
  studentCount: number;
  assignmentCount: number;
  avgScorePct: number | null;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      const [classesRes, studentsRes, assignmentsRes, gradesRes] = await Promise.all([
        supabase.from("classes").select("*", { count: "exact", head: true }),
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("assignments").select("*", { count: "exact", head: true }),
        supabase.from("grade_records").select("scores, score_numeric, assignments(max_score_per_q, question_count, max_score)"),
      ]);

      let avgScorePct: number | null = null;
      const grades = gradesRes.data ?? [];
      if (grades.length > 0) {
        const pcts = grades
          .map((g) => {
            const assignment = g.assignments as unknown as {
              max_score_per_q: number | null;
              question_count: number | null;
              max_score: number | null;
            } | null;
            const total = g.scores
              ? (g.scores ?? []).reduce((sum: number, s: number | null) => sum + (s || 0), 0)
              : g.score_numeric ?? 0;
            const max = (assignment?.max_score_per_q ?? assignment?.max_score ?? 0) * (assignment?.question_count ?? 1);
            return max > 0 ? (total / max) * 100 : null;
          })
          .filter((v): v is number => v !== null);
        if (pcts.length > 0) {
          avgScorePct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
        }
      }

      if (active) {
        setStats({
          classCount: classesRes.count ?? 0,
          studentCount: studentsRes.count ?? 0,
          assignmentCount: assignmentsRes.count ?? 0,
          avgScorePct,
        });
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { stats, loading };
}
