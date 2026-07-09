import { Loader2, GraduationCap } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { CreateClassDialog } from "@/components/teacher/CreateClassDialog";
import { ClassCard } from "@/components/teacher/ClassCard";
import { useToast } from "@/hooks/use-toast";

const Classes = () => {
  const { classes, loading, createClass, deleteClass } = useClasses();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteClass(id);
    } catch (err) {
      toast({
        title: "Could not delete class",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage rosters, assignments, and grading for every class.
          </p>
        </div>
        <CreateClassDialog onCreate={createClass} />
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl glass-panel py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">No classes yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first class to start adding students and grading assignments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <ClassCard key={classItem.id} classItem={classItem} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Classes;
