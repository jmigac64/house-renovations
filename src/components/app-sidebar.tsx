import Link from "next/link";
import { LayoutDashboard, FolderKanban, Users, Files, ChartColumnIncreasing, Settings } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/files", label: "Files", icon: Files },
  { href: "/reports", label: "Reports", icon: ChartColumnIncreasing },
  { href: "/settings/workspace", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col p-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">House Renovations</p>
          <h2 className="text-lg font-bold text-slate-900">Expense Tracker</h2>
        </div>
        <nav className="grid gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
