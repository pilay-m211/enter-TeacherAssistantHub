import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/attendanceSummary";

interface AttendanceStatusToggleProps {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}

const OPTIONS: Array<{ status: AttendanceStatus; label: string; activeClass: string }> = [
  { status: "present", label: "Present", activeClass: "border-primary/40 bg-primary/15 text-primary" },
  { status: "absent", label: "Absent", activeClass: "border-destructive/40 bg-destructive/15 text-destructive" },
  { status: "late", label: "Late", activeClass: "border-warning/40 bg-warning/15 text-warning" },
  { status: "excused", label: "Excused", activeClass: "border-accent/40 bg-accent/15 text-accent" },
];

export function AttendanceStatusToggle({ value, onChange }: AttendanceStatusToggleProps) {
  return (
    <div className="inline-flex flex-wrap gap-1.5" role="radiogroup">
      {OPTIONS.map((option) => {
        const active = value === option.status;
        return (
          <button
            key={option.status}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.status)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active ? option.activeClass : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
