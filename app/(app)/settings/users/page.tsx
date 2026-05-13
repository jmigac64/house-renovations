import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { canManageUsers } from "@/src/lib/permissions";
import { db } from "@/src/lib/db";
import { createUserAction, disableUserAction, updateMemberRoleAction } from "@/src/server/actions/core";

export default async function SettingsUsersPage() {
  const session = await requireWorkspaceAccess();
  const canManage = canManageUsers(session.role);

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: session.workspaceId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Workspace members and permissions." />

      {canManage ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Invite/Create User</h2>
          <form action={createUserAction} className="mt-4 grid gap-3 md:grid-cols-4">
            <input name="name" required placeholder="Full name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="email" required type="email" placeholder="Email" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="password" required type="password" minLength={8} placeholder="Temporary password" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="role" defaultValue="VIEWER" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="OWNER">Owner</option>
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Create user</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-slate-100">
                  <td className="py-2">{member.user.name}</td>
                  <td className="py-2">{member.user.email}</td>
                  <td className="py-2">{member.role}</td>
                  <td className="py-2">{member.user.isActive ? "Active" : "Disabled"}</td>
                  <td className="py-2 text-right">
                    {canManage ? (
                      <div className="inline-flex items-center gap-2">
                        <form action={updateMemberRoleAction} className="inline-flex items-center gap-2">
                          <input type="hidden" name="userId" value={member.userId} />
                          <select name="role" defaultValue={member.role} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            <option value="OWNER">Owner</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs">Set</button>
                        </form>
                        {member.userId !== session.userId ? (
                          <form action={disableUserAction}>
                            <input type="hidden" name="userId" value={member.userId} />
                            <button className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700">Disable</button>
                          </form>
                        ) : null}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
