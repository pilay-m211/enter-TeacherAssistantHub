import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AttendanceRow = Tables<"attendance_records">;
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  ratePct: number | null; // present+late+excused counted as "attended" for rate purposes
}

function summarize(records: AttendanceRow[]): AttendanceSummary {
  const summary: AttendanceSummary = { present: 0, absent: 0, late: 0, excused: 0, total: records.length, ratePct: null };
  for (const record of records) {
    summary[record.status as AttendanceStatus] += 1;
  }
  if (summary.total > 0) {
    const attended = summary.present + summary.late + summary.excused;
    summary.ratePct = (attended / summary.total) * 100;
  }
  return summary;
}

export function useAttendance(studentId: string | undefined, classId: string | undefined) {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId || !classId) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .eq("folder_id", classId)
      .order("date", { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }, [studentId, classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertAttendance = useCallback(
    async (params: { date: string; quarter: number; status: AttendanceStatus; note?: string | null }) => {
      if (!studentId || !classId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("attendance_records").upsert(
        {
          student_id: studentId,
          folder_id: classId,
          user_id: userId,
          date: params.date,
          quarter: params.quarter,
          status: params.status,
          note: params.note ?? null,
        },
        { onConflict: "student_id,folder_id,date" }
      );
      if (error) throw error;
      await refresh();
    },
    [studentId, classId, refresh]
  );

  const deleteAttendance = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("attendance_records").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const summaryByQuarter = useMemo(() => {
    const byQuarter: Record<number, AttendanceSummary> = {
      1: summarize([]),
      2: summarize([]),
      3: summarize([]),
      4: summarize([]),
    };
    for (let q = 1; q <= 4; q++) {
      byQuarter[q] = summarize(records.filter((r) => r.quarter === q));
    }
    return byQuarter;
  }, [records]);

  const overallSummary = useMemo(() => summarize(records), [records]);

  return { records, loading, upsertAttendance, deleteAttendance, summaryByQuarter, overallSummary, refresh };
}
