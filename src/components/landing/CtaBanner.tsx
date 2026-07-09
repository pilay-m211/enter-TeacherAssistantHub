import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card px-8 py-16 text-center sm:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-cta)]" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to stop typing scores <span className="text-gradient">one by one</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Create your teacher account and scan your first roster in under a minute.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
