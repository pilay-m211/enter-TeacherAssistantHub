import { useState } from "react";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { StudentNoteRow } from "@/hooks/useStudentNotes";

interface NotesTabProps {
  notes: StudentNoteRow[];
  onAdd: (params: { title?: string; content: string }) => Promise<void>;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NotesTab({ notes, onAdd, onUpdate, onDelete }: NotesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const openForCreate = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  };

  const openForEdit = (note: StudentNoteRow) => {
    setEditingId(note.id);
    setTitle(note.title ?? "");
    setContent(note.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({ title: "Note content is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, { title, content });
        toast({ title: "Note updated" });
      } else {
        await onAdd({ title, content });
        toast({ title: "Note added" });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({
        title: "Could not save note",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-2" onClick={openForCreate}>
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel-strong">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit note" : "Add note"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-title">Title (optional)</Label>
                <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Behavior observation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-content">Note</Label>
                <Textarea
                  id="note-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Write your observation or remark…"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Add Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No notes yet. Add one to track observations or remarks.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} variant="glass" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {note.title && <h4 className="font-medium">{note.title}</h4>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForEdit(note)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
