import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, GraduationCap, Users, ScanLine, ChartBar, Settings } from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", path: "/app", icon: LayoutDashboard, exact: true },
      { label: "Classes", path: "/app/classes", icon: GraduationCap },
      { label: "Students", path: "/app/students", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Scanner", path: "/app/scanner", icon: ScanLine },
      { label: "Reports", path: "/app/reports", icon: ChartBar },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", path: "/app/settings", icon: Settings }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
