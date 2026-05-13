import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { changePasswordAction, updateAccountAction } from "@/src/server/actions/core";
import { db } from "@/src/lib/db";

export default async function SettingsAccountPage() {
  const session = await requireWorkspaceAccess();
  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div className="space-y-6">
      <PageHeader title="Account" subtitle="Update your profile and password." />

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Profile</h2>
        <form action={updateAccountAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input name="name" required defaultValue={user.name} className="rounded-xl border border-slate-300 px-3 py-2" />
          <input name="email" type="email" required defaultValue={user.email} className="rounded-xl border border-slate-300 px-3 py-2" />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Save profile</button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Change Password</h2>
        <form action={changePasswordAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input name="currentPassword" type="password" required placeholder="Current password" className="rounded-xl border border-slate-300 px-3 py-2" />
          <input name="newPassword" type="password" required minLength={8} placeholder="New password" className="rounded-xl border border-slate-300 px-3 py-2" />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Change password</button>
        </form>
      </section>
    </div>
  );
}
