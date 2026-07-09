import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAssignment } from "@/hooks/useAssignments";
import { useStudents } from "@/hooks/useStudents";
import { useGrades } from "@/hooks/useGrades";
import { GradeRow } from "@/components/teacher/GradeRow";
import { ScanGradeSheetButton } from "@/components/teacher/ScanGradeSheetButton";
import { useToast } from "@/hooks/use-toast";

const AssignmentGrading = () => {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>();
  const { assignment, loading: assignmentLoading } = useAssignment(assignmentId);
  const { students, loading: studentsLoading } = useStudents(classId);
  const { grades, upsertGrade } = useGrades(assignmentId);
  const { toast } = useToast();

  if (assignmentLoading || studentsLoading || !assignment) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const gradeByStudentId = new Map(grades.map((g) => [g.student_id, g]));
  const maxPerQuestion = assignment.max_score_per_q ?? 100;
  const questionCount = assignment.question_count ?? 1;
  const maxTotal = maxPerQuestion * questionCount;

  const saveGrade = async (studentId: string, studentName: string, scores: number[], feedback: string) => {
    try {
      await upsertGrade({
        studentId,
        studentName,
        scores,
        maxTotal,
        feedback,
      });
      toast({ title: `Saved grade for ${studentName}` });
    } catch (err) {
      toast({
        title: "Could not save grade",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkApply = async (entries: { studentId: string; score: number }[]) => {
    for (const entry of entries) {
      const student = students.find((s) => s.id === entry.studentId);
      if (!student) continue;
      const scores = assignment.assessment_type === "rubric" ? Array(questionCount).fill(0) : [entry.score];
      // For simple assignments, the bulk score is the single total score.
      await upsertGrade({
        studentId: entry.studentId,
        studentName: student.name,
        scores: assignment.assessment_type === "rubric" ? scores : [entry.score],
        maxTotal,
        feedback: gradeByStudentId.get(entry.studentId)?.feedback ?? undefined,
      });
    }
    toast({ title: `Applied ${entries.length} scanned grade${entries.length === 1 ? "" : "s"}` });
  };

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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{assignment.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignment.assessment_type === "rubric"
              ? `Rubric grading · ${questionCount} criteria · ${maxPerQuestion} pts each`
              : `Simple grading · ${maxPerQuestion} points`}
          </p>
        </div>
        {assignment.assessment_type === "simple" && (
          <ScanGradeSheetButton students={students} maxTotal={maxTotal} onApply={handleBulkApply} />
        )}
      </div>

      <div className="mt-8 space-y-4">
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add students to this class before grading.</p>
        ) : (
          students.map((student) => (
            <GradeRow
              key={student.id}
              student={student}
              assignment={assignment}
              existingGrade={gradeByStudentId.get(student.id)}
              onSave={({ scores, feedback }) => saveGrade(student.id, student.name, scores, feedback)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AssignmentGrading;
