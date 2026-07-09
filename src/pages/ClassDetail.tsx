import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClass } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useAssignments } from "@/hooks/useAssignments";
import { StudentRosterTable } from "@/components/teacher/StudentRosterTable";
import { AddStudentDialog } from "@/components/teacher/AddStudentDialog";
import { ScanRosterButton } from "@/components/teacher/ScanRosterButton";
import { AssignmentList } from "@/components/teacher/AssignmentList";
import { CreateAssignmentDialog } from "@/components/teacher/CreateAssignmentDialog";
import { useToast } from "@/hooks/use-toast";

const ClassDetail = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classItem, loading: classLoading } = useClass(classId);
  const { students, loading: studentsLoading, addStudent, addStudents, removeStudent } = useStudents(classId);
  const {
    assignments,
    loading: assignmentsLoading,
    createAssignment,
    deleteAssignment,
    updateAssignment,
  } = useAssignments(classId);
  const { toast } = useToast();

  if (classLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/app/classes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to classes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{classItem?.name}</h1>
        <Link to={`/app/classes/${classId}/gradebook`}>
          <Button variant="hero" size="sm" className="gap-2">
            <BookOpenCheck className="h-4 w-4" />
            Grade Book
          </Button>
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-5">
        {/* Roster */}
        <section className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Roster</h2>
            <div className="flex items-center gap-2">
              <ScanRosterButton
                onConfirm={async (names) => {
                  await addStudents(names);
                  toast({ title: `Added ${names.length} student${names.length === 1 ? "" : "s"}` });
                }}
              />
              <AddStudentDialog onAdd={addStudent} />
            </div>
          </div>
          <div className="mt-4">
            {studentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <StudentRosterTable students={students} onRemove={removeStudent} />
            )}
          </div>
        </section>

        {/* Assignments */}
        <section className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Assignments</h2>
            <CreateAssignmentDialog onCreate={createAssignment} />
          </div>
          <div className="mt-4">
            {assignmentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              classId && (
                <AssignmentList
                  classId={classId}
                  assignments={assignments}
                  onDelete={deleteAssignment}
                  onUpdate={updateAssignment}
                />
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClassDetail;
