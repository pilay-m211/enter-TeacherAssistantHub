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
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/lib/depedGrading";

interface CreateClassDialogProps {
  onCreate: (name: string, subjectGroup: SubjectGroup) => Promise<void>;
}

export function CreateClassDialog({ onCreate }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subjectGroup, setSubjectGroup] = useState<SubjectGroup>("core");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), subjectGroup);
      setName("");
      setSubjectGroup("core");
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
