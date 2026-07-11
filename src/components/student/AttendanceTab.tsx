import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TERMS, TERM_LABELS, type Term } from "@/lib/gradingConfig";
import type { AttendanceRow, AttendanceStatus, AttendanceSummary } from "@/hooks/useAttendance";

interface AttendanceTabProps {
  records: AttendanceRow[];
  summaryByTerm: Record<Term, AttendanceSummary>;
  onUpsert: (params: { date: string; semester: Term; status: AttendanceStatus; note?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

const STATUS_BADGE: Record<AttendanceStatus, "verified" | "destructive" | "ocr" | "outline"> = {
  present: "verified",
  absent: "destructive",
  late: "ocr",
  excused: "outline",
};

export function AttendanceTab({ records, summaryByTerm, onUpsert, onDelete }: AttendanceTabProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [semester, setSemester] = useState<Term>(1);
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpsert({ date, semester, status, note: note.trim() || null });
      toast({ title: "Attendance recorded" });
      setOpen(false);
      setNote("");
    } catch (err) {
      toast({
        title: "Could not save attendance",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {TERMS.map((t) => {
          const summary = summaryByTerm[t];
          return (
            <Card key={t} variant="glass" className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{TERM_LABELS[t]}</p>
              <p className="mt-1 text-xl font-bold">{summary.ratePct !== null ? `${summary.ratePct.toFixed(0)}%` : "—"}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{summary.total} record{summary.total === 1 ? "" : "s"}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Attendance
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel-strong">
            <DialogHeader>
              <DialogTitle>Record attendance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="attendance-date">Date</Label>
                  <Input id="attendance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v) as Term)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          {TERM_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-note">Note (optional)</Label>
                <Textarea id="attendance-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {records.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No attendance records yet.</p>
        </Card>
      ) : (
        <Card variant="glass" className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="border-border/40">
                  <TableCell className="font-medium">
                    {new Date(record.attendance_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{TERM_LABELS[(record.semester as Term) ?? 1]}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[record.status as AttendanceStatus]}>
                      {STATUS_LABELS[record.status as AttendanceStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.reason_note ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
