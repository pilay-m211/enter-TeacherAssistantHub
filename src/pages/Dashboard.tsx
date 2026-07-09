import { Link } from "react-router-dom";
import { Users, GraduationCap, ClipboardList, Percent, ScanLine, ChartBar, ArrowRight, Loader2, BookOpenCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useClasses } from "@/hooks/useClasses";

const STAT_ICONS = [
  { key: "classCount", label: "Classes", icon: GraduationCap, color: "text-primary", bg: "bg-primary/10" },
  { key: "studentCount", label: "Students", icon: Users, color: "text-accent", bg: "bg-accent/10" },
  { key: "assignmentCount", label: "Assignments", icon: ClipboardList, color: "text-warning", bg: "bg-warning/10" },
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { stats, loading } = useDashboardStats();
  const { classes, loading: classesLoading } = useClasses();

  const firstName = profile?.full_name?.trim()?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <div>
      <Card variant="glass" className="relative overflow-hidden p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-[image:var(--gradient-radial-glow)]" />
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, <span className="text-gradient">{firstName}</span>
        </h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Here's a snapshot of your classes, students, and grading activity.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app/scanner">
            <Button variant="hero" className="gap-2">
              <ScanLine className="h-4 w-4" />
              Open Scanner
            </Button>
          </Link>
          <Link to="/app/classes">
            <Button variant="glass" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              View Classes
            </Button>
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_ICONS.map((stat) => (
          <Card key={stat.key} variant="glass" className="p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </span>
            <div className="mt-4 text-2xl font-bold tracking-tight">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : stats?.[stat.key] ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
        <Card variant="glass" className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Percent className="h-5 w-5 text-primary" />
          </span>
          <div className="mt-4 text-2xl font-bold tracking-tight">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : stats?.avgScorePct != null ? (
              `${stats.avgScorePct.toFixed(0)}%`
            ) : (
              "—"
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Avg. Score</p>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Your Classes</h3>
            <Link to="/app/classes" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {classesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : classes.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No classes yet. Create your first one.</p>
            ) : (
              classes.slice(0, 5).map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-2.5 text-sm transition-colors hover:border-primary/40"
                >
                  <Link to={`/app/classes/${classItem.id}`} className="flex-1 font-medium">
                    {classItem.name}
                  </Link>
                  <Link
                    to={`/app/classes/${classItem.id}/gradebook`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <BookOpenCheck className="h-3.5 w-3.5" />
                    Grade Book
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <h3 className="text-base font-semibold">Quick Actions</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link to="/app/scanner">
              <Card variant="glass" className="flex h-full flex-col p-4">
                <ScanLine className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">Scan Documents</p>
                <p className="mt-1 text-xs text-muted-foreground">Rosters, answer sheets, grade sheets</p>
              </Card>
            </Link>
            <Link to={classes[0] ? `/app/classes/${classes[0].id}/gradebook` : "/app/classes"}>
              <Card variant="glass" className="flex h-full flex-col p-4">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">Grade Book</p>
                <p className="mt-1 text-xs text-muted-foreground">DepEd E-Class Record & exports</p>
              </Card>
            </Link>
            <Link to="/app/reports">
              <Card variant="glass" className="flex h-full flex-col p-4">
                <ChartBar className="h-5 w-5 text-accent" />
                <p className="mt-3 text-sm font-medium">View Reports</p>
                <p className="mt-1 text-xs text-muted-foreground">Per-class grading performance</p>
              </Card>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
