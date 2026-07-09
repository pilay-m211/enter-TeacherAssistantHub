import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app/AppSidebar";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const title = usePageTitle();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background bg-grid-overlay">
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

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

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                ⌘K
              </kbd>
            </button>
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
