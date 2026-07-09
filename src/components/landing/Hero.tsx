import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ScanLine, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATS = [
  { value: "3x", label: "faster grading" },
  { value: "98%", label: "OCR accuracy" },
  { value: "0", label: "manual re-entry" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid-overlay pb-20 pt-16 sm:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[image:var(--gradient-radial-glow)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Left column */}
        <div>
          <Badge variant="verified" className="mb-6 gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered grading, built for teachers
          </Badge>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Grade papers at the
            <br />
            <span className="text-gradient">speed of a photo.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Scan rosters, answer sheets, and grade sheets. Our OCR pipeline extracts scores instantly —
            you just verify and go.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#workflow">
              <Button variant="glass" size="lg">
                See how it works
              </Button>
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/60 pt-8">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-gradient sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — interactive dual-pane preview mockup */}
        <div className="relative">
          <div
            className="absolute -right-6 -top-6 z-20 flex animate-float-y items-center gap-2 rounded-full glass-panel-strong px-4 py-2 text-xs font-medium text-primary shadow-[var(--shadow-glow)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            AI Verification Active
          </div>

          <div className="glass-panel-strong rounded-2xl p-4 shadow-[var(--shadow-glow-lg)] sm:p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Raw sheet pane */}
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
                  <ScanLine className="h-3.5 w-3.5" />
                  Grading Sheet
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-md border border-warning/25 bg-warning/10 px-2.5 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">Q{row}</span>
                      <span className="font-mono font-semibold text-warning">
                        {[8, 10, 7, 9][row - 1]}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified ledger pane */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified Ledger
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-md border border-primary/25 bg-primary/10 px-2.5 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">Q{row}</span>
                      <span className="font-mono font-semibold text-primary">
                        {[8, 10, 7, 9][row - 1]}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress loop */}
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-progress-loop rounded-full bg-[image:var(--gradient-primary)]" />
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Syncing scores to gradebook…
            </p>
          </div>

          <div className="absolute -bottom-5 -left-5 z-20 hidden animate-float-y items-center gap-2 rounded-full glass-panel-strong px-3 py-1.5 text-[11px] font-medium text-accent shadow-[var(--shadow-glow-accent)] sm:flex">
            34 students synced
          </div>
        </div>
      </div>
    </section>
  );
}
