import { Link } from "react-router-dom";
import { Trash2, UserRound, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudentRow } from "@/hooks/useStudents";

interface StudentRosterTableProps {
  classId: string;
  students: StudentRow[];
  onRemove: (id: string) => void;
}

export function StudentRosterTable({ classId, students, onRemove }: StudentRosterTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl glass-panel py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UserRound className="h-6 w-6 text-primary" />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">No students yet. Add one or scan a roster photo.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl glass-panel">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead>Student</TableHead>
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-16 text-right">Remove</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id} className="border-border/40">
              <TableCell className="font-medium">
                <Link
                  to={`/app/classes/${classId}/students/${student.id}`}
                  className="transition-colors hover:text-primary hover:underline"
                >
                  {student.name}
                </Link>
                {student.status !== "active" && (
                  <Badge variant="ocr" className="ml-2">
                    {student.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Link
                  to={`/app/classes/${classId}/students/${student.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(student.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
