import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { summarizeAttendance, type AttendanceRow, type AttendanceSummary } from "@/lib/attendanceSummary";

export interface StudentAttendanceRollup {
  studentId: string;
  studentName: string;
  summary: AttendanceSummary;
}

export interface ClassAttendanceSummaryData {
  overall: AttendanceSummary;
  daysRecorded: number;
  byStudent: StudentAttendanceRollup[];
}

/**
 * Aggregate attendance across an entire class — used for the class-wide
 * summary card and (optionally) a per-student breakdown table. Reads the same
 * attendance_records rows the daily marking screen writes and the student
 * profile's per-student tab reads; no separate aggregation table.
 */
export function useClassAttendanceSummary(classId: string | undefined, quarter?: number) {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    let active = true;

    (async () => {
      setLoading(true);
      let query = supabase.from("attendance_records").select("*").eq("folder_id", classId);
      if (quarter) query = query.eq("quarter", quarter);

      const [attendanceRes, studentsRes] = await Promise.all([
        query,
        supabase.from("students").select("id, name").eq("folder_id", classId),
      ]);

      if (active) {
        setRecords(attendanceRes.data ?? []);
        const names: Record<string, string> = {};
        for (const student of studentsRes.data ?? []) {
          names[student.id] = student.name;
        }
        setStudentNames(names);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [classId, quarter]);

  const data = useMemo<ClassAttendanceSummaryData>(() => {
    const overall = summarizeAttendance(records);
    const daysRecorded = new Set(records.map((r) => r.date)).size;

    const byStudentMap = new Map<string, AttendanceRow[]>();
    for (const record of records) {
      const arr = byStudentMap.get(record.student_id) ?? [];
      arr.push(record);
      byStudentMap.set(record.student_id, arr);
    }

    const byStudent: StudentAttendanceRollup[] = Array.from(byStudentMap.entries())
      .map(([studentId, studentRecords]) => ({
        studentId,
        studentName: studentNames[studentId] ?? "Unknown",
        summary: summarizeAttendance(studentRecords),
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    return { overall, daysRecorded, byStudent };
  }, [records, studentNames]);

  return { ...data, loading };
}
