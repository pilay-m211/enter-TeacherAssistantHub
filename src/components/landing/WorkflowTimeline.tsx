import { Upload, ScanLine, Cpu, Eye, CheckCircle2, Database } from "lucide-react";
import { Card } from "@/components/ui/card";

const STEPS = [
  { icon: Upload, title: "Upload Photo", description: "Snap or upload a photo of the paper, roster, or grade sheet." },
  { icon: ScanLine, title: "Scan Detected", description: "The image is securely sent for OCR processing." },
  { icon: Cpu, title: "AI Extraction", description: "Gemini vision AI reads names, scores, and answers." },
  { icon: Eye, title: "Review Draft", description: "Extracted data appears amber-highlighted for your review." },
  { icon: CheckCircle2, title: "Verify", description: "Confirm or correct any field before it's accepted." },
  { icon: Database, title: "Saved to Gradebook", description: "Verified data syncs instantly, teal-highlighted." },
];

export function WorkflowTimeline() {
  return (
    <section id="workflow" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          From paper to <span className="text-gradient">gradebook</span>
        </h2>
        <p className="mt-4 text-muted-foreground">Six steps, zero manual transcription.</p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STEPS.map((step, index) => (
          <Card key={step.title} variant="glass" className="flex flex-col items-start p-5">
            <div className="flex w-full items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
