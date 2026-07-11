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
export function useClassAttendanceSummary(classId: string | undefined, semester?: 1 | 2 | 3) {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    let active = true;

    (async () => {
      setLoading(true);
      let query = supabase.from("attendance_records").select("*").eq("class_id", classId);
      if (semester) query = query.eq("semester", semester);

      const [attendanceRes, rosterRes] = await Promise.all([
        query,
        supabase.from("class_students").select("student_id, students(first_name, last_name)").eq("class_id", classId),
      ]);

      if (active) {
        setRecords(attendanceRes.data ?? []);
        const names: Record<string, string> = {};
        for (const row of rosterRes.data ?? []) {
          const student = row.students as unknown as { first_name: string; last_name: string } | null;
          if (student) {
            names[row.student_id] = [student.first_name, student.last_name].filter(Boolean).join(" ").trim();
          }
        }
        setStudentNames(names);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [classId, semester]);

  const data = useMemo<ClassAttendanceSummaryData>(() => {
    const overall = summarizeAttendance(records);
    const daysRecorded = new Set(records.map((r) => r.attendance_date)).size;

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
