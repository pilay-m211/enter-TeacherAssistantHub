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
        supabase.from("folders").select("*", { count: "exact", head: true }),
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("files").select("*", { count: "exact", head: true }),
        supabase.from("grade_ledger").select("scores, max_total"),
      ]);

      let avgScorePct: number | null = null;
      const grades = gradesRes.data ?? [];
      if (grades.length > 0) {
        const pcts = grades
          .map((g) => {
            const total = (g.scores ?? []).reduce((sum: number, s: number | null) => sum + (s || 0), 0);
            const max = g.max_total || 0;
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
