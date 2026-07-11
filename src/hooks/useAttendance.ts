import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { summarizeAttendance, type AttendanceRow, type AttendanceStatus, type AttendanceSummary } from "@/lib/attendanceSummary";

export type { AttendanceRow, AttendanceStatus, AttendanceSummary };

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
      .eq("class_id", classId)
      .order("attendance_date", { ascending: false });
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
          class_id: classId,
          user_id: userId,
          attendance_date: params.date,
          quarter: params.quarter,
          status: params.status,
          reason_note: params.note ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,class_id,attendance_date" }
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
      1: summarizeAttendance([]),
      2: summarizeAttendance([]),
      3: summarizeAttendance([]),
      4: summarizeAttendance([]),
    };
    for (let q = 1; q <= 4; q++) {
      byQuarter[q] = summarizeAttendance(records.filter((r) => r.quarter === q));
    }
    return byQuarter;
  }, [records]);

  const overallSummary = useMemo(() => summarizeAttendance(records), [records]);

  return { records, loading, upsertAttendance, deleteAttendance, summaryByQuarter, overallSummary, refresh };
}
