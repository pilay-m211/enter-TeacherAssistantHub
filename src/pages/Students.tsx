import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserRound, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search/SearchInput";
import { useAllStudents } from "@/hooks/useAllStudents";

const Students = () => {
  const { students, loading } = useAllStudents();
  const [search, setSearch] = useState("");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.student_number?.toLowerCase().includes(query) ||
        s.className?.toLowerCase().includes(query)
    );
  }, [students, search]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every student across all of your classes, in one place.
        </p>
      </div>

      {students.length > 0 && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, student number, or class…"
          className="mt-6 max-w-md"
        />
      )}

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl glass-panel py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <UserRound className="h-7 w-7 text-primary" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">No students yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add students from a class page, or scan a roster photo to get started.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl glass-panel py-16 text-center">
            <p className="text-sm text-muted-foreground">No students match "{search.trim()}".</p>
          </div>
        ) : (
          <Card variant="glass" className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="w-16 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} className="border-border/40">
                    <TableCell className="font-medium">
                      {student.folder_id ? (
                        <Link
                          to={`/app/classes/${student.folder_id}/students/${student.id}`}
                          className="transition-colors hover:text-primary hover:underline"
                        >
                          {student.name}
                        </Link>
                      ) : (
                        student.name
                      )}
                    </TableCell>
                    <TableCell>
                      {student.className ? (
                        <Badge variant="outline">{student.className}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {student.folder_id && (
                        <Link
                          to={`/app/classes/${student.folder_id}/students/${student.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Students;
