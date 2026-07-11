import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { COMPONENT_LABELS, TERMS, TERM_LABELS, type AssignmentComponent, type Term } from "@/lib/gradingConfig";
import type { AssignmentRow } from "@/hooks/useAssignments";

interface AssignmentSettingsDialogProps {
  assignment: AssignmentRow;
  onSave: (updates: { component: AssignmentComponent; semester: Term }) => Promise<void>;
}

export function AssignmentSettingsDialog({ assignment, onSave }: AssignmentSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [component, setComponent] = useState<AssignmentComponent>(
    (assignment.component as AssignmentComponent) ?? "written_oral"
  );
  const [semester, setSemester] = useState<Term>((assignment.semester as Term) ?? 1);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setComponent((assignment.component as AssignmentComponent) ?? "written_oral");
      setSemester((assignment.semester as Term) ?? 1);
    }
    setOpen(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ component, semester });
      setOpen(false);
    } catch (err) {
      toast({
        title: "Could not update assignment",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          aria-label="Grading settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong">
        <DialogHeader>
          <DialogTitle>Grading settings — {assignment.title}</DialogTitle>
          <DialogDescription>
            Tag this assignment's DepEd component and term so it's included correctly in the Grade Book.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Component</Label>
            <Select value={component} onValueChange={(v) => setComponent(v as AssignmentComponent)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COMPONENT_LABELS) as AssignmentComponent[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {COMPONENT_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v) as Term)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {TERM_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="hero" onClick={handleSave} disabled={saving}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
