import { Loader2, ChartBar, Users, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReports } from "@/hooks/useReports";

const Reports = () => {
  const { reports, loading } = useReports();

  const totalStudents = reports.reduce((sum, r) => sum + r.studentCount, 0);
  const totalAssignments = reports.reduce((sum, r) => sum + r.assignmentCount, 0);
  const overallAvg = (() => {
    const withScores = reports.filter((r) => r.avgScorePct !== null);
    if (withScores.length === 0) return null;
    return withScores.reduce((sum, r) => sum + (r.avgScorePct ?? 0), 0) / withScores.length;
  })();

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grading performance across all of your classes.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="glass" className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Users className="h-5 w-5 text-accent" />
          </span>
          <div className="mt-4 text-2xl font-bold tracking-tight">{totalStudents}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total Students Graded</p>
        </Card>
        <Card variant="glass" className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <ClipboardList className="h-5 w-5 text-warning" />
          </span>
          <div className="mt-4 text-2xl font-bold tracking-tight">{totalAssignments}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total Assignments</p>
        </Card>
        <Card variant="glass" className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ChartBar className="h-5 w-5 text-primary" />
          </span>
          <div className="mt-4 text-2xl font-bold tracking-tight">
            {overallAvg != null ? `${overallAvg.toFixed(0)}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Overall Avg. Score</p>
        </Card>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl glass-panel py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ChartBar className="h-7 w-7 text-primary" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">No data yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create classes and grade some assignments to see performance reports here.
            </p>
          </div>
        ) : (
          <Card variant="glass" className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>Class</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Avg. Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.classId} className="border-border/40">
                    <TableCell className="font-medium">{report.className}</TableCell>
                    <TableCell className="text-muted-foreground">{report.studentCount}</TableCell>
                    <TableCell className="text-muted-foreground">{report.assignmentCount}</TableCell>
                    <TableCell>
                      {report.avgScorePct != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                              style={{ width: `${Math.min(100, report.avgScorePct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{report.avgScorePct.toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No grades yet</span>
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

export default Reports;
