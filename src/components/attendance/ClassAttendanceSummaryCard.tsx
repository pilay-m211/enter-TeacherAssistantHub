import { Card } from "@/components/ui/card";
import type { AttendanceSummary } from "@/lib/attendanceSummary";

interface ClassAttendanceSummaryCardProps {
  summary: AttendanceSummary;
  title?: string;
}

export function ClassAttendanceSummaryCard({ summary, title = "Today's Summary" }: ClassAttendanceSummaryCardProps) {
  return (
    <Card variant="glass" className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-lg font-bold">
          {summary.ratePct !== null ? `${summary.ratePct.toFixed(0)}%` : "—"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat label="Present" value={summary.present} className="text-primary" />
        <Stat label="Absent" value={summary.absent} className="text-destructive" />
        <Stat label="Late" value={summary.late} className="text-warning" />
        <Stat label="Excused" value={summary.excused} className="text-accent" />
      </div>
    </Card>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <p className={`text-lg font-bold ${className ?? ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
