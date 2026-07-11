import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SUBJECT_GROUP_LABELS, TERMS, TERM_LABELS, type SubjectGroup, type Term } from "@/lib/gradingConfig";
import type { CreateClassInput } from "@/hooks/useClasses";

interface CreateClassDialogProps {
  onCreate: (input: CreateClassInput) => Promise<void>;
}

export function CreateClassDialog({ onCreate }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subjectGroup, setSubjectGroup] = useState<SubjectGroup>("core");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [semester, setSemester] = useState<Term>(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        subjectGroup,
        gradeLevel: gradeLevel.trim() || undefined,
        section: section.trim() || undefined,
        semester,
      });
      setName("");
      setSubjectGroup("core");
      setGradeLevel("");
      setSection("");
      setSemester(1);
      setOpen(false);
    } catch (err) {
      toast({
        title: "Could not create class",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="h-4 w-4" />
          New Class
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong">
        <DialogHeader>
          <DialogTitle>Create a class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Class name</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Period 3 — Algebra I"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Subject group</Label>
            <Select value={subjectGroup} onValueChange={(v) => setSubjectGroup(v as SubjectGroup)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SUBJECT_GROUP_LABELS) as SubjectGroup[]).map((group) => (
                  <SelectItem key={group} value={group}>
                    {SUBJECT_GROUP_LABELS[group]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sets the DepEd Written Work / Performance Task / Quarterly Assessment weights used for grading.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade-level">Grade level</Label>
              <Input
                id="grade-level"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                placeholder="e.g. Grade 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Sampaguita"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Starting term</Label>
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
            <p className="text-xs text-muted-foreground">
              DO 15, s. 2026 uses a 3-term (Trisemester) school calendar for all grade levels.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" variant="hero" disabled={loading}>
              Create Class
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
