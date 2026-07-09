import { Link } from "react-router-dom";
import { ClipboardCheck, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AssignmentGradeDetail } from "@/hooks/useStudentGradeHistory";
import type { StudentNoteRow } from "@/hooks/useStudentNotes";

interface RecentActivityListProps {
  classId: string;
  recentGrades: AssignmentGradeDetail[];
  recentNotes: StudentNoteRow[];
}

interface ActivityItem {
  key: string;
  timestamp: string;
  content: React.ReactNode;
  icon: React.ReactNode;
}

export function RecentActivityList({ classId, recentGrades, recentNotes }: RecentActivityListProps) {
  const gradeItems: ActivityItem[] = recentGrades
    .filter((g) => g.updatedAt)
    .map((g) => ({
      key: `grade-${g.assignmentId}`,
      timestamp: g.updatedAt as string,
      icon: <ClipboardCheck className="h-4 w-4 text-primary" />,
      content: (
        <span>
          Scored <span className="font-medium">{g.rawScore}/{g.maxScore}</span> on{" "}
          <Link to={`/app/classes/${classId}/assignments/${g.assignmentId}`} className="font-medium text-primary hover:underline">
            {g.name}
          </Link>
          {g.source === "ocr" && <Badge variant="ocr" className="ml-2">OCR</Badge>}
        </span>
      ),
    }));

  const noteItems: ActivityItem[] = recentNotes.map((n) => ({
    key: `note-${n.id}`,
    timestamp: n.created_at,
    icon: <MessageSquare className="h-4 w-4 text-accent" />,
    content: (
      <span>
        Note added{n.title ? `: "${n.title}"` : ""}
      </span>
    ),
  }));

  const items = [...gradeItems, ...noteItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <Card variant="glass" className="p-5">
      <h3 className="text-sm font-semibold">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No recent grades or notes yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/60">
                {item.icon}
              </span>
              <div>
                <p className="text-sm">{item.content}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
