import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, ClipboardList, MessageSquare, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { HighlightMatch } from "@/lib/searchHighlight";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const navigate = useNavigate();
  const { students, classes, assignments, notes, loading } = useGlobalSearch(debouncedQuery, { includeArchived });

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const hasAnyResults =
    students.length > 0 || classes.length > 0 || assignments.length > 0 || notes.length > 0;
  const trimmedLength = query.trim().length;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search students, classes, assignments, notes…"
        value={query}
        onValueChange={setQuery}
      />
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="text-xs text-muted-foreground">Include archived students</span>
        <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
      </div>
      <CommandList>
        {trimmedLength < 2 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : !hasAnyResults ? (
          <CommandEmpty>No results for "{query.trim()}".</CommandEmpty>
        ) : (
          <>
            {students.length > 0 && (
              <CommandGroup heading="Students">
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={`student-${student.id}`}
                    onSelect={() => go(`/app/classes/${student.classId}/students/${student.id}`)}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4 text-primary" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">
                        <HighlightMatch text={student.name} query={debouncedQuery} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {student.className}
                        {student.studentNumber ? ` · #${student.studentNumber}` : ""}
                      </span>
                    </div>
                    {student.status !== "active" && <Badge variant="ocr">{student.status}</Badge>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {classes.length > 0 && (
              <CommandGroup heading="Classes">
                {classes.map((classItem) => (
                  <CommandItem
                    key={classItem.id}
                    value={`class-${classItem.id}`}
                    onSelect={() => go(`/app/classes/${classItem.id}`)}
                    className="gap-2"
                  >
                    <GraduationCap className="h-4 w-4 text-accent" />
                    <span className="truncate text-sm">
                      <HighlightMatch text={classItem.name} query={debouncedQuery} />
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {assignments.length > 0 && (
              <CommandGroup heading="Assignments">
                {assignments.map((assignment) => (
                  <CommandItem
                    key={assignment.id}
                    value={`assignment-${assignment.id}`}
                    onSelect={() => go(`/app/classes/${assignment.classId}/assignments/${assignment.id}`)}
                    className="gap-2"
                  >
                    <ClipboardList className="h-4 w-4 text-warning" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">
                        <HighlightMatch text={assignment.name} query={debouncedQuery} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {assignment.className} · T{assignment.semester}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {notes.length > 0 && (
              <CommandGroup heading="Notes">
                {notes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`note-${note.id}`}
                    onSelect={() => go(`/app/classes/${note.classId ?? ""}/students/${note.studentId}`)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">
                        {note.title ? <HighlightMatch text={note.title} query={debouncedQuery} /> : note.studentName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {note.studentName} · <HighlightMatch text={note.snippet} query={debouncedQuery} />
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
