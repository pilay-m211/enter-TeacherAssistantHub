import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, BookOpenCheck, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClass } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useAssignments } from "@/hooks/useAssignments";
import { StudentRosterTable } from "@/components/teacher/StudentRosterTable";
import { AddStudentDialog } from "@/components/teacher/AddStudentDialog";
import { ScanRosterButton } from "@/components/teacher/ScanRosterButton";
import { AssignmentList } from "@/components/teacher/AssignmentList";
import { CreateAssignmentDialog } from "@/components/teacher/CreateAssignmentDialog";
import { SearchInput } from "@/components/search/SearchInput";
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
  const [showArchived, setShowArchived] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");

  const visibleStudents = useMemo(() => {
    const statusFiltered = showArchived ? students : students.filter((s) => s.status === "active");
    const query = rosterSearch.trim().toLowerCase();
    if (!query) return statusFiltered;
    return statusFiltered.filter(
      (s) => s.name.toLowerCase().includes(query) || s.student_number?.toLowerCase().includes(query)
    );
  }, [students, showArchived, rosterSearch]);

  const visibleAssignments = useMemo(() => {
    const query = assignmentSearch.trim().toLowerCase();
    if (!query) return assignments;
    return assignments.filter((a) => a.name.toLowerCase().includes(query));
  }, [assignments, assignmentSearch]);

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
        <div className="flex flex-wrap gap-2">
          <Link to={`/app/classes/${classId}/attendance`}>
            <Button variant="glass" size="sm" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Take Attendance
            </Button>
          </Link>
          <Link to={`/app/classes/${classId}/gradebook`}>
            <Button variant="hero" size="sm" className="gap-2">
              <BookOpenCheck className="h-4 w-4" />
              Grade Book
            </Button>
          </Link>
        </div>
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
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={showArchived} onCheckedChange={(checked) => setShowArchived(Boolean(checked))} />
            Show archived / inactive students
          </label>
          <SearchInput
            value={rosterSearch}
            onChange={setRosterSearch}
            placeholder="Search students…"
            className="mt-3"
          />
          <div className="mt-4">
            {studentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              classId && (
                <StudentRosterTable classId={classId} students={visibleStudents} onRemove={removeStudent} />
              )
            )}
          </div>
        </section>

        {/* Assignments */}
        <section className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Assignments</h2>
            <CreateAssignmentDialog onCreate={createAssignment} />
          </div>
          <SearchInput
            value={assignmentSearch}
            onChange={setAssignmentSearch}
            placeholder="Search assignments…"
            className="mt-3"
          />
          <div className="mt-4">
            {assignmentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              classId && (
                <AssignmentList
                  classId={classId}
                  assignments={visibleAssignments}
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
