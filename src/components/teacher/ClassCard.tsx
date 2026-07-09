import { Link } from "react-router-dom";
import { Trash2, Users, ChevronRight, BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClassRow } from "@/hooks/useClasses";

interface ClassCardProps {
  classItem: ClassRow;
  onDelete: (id: string) => void;
}

export function ClassCard({ classItem, onDelete }: ClassCardProps) {
  return (
    <Card variant="glass" className="group flex flex-col justify-between p-1">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              onDelete(classItem.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-lg">{classItem.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between pt-0">
        <Link
          to={`/app/classes/${classItem.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all hover:gap-2"
        >
          Open class
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link to={`/app/classes/${classItem.id}/gradebook`}>
          <Button variant="glass" size="sm" className="gap-1.5">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Grade Book
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
