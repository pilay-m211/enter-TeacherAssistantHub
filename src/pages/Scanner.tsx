import { useState } from "react";
import { Users, FileText, ClipboardList, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useAssignments } from "@/hooks/useAssignments";
import { useGrades } from "@/hooks/useGrades";
import { ScanRosterButton } from "@/components/teacher/ScanRosterButton";
import { ScanGradeSheetButton } from "@/components/teacher/ScanGradeSheetButton";
import { ScanAnswerSheetButton } from "@/components/teacher/ScanAnswerSheetButton";
import { useToast } from "@/hooks/use-toast";

const Scanner = () => {
  const { classes, loading: classesLoading } = useClasses();
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [assignmentId, setAssignmentId] = useState<string | undefined>(undefined);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const { students, addStudents } = useStudents(classId);
  const { assignments } = useAssignments(classId);
  const { grades, upsertGrade } = useGrades(assignmentId);

  const assignment = assignments.find((a) => a.id === assignmentId);
  const student = students.find((s) => s.id === studentId);
  const maxPerQuestion = assignment?.max_score_per_q ?? 100;
  const questionCount = assignment?.question_count ?? 1;
  const maxTotal = maxPerQuestion * questionCount;
  const gradeByStudentId = new Map(grades.map((g) => [g.student_id, g]));

  const handleClassChange = (value: string) => {
    setClassId(value);
    setAssignmentId(undefined);
    setStudentId(undefined);
  };

  const handleApplyAnswerSheet = async (scores: number[]) => {
    if (!student || !assignmentId) return;
    try {
      await upsertGrade({
        studentId: student.id,
        studentName: student.name,
        scores,
        maxTotal,
        feedback: gradeByStudentId.get(student.id)?.feedback ?? undefined,
      });
      toast({ title: `Saved grade for ${student.name}` });
    } catch (err) {
      toast({
        title: "Could not save grade",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleApplyGradeSheet = async (entries: { studentId: string; score: number }[]) => {
    for (const entry of entries) {
      const matchedStudent = students.find((s) => s.id === entry.studentId);
      if (!matchedStudent) continue;
      await upsertGrade({
        studentId: entry.studentId,
        studentName: matchedStudent.name,
        scores: assignment?.assessment_type === "rubric" ? Array(questionCount).fill(0) : [entry.score],
        maxTotal,
        feedback: gradeByStudentId.get(entry.studentId)?.feedback ?? undefined,
      });
    }
    toast({ title: `Applied ${entries.length} scanned grade${entries.length === 1 ? "" : "s"}` });
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Scanner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your camera or a photo upload to digitize rosters, answer sheets, and grade sheets with AI.
        </p>
      </div>

      <Card variant="glass" className="mt-8 p-6">
        <Tabs defaultValue="roster">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roster" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="answer" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Answer Sheet
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Grade Sheet
            </TabsTrigger>
          </TabsList>

          {/* Class selector, shared across all modes */}
          <div className="mt-6 space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={handleClassChange} disabled={classesLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="roster" className="mt-6">
            {!classId ? (
              <EmptyState text="Select a class to scan a roster photo into it." />
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-5">
                <p className="text-sm text-muted-foreground">
                  Upload a photo of a printed or handwritten class list. Names will be extracted for your review
                  before being added.
                </p>
                <ScanRosterButton
                  onConfirm={async (names) => {
                    await addStudents(names);
                    toast({ title: `Added ${names.length} student${names.length === 1 ? "" : "s"}` });
                  }}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="answer" className="mt-6 space-y-4">
            {!classId ? (
              <EmptyState text="Select a class, then an assignment and student, to scan one answer sheet." />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Assignment</Label>
                    <Select value={assignmentId} onValueChange={setAssignmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={studentId} onValueChange={setStudentId} disabled={!assignmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {assignment && student ? (
                  <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-5">
                    <p className="text-sm text-muted-foreground">
                      Upload a photo of {student.name}'s graded paper for{" "}
                      <span className="font-medium text-foreground">{assignment.name}</span>. Scores are extracted
                      per question for your review before saving.
                    </p>
                    <ScanAnswerSheetButton
                      studentName={student.name}
                      questionCount={questionCount}
                      maxScorePerQuestion={maxPerQuestion}
                      labels={assignment.question_labels}
                      onApply={handleApplyAnswerSheet}
                    />
                  </div>
                ) : (
                  <EmptyState text="Choose an assignment and a student to continue." />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="grades" className="mt-6 space-y-4">
            {!classId ? (
              <EmptyState text="Select a class, then an assignment, to bulk-scan a grade sheet." />
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Assignment</Label>
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {assignment ? (
                  <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-5">
                    <p className="text-sm text-muted-foreground">
                      Upload a photo of a handwritten or printed grade sheet listing multiple students' scores for{" "}
                      <span className="font-medium text-foreground">{assignment.name}</span>. Names are matched to
                      your roster automatically.
                    </p>
                    <ScanGradeSheetButton students={students} maxTotal={maxTotal} onApply={handleApplyGradeSheet} />
                  </div>
                ) : (
                  <EmptyState text="Choose an assignment to continue." />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <ScanLine className="h-6 w-6 text-primary" />
      </span>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export default Scanner;
