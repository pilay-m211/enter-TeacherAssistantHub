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

/**
 * Single source of truth for attendance rate math, shared by per-student
 * (useAttendance) and class-wide (useClassAttendance/useClassAttendanceSummary)
 * views so the numbers are always computed identically everywhere in the app.
 */
export function summarizeAttendance(
  records: Array<{ status: string }>
): AttendanceSummary {
  const summary: AttendanceSummary = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: records.length,
    ratePct: null,
  };
  for (const record of records) {
    if (record.status in summary) {
      summary[record.status as AttendanceStatus] += 1;
    }
  }
  if (summary.total > 0) {
    const attended = summary.present + summary.late + summary.excused;
    summary.ratePct = (attended / summary.total) * 100;
  }
  return summary;
}
