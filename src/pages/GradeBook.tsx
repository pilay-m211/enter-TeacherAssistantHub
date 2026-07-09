import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, FileSpreadsheet, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGradeBook } from "@/hooks/useGradeBook";
import { COMPONENT_LABELS, SUBJECT_GROUP_LABELS, type AssignmentComponent, type SubjectGroup } from "@/lib/depedGrading";
import { exportEClassRecord, exportSummaryOfQuarterlyGrades, exportRawBackupCsv } from "@/lib/gradeBookExports";

const QUARTERS = [1, 2, 3, 4];

function formatPct(value: number | null) {
  return value !== null ? `${value.toFixed(1)}%` : "—";
}

const GradeBook = () => {
  const { classId } = useParams<{ classId: string }>();
  const gradeBook = useGradeBook(classId);
  const { classItem, students, assignmentsByQuarter, quarterGrades, yearSummary, assignments, grades, loading } =
    gradeBook;
  const [activeQuarter, setActiveQuarter] = useState("1");

  const assignmentMeta = useMemo(() => {
    const map = new Map<string, { name: string; component: AssignmentComponent; quarter: number; maxTotal: number }>();
    for (const assignment of assignments) {
      map.set(assignment.id, {
        name: assignment.name,
        component: (assignment.component as AssignmentComponent) ?? "written_work",
        quarter: assignment.quarter ?? 1,
        maxTotal: (assignment.max_score_per_q ?? 0) * (assignment.question_count ?? 1),
      });
    }
    return map;
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const className = classItem?.name ?? "Class";
  const subjectGroup = (classItem?.subject_group as SubjectGroup) ?? "core";

  return (
    <div>
      <Link
        to={`/app/classes/${classId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to class
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Grade Book — {className}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{SUBJECT_GROUP_LABELS[subjectGroup]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="glass"
            size="sm"
            className="gap-2"
            onClick={() => exportEClassRecord(gradeBook, className)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            E-Class Record (.xlsx)
          </Button>
          <Button
            variant="glass"
            size="sm"
            className="gap-2"
            onClick={() => exportSummaryOfQuarterlyGrades(gradeBook, className)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Summary of Grades (.xlsx)
          </Button>
          <Button
            variant="glass"
            size="sm"
            className="gap-2"
            onClick={() => exportRawBackupCsv(gradeBook, grades, assignmentMeta, className)}
          >
            <FileDown className="h-4 w-4" />
            Backup (.csv)
          </Button>
          <Link to={`/app/classes/${classId}/report-card`}>
            <Button variant="hero" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Form 138 Report Card
            </Button>
          </Link>
        </div>
      </div>

      {students.length === 0 ? (
        <Card variant="glass" className="mt-8 flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">Add students to this class before viewing the grade book.</p>
        </Card>
      ) : (
        <>
          <Tabs value={activeQuarter} onValueChange={setActiveQuarter} className="mt-8">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
              {QUARTERS.map((q) => (
                <TabsTrigger key={q} value={String(q)}>
                  Quarter {q}
                </TabsTrigger>
              ))}
            </TabsList>

            {QUARTERS.map((quarter) => {
              const rows = quarterGrades[quarter] ?? [];
              const quarterAssignments = assignmentsByQuarter[quarter] ?? [];

              return (
                <TabsContent key={quarter} value={String(quarter)} className="mt-4">
                  {quarterAssignments.length === 0 ? (
                    <Card variant="glass" className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        No assignments tagged to Quarter {quarter} yet. Tag assignments via their grading settings.
                      </p>
                    </Card>
                  ) : (
                    <Card variant="glass" className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 border-b border-border/50 px-4 py-3">
                        {quarterAssignments.map((a) => (
                          <Badge key={a.id} variant="outline" className="text-xs">
                            {a.name} · {COMPONENT_LABELS[(a.component as AssignmentComponent) ?? "written_work"]}
                          </Badge>
                        ))}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/60 hover:bg-transparent">
                            <TableHead>Learner's Name</TableHead>
                            <TableHead className="text-right">WW %</TableHead>
                            <TableHead className="text-right">PT %</TableHead>
                            <TableHead className="text-right">QA %</TableHead>
                            <TableHead className="text-right">Initial Grade</TableHead>
                            <TableHead className="text-right">Quarterly Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow key={row.studentId} className="border-border/40">
                              <TableCell className="font-medium">{row.studentName}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatPct(row.writtenWorkPct)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatPct(row.performanceTaskPct)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatPct(row.quarterlyAssessmentPct)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {row.initialGrade !== null ? row.initialGrade.toFixed(2) : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.quarterlyGrade !== null ? (
                                  <Badge variant={row.quarterlyGrade >= 75 ? "verified" : "destructive"}>
                                    {row.quarterlyGrade}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-10">
            <h2 className="text-lg font-semibold">Summary of Quarterly Grades</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For the class adviser — consolidated quarterly and final grades.
            </p>
            <Card variant="glass" className="mt-4 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Learner's Name</TableHead>
                    <TableHead className="text-right">Q1</TableHead>
                    <TableHead className="text-right">Q2</TableHead>
                    <TableHead className="text-right">Q3</TableHead>
                    <TableHead className="text-right">Q4</TableHead>
                    <TableHead className="text-right">Final Grade</TableHead>
                    <TableHead className="text-right">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearSummary.map((student) => (
                    <TableRow key={student.studentId} className="border-border/40">
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      {student.quarterlyGrades.map((grade, index) => (
                        <TableCell key={index} className="text-right text-muted-foreground">
                          {grade ?? "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{student.finalGrade ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={student.remarks === "PASSED" ? "verified" : student.remarks === "FAILED" ? "destructive" : "outline"}>
                          {student.remarks}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default GradeBook;
