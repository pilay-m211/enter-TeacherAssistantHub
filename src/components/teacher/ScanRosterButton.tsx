import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface ScanRosterButtonProps {
  onConfirm: (names: string[]) => Promise<void>;
}

export function ScanRosterButton({ onConfirm }: ScanRosterButtonProps) {
  const { scan, isScanning } = useOcrScan("roster");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    const outcome = await scan(file);
    const result = outcome?.result;
    if (!result || result.students.length === 0) {
      toast({
        title: "No names detected",
        description: "Try a clearer or better-lit photo of the roster.",
        variant: "destructive",
      });
      return;
    }
    setCandidates(result.students);
    setSelected(new Set(result.students));
    setReviewOpen(true);
  };

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(Array.from(selected));
      setReviewOpen(false);
    } catch (err) {
      toast({
        title: "Could not add students",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <OcrImageUploadTrigger label="Scan Roster Photo" isScanning={isScanning} onFileSelected={handleFile} />

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="glass-panel-strong">
          <DialogHeader>
            <DialogTitle>Review scanned names</DialogTitle>
            <DialogDescription>
              Uncheck any name that was misread before adding to your roster.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {candidates.map((name) => (
              <label
                key={name}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-warning/25 bg-warning/5 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={selected.has(name)} onCheckedChange={() => toggle(name)} />
                  <span className="text-sm">{name}</span>
                </div>
                <Badge variant="ocr">unverified</Badge>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="hero" onClick={handleConfirm} disabled={saving || selected.size === 0}>
              Add {selected.size} student{selected.size === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
