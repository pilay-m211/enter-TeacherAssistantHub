import { Link } from "react-router-dom";
import { ClipboardList, Trash2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignmentSettingsDialog } from "@/components/teacher/AssignmentSettingsDialog";
import { COMPONENT_LABELS, type AssignmentComponent } from "@/lib/depedGrading";
import type { AssignmentRow } from "@/hooks/useAssignments";

interface AssignmentListProps {
  classId: string;
  assignments: AssignmentRow[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { component: AssignmentComponent; quarter: number }) => Promise<void>;
}

export function AssignmentList({ classId, assignments, onDelete, onUpdate }: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl glass-panel py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <ClipboardList className="h-6 w-6 text-accent" />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">No assignments yet. Create one to start grading.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const component = (assignment.component as AssignmentComponent) ?? "written_work";
        return (
          <Card key={assignment.id} variant="glass" className="flex items-center justify-between p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium">{assignment.name}</h4>
                <Badge variant={assignment.assessment_type === "rubric" ? "verified" : "outline"}>
                  {assignment.assessment_type === "rubric" ? "Rubric" : "Simple"}
                </Badge>
                <Badge variant="outline">{COMPONENT_LABELS[component]}</Badge>
                <Badge variant="outline">Q{assignment.quarter ?? 1}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {assignment.assessment_type === "rubric"
                  ? `${assignment.question_count} criteria · ${assignment.max_score_per_q} pts each`
                  : `${assignment.max_score_per_q} points total`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <AssignmentSettingsDialog
                assignment={assignment}
                onSave={(updates) => onUpdate(assignment.id, updates)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(assignment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link to={`/app/classes/${classId}/assignments/${assignment.id}`}>
                <Button variant="glass" size="sm" className="gap-1">
                  Grade
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
