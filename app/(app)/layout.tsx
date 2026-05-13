import Link from "next/link";
import { AppSidebar } from "@/src/components/app-sidebar";
import { logoutAction } from "@/src/server/actions/core";
import { requireWorkspaceAccess } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await requireWorkspaceAccess();

  return (
    <div className="min-h-screen md:flex">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Workspace</p>
              <p className="font-semibold text-slate-900">{session.workspace.name}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1">{session.name}</span>
              <Link href="/settings/account" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
                Account
              </Link>
              <form action={logoutAction}>
                <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-white">Log out</button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
