import { TrendingUp, CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TermGradeSummary } from "@/hooks/useStudentGradeHistory";
import type { AttendanceSummary } from "@/hooks/useAttendance";

interface ProgressSummaryCardProps {
  terms: TermGradeSummary[];
  finalGrade: number | null;
  remarks: "PASSED" | "FAILED" | "INCOMPLETE";
  attendanceSummary: AttendanceSummary;
}

export function ProgressSummaryCard({ terms, finalGrade, remarks, attendanceSummary }: ProgressSummaryCardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card variant="glass" className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
          </span>
          <h3 className="text-sm font-semibold">Grade Trend</h3>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {terms.map((t) => (
            <div key={t.semester} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">T{t.semester}</span>
              {t.termGrade !== null ? (
                <Badge variant={t.termGrade >= 75 ? "verified" : "destructive"} className="w-full justify-center">
                  {t.termGrade}
                </Badge>
              ) : (
                <Badge variant="outline" className="w-full justify-center text-muted-foreground">
                  —
                </Badge>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="text-xs text-muted-foreground">Final Grade</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{finalGrade ?? "—"}</span>
            <Badge variant={remarks === "PASSED" ? "verified" : remarks === "FAILED" ? "destructive" : "outline"}>
              {remarks}
            </Badge>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
            <CalendarCheck className="h-4.5 w-4.5 text-accent" />
          </span>
          <h3 className="text-sm font-semibold">Attendance Rate</h3>
        </div>
        <div className="mt-4 text-3xl font-bold tracking-tight">
          {attendanceSummary.ratePct !== null ? `${attendanceSummary.ratePct.toFixed(0)}%` : "—"}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">{attendanceSummary.present}</p>
            Present
          </div>
          <div>
            <p className="font-semibold text-foreground">{attendanceSummary.late}</p>
            Late
          </div>
          <div>
            <p className="font-semibold text-foreground">{attendanceSummary.excused}</p>
            Excused
          </div>
          <div>
            <p className="font-semibold text-foreground">{attendanceSummary.absent}</p>
            Absent
          </div>
        </div>
      </Card>
    </div>
  );
}
