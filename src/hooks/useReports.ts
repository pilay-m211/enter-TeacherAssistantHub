import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClassReport {
  classId: string;
  className: string;
  studentCount: number;
  assignmentCount: number;
  avgScorePct: number | null;
}

export function useReports() {
  const [reports, setReports] = useState<ClassReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      const { data: classes } = await supabase.from("classes").select("id, name");
      if (!classes || classes.length === 0) {
        if (active) {
          setReports([]);
          setLoading(false);
        }
        return;
      }

      const results = await Promise.all(
        classes.map(async (classItem) => {
          const [studentsRes, assignmentsRes] = await Promise.all([
            supabase.from("class_students").select("student_id", { count: "exact", head: true }).eq("class_id", classItem.id),
            supabase.from("assignments").select("id, max_score_per_q, question_count, max_score").eq("class_id", classItem.id),
          ]);

          const assignmentList = assignmentsRes.data ?? [];
          const assignmentIds = assignmentList.map((a) => a.id);
          const maxByAssignment = new Map(assignmentList.map((a) => [a.id, (a.max_score_per_q ?? a.max_score ?? 0) * (a.question_count ?? 1)]));
          let avgScorePct: number | null = null;

          if (assignmentIds.length > 0) {
            const { data: grades } = await supabase
              .from("grade_records")
              .select("assignment_id, scores, score_numeric")
              .in("assignment_id", assignmentIds);

            const pcts = (grades ?? [])
              .map((g) => {
                const total = g.scores
                  ? (g.scores ?? []).reduce((sum: number, s: number | null) => sum + (s || 0), 0)
                  : g.score_numeric ?? 0;
                const max = maxByAssignment.get(g.assignment_id) || 0;
                return max > 0 ? (total / max) * 100 : null;
              })
              .filter((v): v is number => v !== null);

            if (pcts.length > 0) {
              avgScorePct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
            }
          }

          return {
            classId: classItem.id,
            className: classItem.name,
            studentCount: studentsRes.count ?? 0,
            assignmentCount: assignmentIds.length,
            avgScorePct,
          };
        })
      );

      if (active) {
        setReports(results);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { reports, loading };
}
