import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { CreateAssignmentInput } from "@/hooks/useAssignments";

interface CreateAssignmentDialogProps {
  onCreate: (input: CreateAssignmentInput) => Promise<void>;
}

export function CreateAssignmentDialog({ onCreate }: CreateAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradingType, setGradingType] = useState<"simple" | "rubric">("simple");
  const [maxPoints, setMaxPoints] = useState("100");
  const [criteria, setCriteria] = useState<string[]>(["Content", "Organization"]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setGradingType("simple");
    setMaxPoints("100");
    setCriteria(["Content", "Organization"]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (gradingType === "simple") {
        await onCreate({
          name: name.trim(),
          gradingType: "simple",
          maxScorePerQuestion: Number(maxPoints) || 100,
        });
      } else {
        const cleanCriteria = criteria.map((c) => c.trim()).filter(Boolean);
        if (cleanCriteria.length < 1) {
          toast({ title: "Add at least one rubric criterion", variant: "destructive" });
          setLoading(false);
          return;
        }
        await onCreate({
          name: name.trim(),
          gradingType: "rubric",
          maxScorePerQuestion: Number(maxPoints) || 10,
          criteria: cleanCriteria,
        });
      }
      resetForm();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Could not create assignment",
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
        <Button variant="hero" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="assignment-name">Assignment name</Label>
            <Input
              id="assignment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Unit 3 Quiz"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Grading type</Label>
            <Tabs value={gradingType} onValueChange={(v) => setGradingType(v as "simple" | "rubric")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="simple">Simple</TabsTrigger>
                <TabsTrigger value="rubric">Rubric</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {gradingType === "simple" ? (
            <div className="space-y-2">
              <Label htmlFor="max-points">Max points</Label>
              <Input
                id="max-points"
                type="number"
                min={1}
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rubric criteria</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCriteria((prev) => [...prev, ""])}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add criterion
                </Button>
              </div>
              <div className="space-y-2">
                {criteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={criterion}
                      onChange={(e) =>
                        setCriteria((prev) => prev.map((c, i) => (i === index ? e.target.value : c)))
                      }
                      placeholder={`Criterion ${index + 1}`}
                    />
                    {criteria.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-points-per-criterion">Max points per criterion</Label>
                <Input
                  id="max-points-per-criterion"
                  type="number"
                  min={1}
                  value={maxPoints === "100" ? "10" : maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" variant="hero" disabled={loading}>
              Create Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
