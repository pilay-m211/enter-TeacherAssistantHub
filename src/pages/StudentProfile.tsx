import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClass } from "@/hooks/useClasses";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useStudentGradeHistory } from "@/hooks/useStudentGradeHistory";
import { useAttendance } from "@/hooks/useAttendance";
import { useStudentNotes } from "@/hooks/useStudentNotes";
import { StudentInfoCard } from "@/components/student/StudentInfoCard";
import { ProgressSummaryCard } from "@/components/student/ProgressSummaryCard";
import { RecentActivityList } from "@/components/student/RecentActivityList";
import { GradeHistoryTab } from "@/components/student/GradeHistoryTab";
import { AttendanceTab } from "@/components/student/AttendanceTab";
import { NotesTab } from "@/components/student/NotesTab";
import { useToast } from "@/hooks/use-toast";

const StudentProfile = () => {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const { classItem } = useClass(classId);
  const {
    student,
    profile,
    loading: profileLoading,
    updateProfile,
    updateStudentInfo,
    archiveStudent,
    restoreStudent,
  } = useStudentProfile(studentId);
  const { quarters, finalGrade, remarks, loading: gradesLoading } = useStudentGradeHistory(studentId, classId);
  const { records, summaryByQuarter, overallSummary, upsertAttendance, deleteAttendance } = useAttendance(
    studentId,
    classId
  );
  const { notes, addNote, updateNote, deleteNote } = useStudentNotes(studentId, classId);
  const { toast } = useToast();

  const loading = profileLoading || gradesLoading;

  if (loading || !student) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentQuarterGrades = quarters.flatMap((q) => q.assignments);

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      toast({ title: successMessage });
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/app/classes/${classId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {classItem?.name ?? "class"}
        </Link>
        <Link to={`/app/classes/${classId}/gradebook`}>
          <Button variant="glass" size="sm" className="gap-2">
            <BookOpenCheck className="h-4 w-4" />
            Open Grade Book
          </Button>
        </Link>
      </div>

      <div className="mt-4">
        <StudentInfoCard
          student={student}
          profile={profile}
          onSaveProfile={updateProfile}
          onSaveStudentInfo={updateStudentInfo}
          onArchive={() => handleAction(() => archiveStudent(), "Student archived")}
          onRestore={() => handleAction(() => restoreStudent(), "Student restored")}
        />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <ProgressSummaryCard
            quarters={quarters}
            finalGrade={finalGrade}
            remarks={remarks}
            attendanceSummary={overallSummary}
          />
          {classId && (
            <RecentActivityList classId={classId} recentGrades={currentQuarterGrades} recentNotes={notes} />
          )}
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          {classId && <GradeHistoryTab classId={classId} quarters={quarters} />}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab
            records={records}
            summaryByQuarter={summaryByQuarter}
            onUpsert={upsertAttendance}
            onDelete={(id) => handleAction(() => deleteAttendance(id), "Attendance record removed")}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab notes={notes} onAdd={addNote} onUpdate={updateNote} onDelete={(id) => handleAction(() => deleteNote(id), "Note removed")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentProfile;
