import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { updateWorkspaceAction } from "@/src/server/actions/core";
import { canManageUsers } from "@/src/lib/permissions";

export default async function SettingsWorkspacePage() {
  const session = await requireWorkspaceAccess();

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace" subtitle="Default configuration for your renovation workspace." />

      <section className="rounded-2xl border bg-white p-4">
        <form action={updateWorkspaceAction} className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Name
            <input
              name="name"
              required
              disabled={!canManageUsers(session.role)}
              defaultValue={session.workspace.name}
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Default currency
            <input
              name="defaultCurrency"
              required
              disabled={!canManageUsers(session.role)}
              defaultValue={session.workspace.defaultCurrency}
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Locale
            <input
              name="locale"
              disabled={!canManageUsers(session.role)}
              defaultValue={session.workspace.locale}
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          {canManageUsers(session.role) ? <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Save</button> : null}
        </form>
      </section>
    </div>
  );
}
