import { useState } from "react";
import { ScanLine, Loader2, ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOcrTableImport } from "@/hooks/useOcrTableImport";
import { OcrColumnMappingCard } from "@/components/teacher/OcrColumnMappingCard";
import { OcrTableReviewGrid } from "@/components/teacher/OcrTableReviewGrid";
import type { StudentRow } from "@/hooks/useStudents";
import type { AssignmentRow, CreateAssignmentInput } from "@/hooks/useAssignments";
import { TERMS, TERM_LABELS, type Term } from "@/lib/gradingConfig";

interface ImportClassRecordDialogProps {
  classId: string;
  students: StudentRow[];
  assignments: AssignmentRow[];
  addStudents: (names: string[]) => Promise<void>;
  createAssignment: (input: CreateAssignmentInput) => Promise<AssignmentRow | undefined>;
  onCommitted: () => void;
}

export function ImportClassRecordDialog({
  classId,
  students,
  assignments,
  addStudents,
  createAssignment,
  onCommitted,
}: ImportClassRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState<Term>(1);
  const [committing, setCommitting] = useState(false);
  const { toast } = useToast();

  const {
    isScanning,
    columns,
    columnMappings,
    setColumnMappings,
    rows,
    setRows,
    avgConfidence,
    runScan,
    commit,
    reset,
    hasResult,
  } = useOcrTableImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ok = await runScan(file, semester, students);
    if (!ok) {
      toast({
        title: "Could not read the table",
        description: "Try a clearer, flatter photo of the score sheet.",
        variant: "destructive",
      });
    }
  };

  const updateRow = (index: number, updates: Partial<(typeof rows)[number]>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  // Validation: block commit only on hard errors (score exceeding a mapped assignment's max).
  const validationErrors: string[] = [];
  for (const row of rows) {
    if (!row.include) continue;
    columnMappings.forEach((mapping, colIndex) => {
      if (!mapping.include) return;
      const score = row.scores[colIndex];
      if (score === null || score === undefined) return;
      const max = mapping.assignmentId
        ? (assignments.find((a) => a.id === mapping.assignmentId)?.max_score_per_q ?? Infinity) *
          (assignments.find((a) => a.id === mapping.assignmentId)?.question_count ?? 1)
        : mapping.newAssignmentMaxScore;
      if (score > max) {
        validationErrors.push(`${row.ocrName} — "${mapping.header}": score ${score} exceeds max ${max}`);
      }
    });
  }

  const includedRows = rows.filter((r) => r.include);
  const unresolvedRows = includedRows.filter((r) => !r.studentId && !r.isNewStudent);
  const lowConfidenceWarning = avgConfidence !== null && avgConfidence < 0.5;

  const canCommit = hasResult && includedRows.length > 0 && unresolvedRows.length === 0 && validationErrors.length === 0;

  const handleCommit = async () => {
    setCommitting(true);
    try {
      const rowsCommitted = await commit({
        classId,
        semester,
        students,
        assignments,
        addStudents,
        createAssignment,
      });
      toast({ title: `Saved ${rowsCommitted} grade${rowsCommitted === 1 ? "" : "s"} from scan` });
      onCommitted();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Could not save imported grades",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCommitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="glass" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4" />
        Import from Photo/Scan
      </Button>

      <DialogContent className="glass-panel-strong max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Class Record from Photo</DialogTitle>
          <DialogDescription>
            Scan a printed class record or score sheet. Review and correct every field before saving — nothing is
            saved automatically.
          </DialogDescription>
        </DialogHeader>

        {!hasResult ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Term this sheet covers</Label>
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

            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 py-12 text-center transition-colors hover:border-primary/50">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isScanning} />
              {isScanning ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <ScanLine className="h-8 w-8 text-primary" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isScanning ? "Reading table…" : "Click to upload a photo of the score sheet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Works best with a flat, well-lit photo showing clear rows and columns.
                </p>
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-5">
            <Button variant="ghost" size="sm" className="gap-1.5 self-start" onClick={reset}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Scan a different photo
            </Button>

            {lowConfidenceWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>This scan may be unreliable overall — please review every field carefully.</span>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold">Column mapping</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Match each detected column to an existing assignment, or create a new one.
              </p>
              <div className="mt-3 space-y-2">
                {columnMappings.map((mapping, index) => (
                  <OcrColumnMappingCard
                    key={index}
                    mapping={mapping}
                    existingAssignments={assignments}
                    onChange={(updates) =>
                      setColumnMappings((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)))
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Rows ({includedRows.length} of {rows.length} included)</h3>
                {unresolvedRows.length > 0 && (
                  <Badge variant="ocr">{unresolvedRows.length} unresolved name{unresolvedRows.length === 1 ? "" : "s"}</Badge>
                )}
              </div>
              <div className="mt-3">
                <OcrTableReviewGrid
                  columns={columns}
                  columnMappings={columnMappings}
                  rows={rows}
                  students={students}
                  onUpdateRow={updateRow}
                />
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {validationErrors.map((msg, i) => (
                  <p key={i}>{msg}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {hasResult && (
          <DialogFooter>
            <Button variant="hero" onClick={handleCommit} disabled={!canCommit || committing} className="gap-2">
              {committing && <Loader2 className="h-4 w-4 animate-spin" />}
              Save {includedRows.length} student{includedRows.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
