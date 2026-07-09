import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClass } from "@/hooks/useClasses";
import { useClassAttendance } from "@/hooks/useClassAttendance";
import { AttendanceStatusToggle } from "@/components/attendance/AttendanceStatusToggle";
import { AttendanceReasonInput } from "@/components/attendance/AttendanceReasonInput";
import { ClassAttendanceSummaryCard } from "@/components/attendance/ClassAttendanceSummaryCard";
import { SearchInput } from "@/components/search/SearchInput";
import { useToast } from "@/hooks/use-toast";

const ClassAttendance = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classItem } = useClass(classId);
  const {
    date,
    setDate,
    quarter,
    setQuarter,
    students,
    draft,
    setStatus,
    setNote,
    markAllPresent,
    liveSummary,
    loading,
    saving,
    save,
    todayIso,
  } = useClassAttendance(classId);
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((s) => s.name.toLowerCase().includes(query));
  }, [students, search]);

  const handleSave = async () => {
    try {
      await save();
      toast({ title: `Attendance saved for ${students.length} student${students.length === 1 ? "" : "s"}` });
    } catch (err) {
      toast({
        title: "Could not save attendance",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Attendance — {classItem?.name ?? "Class"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone defaults to Present. Tap a student to mark Absent, Late, or Excused.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(2,minmax(0,220px))_1fr]">
        <div className="space-y-2">
          <Label htmlFor="attendance-date">Date</Label>
          <Input
            id="attendance-date"
            type="date"
            value={date}
            max={todayIso}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Quarter</Label>
          <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((q) => (
                <SelectItem key={q} value={String(q)}>
                  Quarter {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <ClassAttendanceSummaryCard summary={liveSummary} title="Live Summary" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="glass" size="sm" className="gap-2" onClick={markAllPresent}>
          <CheckCheck className="h-4 w-4" />
          Mark All Present
        </Button>
        <Button variant="hero" size="sm" className="gap-2" onClick={handleSave} disabled={saving || students.length === 0}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Attendance
        </Button>
      </div>

      {students.length > 0 && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search students…"
          className="mt-4 max-w-sm"
        />
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">Add students to this class before taking attendance.</p>
          </Card>
        ) : visibleStudents.length === 0 ? (
          <Card variant="glass" className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No students match "{search.trim()}".</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {visibleStudents.map((student) => {
              const entry = draft[student.id] ?? { status: "present" as const, note: "" };
              const needsNote = entry.status !== "present";
              return (
                <Card key={student.id} variant="glass" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 sm:w-48 sm:shrink-0">
                    <p className="truncate font-medium">{student.name}</p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <AttendanceStatusToggle
                      value={entry.status}
                      onChange={(status) => setStatus(student.id, status)}
                    />
                    {needsNote && (
                      <div className="sm:w-56">
                        <AttendanceReasonInput
                          value={entry.note}
                          onChange={(note) => setNote(student.id, note)}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button variant="hero" size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Attendance
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClassAttendance;
