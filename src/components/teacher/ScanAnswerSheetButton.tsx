import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { OcrImageUploadTrigger } from "@/components/teacher/OcrImageUploadTrigger";
import { useOcrScan } from "@/hooks/useOcrScan";
import { useToast } from "@/hooks/use-toast";

interface ScanAnswerSheetButtonProps {
  studentName: string;
  questionCount: number;
  maxScorePerQuestion: number;
  labels?: string[] | null;
  onApply: (scores: number[]) => void;
}

export function ScanAnswerSheetButton({
  studentName,
  questionCount,
  maxScorePerQuestion,
  labels,
  onApply,
}: ScanAnswerSheetButtonProps) {
  const { scan, isScanning } = useOcrScan("answer_sheet");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [confidence, setConfidence] = useState<number[]>([]);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    const result = await scan(file, {
      question_count: questionCount,
      max_score_per_q: maxScorePerQuestion,
    });
    if (!result) {
      toast({ title: "Scan failed", description: "Could not read the answer sheet.", variant: "destructive" });
      return;
    }
    setScores(result.scores.map((s) => s ?? 0));
    setConfidence(result.confidence ?? []);
    setDetectedName(result.student_name);
    setReviewOpen(true);
  };

  const handleConfirm = () => {
    onApply(scores);
    setReviewOpen(false);
  };

  return (
    <>
      <OcrImageUploadTrigger
        label="Scan"
        isScanning={isScanning}
        onFileSelected={handleFile}
        size="sm"
        variant="glass"
      />

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review scan — {studentName}</DialogTitle>
            <DialogDescription>
              {detectedName && detectedName.toLowerCase() !== studentName.toLowerCase() && (
                <span className="text-warning">
                  Detected name on sheet: "{detectedName}" — verify this is the right student.
                </span>
              )}
              {!detectedName && "Edit any misread scores before applying."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {scores.map((score, index) => {
              const conf = confidence[index] ?? 1;
              const lowConfidence = conf < 0.6;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    lowConfidence ? "border-warning/30 bg-warning/5" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <span className="text-sm text-muted-foreground">
                    {labels?.[index] ?? `Question ${index + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {lowConfidence && <Badge variant="ocr">low confidence</Badge>}
                    <Input
                      type="number"
                      min={0}
                      max={maxScorePerQuestion}
                      value={score}
                      onChange={(e) =>
                        setScores((prev) => prev.map((s, i) => (i === index ? Number(e.target.value) : s)))
                      }
                      className="h-8 w-20 text-right"
                    />
                    <span className="text-xs text-muted-foreground">/ {maxScorePerQuestion}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="hero" onClick={handleConfirm}>
              Apply to {studentName}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
