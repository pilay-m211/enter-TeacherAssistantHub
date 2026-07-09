import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { OcrImageUploadTrigger } from "@/components/teacher/OcrImageUploadTrigger";
import { useOcrScan } from "@/hooks/useOcrScan";
import { useToast } from "@/hooks/use-toast";
import { matchStudentByName } from "@/lib/studentMatching";
import type { StudentRow } from "@/hooks/useStudents";

interface MatchedEntry {
  studentId: string | null;
  name: string;
  score: number;
  include: boolean;
}

interface ScanGradeSheetButtonProps {
  students: StudentRow[];
  maxTotal: number;
  onApply: (entries: { studentId: string; score: number }[]) => Promise<void>;
}

export function ScanGradeSheetButton({ students, maxTotal, onApply }: ScanGradeSheetButtonProps) {
  const { scan, isScanning } = useOcrScan("grade_sheet");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [entries, setEntries] = useState<MatchedEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    const outcome = await scan(file);
    const result = outcome?.result;
    if (!result || result.entries.length === 0) {
      toast({ title: "No entries detected", description: "Try a clearer photo.", variant: "destructive" });
      return;
    }
    const matched = result.entries.map((entry) => {
      const { student } = matchStudentByName(entry.name, students);
      return {
        studentId: student?.id ?? null,
        name: student?.name ?? entry.name,
        score: entry.score,
        include: Boolean(student),
      };
    });
    setEntries(matched);
    setReviewOpen(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const toApply = entries
        .filter((e) => e.include && e.studentId)
        .map((e) => ({ studentId: e.studentId as string, score: e.score }));
      await onApply(toApply);
      setReviewOpen(false);
    } catch (err) {
      toast({
        title: "Could not save grades",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const includedCount = entries.filter((e) => e.include && e.studentId).length;

  return (
    <>
      <OcrImageUploadTrigger label="Scan Grade Sheet" isScanning={isScanning} onFileSelected={handleFile} />

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review scanned grades</DialogTitle>
            <DialogDescription>
              Unmatched names are unchecked automatically. Verify scores before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  entry.studentId ? "border-primary/20 bg-primary/5" : "border-warning/30 bg-warning/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={entry.include}
                    disabled={!entry.studentId}
                    onCheckedChange={(checked) =>
                      setEntries((prev) =>
                        prev.map((e, i) => (i === index ? { ...e, include: Boolean(checked) } : e))
                      )
                    }
                  />
                  <div>
                    <p className="text-sm font-medium">{entry.name}</p>
                    {!entry.studentId && <Badge variant="ocr">no roster match</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxTotal}
                    value={entry.score}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((entry2, i) => (i === index ? { ...entry2, score: Number(e.target.value) } : entry2))
                      )
                    }
                    className="h-8 w-20 text-right"
                  />
                  <span className="text-xs text-muted-foreground">/ {maxTotal}</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="hero" onClick={handleConfirm} disabled={saving || includedCount === 0}>
              Save {includedCount} grade{includedCount === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
