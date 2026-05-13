import Link from "next/link";
import { PageHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { EmptyState } from "@/src/components/empty-state";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { formatMoney } from "@/src/lib/money";
import { createProjectAction } from "@/src/server/actions/core";
import { getDashboardMetrics } from "@/src/lib/reports";
import { canEdit } from "@/src/lib/permissions";
import { db } from "@/src/lib/db";

export default async function ProjectsPage() {
  const session = await requireWorkspaceAccess();

  const projects = await db.project.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const metricMap = await Promise.all(
    projects.map(async (project) => {
      const metrics = await getDashboardMetrics(project.id);
      return [project.id, metrics] as const;
    }),
  );

  const metricsByProject = new Map(metricMap);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" subtitle="Manage renovation initiatives and compare planned vs actual costs." />

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Create Project</h2>
          <form action={createProjectAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input name="name" required placeholder="Project name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="address" placeholder="Address" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="status" defaultValue="PLANNING" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <input name="currency" defaultValue={session.workspace.defaultCurrency} className="rounded-xl border border-slate-300 px-3 py-2" />
            <input
              name="totalPlannedBudget"
              type="number"
              step="0.01"
              min={0}
              placeholder="Top-level planned budget"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Create</button>
          </form>
        </section>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState title="No projects" description="Create a project to start tracking budgets, expenses, and files." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const metrics = metricsByProject.get(project.id);
            return (
              <article key={project.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                  <StatusBadge label={project.status.replaceAll("_", " ")} tone={project.status === "ACTIVE" ? "success" : "neutral"} />
                </div>
                <p className="mb-4 text-sm text-slate-600">{project.address || "No address specified"}</p>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Actual expenses</dt>
                    <dd className="font-medium">{metrics ? formatMoney(metrics.actualExpenses, project.currency, session.workspace.locale) : "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Remaining budget</dt>
                    <dd className="font-medium">{metrics ? formatMoney(metrics.remainingBudget, project.currency, session.workspace.locale) : "-"}</dd>
                  </div>
                </dl>
                <Link
                  href={`/projects/${project.id}`}
                  className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                >
                  Open project
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
