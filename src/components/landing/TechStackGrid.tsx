import { Database, Lock, Cloud, Sparkles, Clock, HeartHandshake, ShieldCheck, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";

const TECH_STACK = [
  { icon: Cloud, title: "Enter Cloud", description: "Managed Postgres, auth & storage" },
  { icon: Sparkles, title: "Gemini Vision AI", description: "OCR extraction engine" },
  { icon: Lock, title: "Row-Level Security", description: "Per-teacher data isolation" },
  { icon: Database, title: "Realtime Sync", description: "Instant gradebook updates" },
];

const BENEFITS = [
  { icon: Clock, title: "Save hours every week", description: "Cut manual score entry down to a quick review pass." },
  { icon: HeartHandshake, title: "Focus on feedback", description: "Spend saved time writing feedback that matters." },
  { icon: ShieldCheck, title: "Your data, private", description: "Every class and grade is scoped only to your account." },
];

export function TechStackGrid() {
  return (
    <section id="tech" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Powered by a <span className="text-gradient">modern stack</span>
        </h2>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TECH_STACK.map((tech) => (
          <div key={tech.title} className="group relative overflow-hidden rounded-xl glass-panel p-6 transition-transform hover:-translate-y-1">
            <tech.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-sm font-semibold">{tech.title}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">{tech.description}</p>
            <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-[image:var(--gradient-primary)] transition-transform duration-300 group-hover:scale-x-100" />
          </div>
        ))}
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <benefit.icon className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h4 className="text-sm font-semibold">{benefit.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
