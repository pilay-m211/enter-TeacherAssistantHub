import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanAnswerSheetButton } from "@/components/teacher/ScanAnswerSheetButton";
import type { StudentRow } from "@/hooks/useStudents";
import type { AssignmentRow } from "@/hooks/useAssignments";
import type { GradeRow as GradeLedgerRow } from "@/hooks/useGrades";

interface GradeRowProps {
  student: StudentRow;
  assignment: AssignmentRow;
  existingGrade?: GradeLedgerRow;
  onSave: (params: { scores: number[]; feedback: string }) => Promise<void>;
}

export function GradeRow({ student, assignment, existingGrade, onSave }: GradeRowProps) {
  const isRubric = assignment.assessment_type === "rubric";
  const questionCount = assignment.question_count ?? 1;
  const maxPerQuestion = assignment.max_score_per_q ?? 100;
  const labels = assignment.question_labels ?? undefined;

  const [scores, setScores] = useState<number[]>(
    existingGrade?.scores ?? Array(questionCount).fill(0)
  );
  const [feedback, setFeedback] = useState(existingGrade?.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setScores(existingGrade?.scores ?? Array(questionCount).fill(0));
    setFeedback(existingGrade?.feedback ?? "");
    setDirty(false);
  }, [existingGrade, questionCount]);

  const total = scores.reduce((sum, s) => sum + (s || 0), 0);
  const maxTotal = questionCount * maxPerQuestion;

  const handleScoreChange = (index: number, value: number) => {
    setScores((prev) => prev.map((s, i) => (i === index ? value : s)));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ scores, feedback });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="glass" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{student.name}</h4>
            {existingGrade && !dirty && <Badge variant="verified">saved</Badge>}
            {dirty && <Badge variant="ocr">unsaved</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total} / {maxTotal} pts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScanAnswerSheetButton
            studentName={student.name}
            questionCount={questionCount}
            maxScorePerQuestion={maxPerQuestion}
            labels={labels}
            onApply={(scannedScores) => {
              setScores(scannedScores);
              setDirty(true);
            }}
          />
          <Button variant="hero" size="sm" onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${isRubric ? "sm:grid-cols-2" : "grid-cols-1 max-w-xs"}`}>
        {scores.map((score, index) => (
          <div key={index} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {isRubric ? labels?.[index] ?? `Criterion ${index + 1}` : "Score"}
            </span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={maxPerQuestion}
                value={score}
                onChange={(e) => handleScoreChange(index, Number(e.target.value))}
                className="h-8 w-20 text-right"
              />
              <span className="text-xs text-muted-foreground">/ {maxPerQuestion}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Textarea
          placeholder="Written feedback for this student…"
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            setDirty(true);
          }}
          className="min-h-[60px] text-sm"
        />
      </div>
    </Card>
  );
}
