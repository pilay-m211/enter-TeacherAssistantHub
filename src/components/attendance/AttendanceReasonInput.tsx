import { Input } from "@/components/ui/input";

interface AttendanceReasonInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function AttendanceReasonInput({ value, onChange }: AttendanceReasonInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Reason / note (optional)"
      className="h-8 text-xs"
    />
  );
}
