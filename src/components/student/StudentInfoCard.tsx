import { UserRound, Phone, MapPin, GraduationCap, ArchiveRestore, Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditStudentProfileDialog } from "@/components/student/EditStudentProfileDialog";
import type { StudentRow, StudentProfileRow, StudentProfileUpdateInput } from "@/hooks/useStudentProfile";

interface StudentInfoCardProps {
  student: StudentRow;
  profile: StudentProfileRow | null;
  onSaveProfile: (updates: StudentProfileUpdateInput) => Promise<void>;
  onSaveStudentInfo: (updates: { name?: string; student_number?: string | null }) => Promise<void>;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
}

export function StudentInfoCard({
  student,
  profile,
  onSaveProfile,
  onSaveStudentInfo,
  onArchive,
  onRestore,
}: StudentInfoCardProps) {
  const isArchived = student.status !== "active";

  return (
    <Card variant="glass" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-lg font-bold text-primary-foreground">
            {student.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{student.name}</h1>
              {isArchived && <Badge variant="ocr">{student.status}</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {student.student_number ? `#${student.student_number}` : "No student number"}
              {profile?.grade_level ? ` · ${profile.grade_level}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EditStudentProfileDialog
            studentName={student.name}
            studentNumber={student.student_number}
            profile={profile}
            onSaveProfile={onSaveProfile}
            onSaveStudentInfo={onSaveStudentInfo}
          />
          {isArchived ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={onRestore}>
              <ArchiveRestore className="h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={onArchive}>
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {(profile?.parent_guardian_name || profile?.parent_contact || profile?.address) && (
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border/50 pt-4 sm:grid-cols-3">
          {profile?.parent_guardian_name && (
            <div className="flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{profile.parent_guardian_name}</span>
            </div>
          )}
          {profile?.parent_contact && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{profile.parent_contact}</span>
            </div>
          )}
          {profile?.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{profile.address}</span>
            </div>
          )}
        </div>
      )}

      {!profile?.grade_level && !profile?.parent_guardian_name && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
          Add grade level and parent/guardian info via "Edit Info".
        </div>
      )}
    </Card>
  );
}
