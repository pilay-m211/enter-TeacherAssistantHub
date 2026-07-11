import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, FileSpreadsheet, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGradeBook } from "@/hooks/useGradeBook";
import { useStudents } from "@/hooks/useStudents";
import { useAssignments } from "@/hooks/useAssignments";
import { ImportClassRecordDialog } from "@/components/teacher/ImportClassRecordDialog";
import { SearchInput } from "@/components/search/SearchInput";
import { COMPONENT_LABELS, SUBJECT_GROUP_LABELS, TERMS, TERM_LABELS, type AssignmentComponent, type SubjectGroup, type Term } from "@/lib/gradingConfig";
import { exportEClassRecord, exportSummaryOfTermGrades, exportRawBackupCsv } from "@/lib/gradeBookExports";

function formatPct(value: number | null) {
  return value !== null ? `${value.toFixed(1)}%` : "—";
}

const GradeBook = () => {
  const { classId } = useParams<{ classId: string }>();
  const gradeBook = useGradeBook(classId);
  const { classItem, students, assignmentsByTerm, termGrades, yearSummary, assignments, grades, loading, refresh } =
    gradeBook;
  const { addStudents } = useStudents(classId);
  const { createAssignment } = useAssignments(classId);
  const [activeTerm, setActiveTerm] = useState("1");
  const [studentSearch, setStudentSearch] = useState("");

  const matchesSearch = (name: string) => {
    const query = studentSearch.trim().toLowerCase();
    return !query || name.toLowerCase().includes(query);
  };

  const assignmentMeta = useMemo(() => {
    const map = new Map<string, { name: string; component: AssignmentComponent; semester: Term; maxTotal: number }>();
    for (const assignment of assignments) {
      map.set(assignment.id, {
        name: assignment.title,
        component: (assignment.component as AssignmentComponent) ?? "written_oral",
        semester: (assignment.semester as Term) ?? 1,
        maxTotal: (assignment.max_score_per_q ?? assignment.max_score ?? 0) * (assignment.question_count ?? 1),
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
          {classId && (
            <ImportClassRecordDialog
              classId={classId}
              students={students}
              assignments={assignments}
              addStudents={addStudents}
              createAssignment={createAssignment}
              onCommitted={refresh}
            />
          )}
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
            onClick={() => exportSummaryOfTermGrades(gradeBook, className)}
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
          <SearchInput
            value={studentSearch}
            onChange={setStudentSearch}
            placeholder="Search students…"
            className="mt-6 max-w-sm"
          />

          <Tabs value={activeTerm} onValueChange={setActiveTerm} className="mt-6">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              {TERMS.map((t) => (
                <TabsTrigger key={t} value={String(t)}>
                  {TERM_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>

            {TERMS.map((term) => {
              const rows = (termGrades[term] ?? []).filter((row) => matchesSearch(row.studentName));
              const termAssignments = assignmentsByTerm[term] ?? [];

              return (
                <TabsContent key={term} value={String(term)} className="mt-4">
                  {termAssignments.length === 0 ? (
                    <Card variant="glass" className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        No assignments tagged to {TERM_LABELS[term]} yet. Tag assignments via their grading settings.
                      </p>
                    </Card>
                  ) : rows.length === 0 ? (
                    <Card variant="glass" className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">No students match "{studentSearch.trim()}".</p>
                    </Card>
                  ) : (
                    <Card variant="glass" className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 border-b border-border/50 px-4 py-3">
                        {termAssignments.map((a) => (
                          <Badge key={a.id} variant="outline" className="text-xs">
                            {a.title} · {COMPONENT_LABELS[(a.component as AssignmentComponent) ?? "written_oral"]}
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
                            <TableHead className="text-right">Term Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow key={row.studentId} className="border-border/40">
                              <TableCell className="font-medium">
                                <Link
                                  to={`/app/classes/${classId}/students/${row.studentId}`}
                                  className="transition-colors hover:text-primary hover:underline"
                                >
                                  {row.studentName}
                                </Link>
                              </TableCell>
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
                                {row.termGrade !== null ? (
                                  <Badge variant={row.termGrade >= 75 ? "verified" : "destructive"}>
                                    {row.termGrade}
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
            <h2 className="text-lg font-semibold">Summary of Term Grades</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For the class adviser — consolidated term and final grades.
            </p>
            <Card variant="glass" className="mt-4 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Learner's Name</TableHead>
                    {TERMS.map((t) => (
                      <TableHead key={t} className="text-right">{TERM_LABELS[t]}</TableHead>
                    ))}
                    <TableHead className="text-right">Final Grade</TableHead>
                    <TableHead className="text-right">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearSummary.filter((student) => matchesSearch(student.studentName)).map((student) => (
                    <TableRow key={student.studentId} className="border-border/40">
                      <TableCell className="font-medium">
                        <Link
                          to={`/app/classes/${classId}/students/${student.studentId}`}
                          className="transition-colors hover:text-primary hover:underline"
                        >
                          {student.studentName}
                        </Link>
                      </TableCell>
                      {student.termGrades.map((grade, index) => (
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
