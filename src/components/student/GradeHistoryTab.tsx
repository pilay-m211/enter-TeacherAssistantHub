import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPONENT_LABELS, TERM_LABELS } from "@/lib/gradingConfig";
import type { TermGradeSummary } from "@/hooks/useStudentGradeHistory";

interface GradeHistoryTabProps {
  classId: string;
  terms: TermGradeSummary[];
}

function formatPct(value: number | null) {
  return value !== null ? `${value.toFixed(1)}%` : "—";
}

export function GradeHistoryTab({ classId, terms }: GradeHistoryTabProps) {
  return (
    <Tabs defaultValue="1">
      <TabsList className="grid w-full grid-cols-3 sm:w-auto">
        {terms.map((t) => (
          <TabsTrigger key={t.semester} value={String(t.semester)}>
            {TERM_LABELS[t.semester]}
          </TabsTrigger>
        ))}
      </TabsList>

      {terms.map((t) => (
        <TabsContent key={t.semester} value={String(t.semester)} className="mt-4 space-y-4">
          <Card variant="glass" className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
            <SummaryStat label="WW %" value={formatPct(t.writtenWorkPct)} />
            <SummaryStat label="PT %" value={formatPct(t.performanceTaskPct)} />
            <SummaryStat label="QA %" value={formatPct(t.quarterlyAssessmentPct)} />
            <SummaryStat label="Initial Grade" value={t.initialGrade !== null ? t.initialGrade.toFixed(2) : "—"} />
            <SummaryStat
              label="Term Grade"
              value={t.termGrade ?? "—"}
              highlight={t.termGrade !== null ? (t.termGrade >= 75 ? "verified" : "destructive") : undefined}
            />
          </Card>

          {t.assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No assignments tagged to {TERM_LABELS[t.semester]} yet.
            </p>
          ) : (
            <Card variant="glass" className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Assignment</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {t.assignments.map((a) => (
                    <TableRow key={a.assignmentId} className="border-border/40">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {a.name}
                          {a.source === "ocr" && <Badge variant="ocr">OCR</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{COMPONENT_LABELS[a.component]}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {a.rawScore} / {a.maxScore}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/app/classes/${classId}/assignments/${a.assignmentId}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "verified" | "destructive";
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {highlight ? (
        <Badge variant={highlight}>{value}</Badge>
      ) : (
        <span className="text-sm font-semibold">{value}</span>
      )}
    </div>
  );
}
