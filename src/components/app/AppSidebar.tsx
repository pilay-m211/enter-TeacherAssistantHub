import { NavLink } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { LogoMark } from "@/components/landing/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  onNavigate?: () => void;
}

function initialsFor(name: string | undefined | null, email: string | undefined | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "T";
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { profile, loading } = useProfile();

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Teacher";
  const roleLabel = profile?.title || "Teacher";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-5">
        <LogoMark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[image:var(--gradient-primary)]" />
                      )}
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <NavLink
        to="/app/settings"
        onClick={onNavigate}
        className="flex items-center gap-3 border-t border-border/60 px-5 py-4 transition-colors hover:bg-white/5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : initialsFor(profile?.full_name, user?.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            signOut();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-destructive"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </NavLink>
    </div>
  );
}
