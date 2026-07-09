import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background bg-grid-overlay">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
