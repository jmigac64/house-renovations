import Link from "next/link";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "budgets", label: "Budgets" },
  { slug: "expenses", label: "Expenses" },
  { slug: "rooms", label: "Rooms" },
  { slug: "phases", label: "Phases" },
  { slug: "files", label: "Files" },
];

export function ProjectTabs({ projectId, active = "" }: { projectId: string; active?: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href = `/projects/${projectId}${tab.slug ? `/${tab.slug}` : ""}`;
        const isActive = tab.slug === active;
        return (
          <Link
            key={tab.slug || "overview"}
            href={href}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              isActive ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
