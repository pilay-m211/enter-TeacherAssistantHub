import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ALL_NAV_ITEMS } from "@/config/navigation";

function usePageTitle() {
  const location = useLocation();
  const match = [...ALL_NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)));
  return match?.label ?? "Dashboard";
}

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = usePageTitle();

  return (
    <div className="min-h-screen bg-background bg-grid-overlay">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-xl md:block">
          <AppSidebar />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 border-border/60 bg-sidebar p-0 text-sidebar-foreground">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-h-screen flex-1 flex-col md:ml-64">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
