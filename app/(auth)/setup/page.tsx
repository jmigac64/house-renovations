import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import { setupAction } from "@/src/server/actions/core";

export default async function SetupPage() {
  const users = await db.user.count();
  if (users > 0) {
    redirect("/login");
  }

  return (
    <main className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Initial Setup</h1>
      <p className="mt-2 text-sm text-slate-600">Create the first owner account and workspace.</p>

      <form action={setupAction} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Owner Name
          <input name="ownerName" required className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Owner Email
          <input name="ownerEmail" type="email" required className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Owner Password
          <input name="ownerPassword" type="password" required minLength={8} className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Workspace Name
          <input name="workspaceName" required defaultValue="Family House Renewal" className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Default Currency
          <input name="defaultCurrency" defaultValue="EUR" className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>

        <button className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-white">Create Workspace</button>
      </form>
    </main>
  );
}
