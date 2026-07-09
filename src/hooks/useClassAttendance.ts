import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StudentRow } from "@/hooks/useStudents";
import { summarizeAttendance, type AttendanceStatus, type AttendanceSummary } from "@/lib/attendanceSummary";

export interface AttendanceDraftEntry {
  status: AttendanceStatus;
  note: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function quarterForDate(): number {
  // Best-effort default; teacher can override via the quarter selector.
  return 1;
}

/**
 * Powers the fast, class-wide daily attendance screen: loads the roster and
 * any existing attendance for a given date, defaults every student without a
 * saved record to "present", and saves one row per active student on commit
 * (upsert against the same student_id+folder_id+date unique key the
 * per-student flow already uses — no duplicate rows, no parallel model).
 */
export function useClassAttendance(classId: string | undefined, initialDate?: string) {
  const [date, setDate] = useState(initialDate ?? todayIso());
  const [quarter, setQuarter] = useState(quarterForDate());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [draft, setDraft] = useState<Record<string, AttendanceDraftEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadForDate = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    const [studentsRes, attendanceRes] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("folder_id", classId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase.from("attendance_records").select("*").eq("folder_id", classId).eq("date", date),
    ]);

    const activeStudents = studentsRes.data ?? [];
    const existingRecords = attendanceRes.data ?? [];

    const nextDraft: Record<string, AttendanceDraftEntry> = {};
    for (const student of activeStudents) {
      const existing = existingRecords.find((r) => r.student_id === student.id);
      nextDraft[student.id] = {
        status: (existing?.status as AttendanceStatus) ?? "present",
        note: existing?.note ?? "",
      };
    }

    if (existingRecords.length > 0) {
      setQuarter(existingRecords[0].quarter);
    }

    setStudents(activeStudents);
    setDraft(nextDraft);
    setLoading(false);
  }, [classId, date]);

  useEffect(() => {
    loadForDate();
  }, [loadForDate]);

  const setStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }, []);

  const setNote = useCallback((studentId: string, note: string) => {
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  }, []);

  const markAllPresent = useCallback(() => {
    setDraft((prev) => {
      const next: Record<string, AttendanceDraftEntry> = {};
      for (const studentId of Object.keys(prev)) {
        next[studentId] = { status: "present", note: "" };
      }
      return next;
    });
  }, []);

  const liveSummary = useMemo<AttendanceSummary>(() => {
    return summarizeAttendance(Object.values(draft).map((entry) => ({ status: entry.status })));
  }, [draft]);

  const save = useCallback(async () => {
    if (!classId) return;
    const todayCutoff = todayIso();
    if (date > todayCutoff) {
      throw new Error("Cannot record attendance for a future date");
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const rows = students.map((student) => {
        const entry = draft[student.id] ?? { status: "present" as AttendanceStatus, note: "" };
        return {
          student_id: student.id,
          folder_id: classId,
          user_id: userId,
          date,
          quarter,
          status: entry.status,
          note: entry.note.trim() || null,
          updated_at: new Date().toISOString(),
        };
      });

      if (rows.length === 0) return;

      const { error } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "student_id,folder_id,date" });
      if (error) throw error;

      await loadForDate();
    } finally {
      setSaving(false);
    }
  }, [classId, date, quarter, students, draft, loadForDate]);

  return {
    date,
    setDate,
    quarter,
    setQuarter,
    students,
    draft,
    setStatus,
    setNote,
    markAllPresent,
    liveSummary,
    loading,
    saving,
    save,
    todayIso: todayIso(),
  };
}
