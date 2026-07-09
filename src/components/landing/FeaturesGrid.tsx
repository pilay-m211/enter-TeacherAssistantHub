import { ArrowRight, ScanText, ClipboardList, MessageSquareText, Users, LayoutGrid, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: ScanText,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "OCR Answer Scanning",
    description: "Snap a photo of a graded paper and let AI extract per-question scores automatically.",
  },
  {
    icon: Users,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "Roster Scanning",
    description: "Photograph a class list and populate your roster in seconds — no typing required.",
  },
  {
    icon: ClipboardList,
    color: "text-warning",
    bg: "bg-warning/10",
    title: "Rubric Builder",
    description: "Design custom rubrics with weighted criteria, or grade simply out of total points.",
  },
  {
    icon: MessageSquareText,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Written Feedback",
    description: "Attach personalized feedback to every grade, saved alongside each student's record.",
  },
  {
    icon: LayoutGrid,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "Bulk Grade Sheets",
    description: "Scan a handwritten grade sheet to bulk-fill an entire class's scores for review.",
  },
  {
    icon: ShieldCheck,
    color: "text-warning",
    bg: "bg-warning/10",
    title: "Private & Secure",
    description: "Every class, student, and grade is scoped privately to your teacher account.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to <span className="text-gradient">grade faster</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Purpose-built tools that cut manual data entry out of your grading workflow.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} variant="glass" className="group p-6">
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${feature.bg}`}>
              <feature.icon className={`h-5 w-5 ${feature.color}`} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary transition-all group-hover:gap-2">
              View Documentation
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}
