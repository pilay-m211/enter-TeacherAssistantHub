import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { MarqueeTicker } from "@/components/landing/MarqueeTicker";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { WorkflowTimeline } from "@/components/landing/WorkflowTimeline";
import { TechStackGrid } from "@/components/landing/TechStackGrid";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <MarqueeTicker />
      <FeaturesGrid />
      <WorkflowTimeline />
      <TechStackGrid />
      <CtaBanner />
      <Footer />
    </div>
  );
};

export default Landing;
