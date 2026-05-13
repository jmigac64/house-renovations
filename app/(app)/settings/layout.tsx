import Link from "next/link";

const links = [
  { href: "/settings/users", label: "Users" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/categories", label: "Categories" },
  { href: "/settings/account", label: "Account" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
