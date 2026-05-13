import { EmptyState } from "@/src/components/empty-state";
import { PageHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { formatMoney } from "@/src/lib/money";
import { getPlannedVsActual } from "@/src/lib/reports";

export default async function PlannedVsActualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await searchParams;
  const projects = await db.project.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } });

  if (projects.length === 0) {
    return <EmptyState title="No projects" description="Create a project to use reports." />;
  }

  const selected = projects.find((p) => p.id === projectId) ?? projects[0];
  const rows = await getPlannedVsActual(selected.id);
  const money = (n: number) => formatMoney(n, selected.currency, session.workspace.locale);

  return (
    <div className="space-y-6">
      <PageHeader title="Planned vs Actual" subtitle="Budget line comparison report." />
      <form>
        <select name="projectId" defaultValue={selected.id} className="rounded-xl border border-slate-300 bg-white px-3 py-2">
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <button className="ml-2 rounded-xl bg-slate-900 px-3 py-2 text-white">Apply</button>
      </form>

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Budget line</th>
                <th className="py-2">Category</th>
                <th className="py-2">Room</th>
                <th className="py-2">Phase</th>
                <th className="py-2 text-right">Planned total</th>
                <th className="py-2 text-right">Actual</th>
                <th className="py-2 text-right">Difference</th>
                <th className="py-2">Usage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2">{row.category}</td>
                  <td className="py-2">{row.room}</td>
                  <td className="py-2">{row.phase}</td>
                  <td className="py-2 text-right">{money(row.plannedTotal)}</td>
                  <td className="py-2 text-right">{money(row.actual)}</td>
                  <td className="py-2 text-right">{money(row.difference)}</td>
                  <td className="py-2">
                    <StatusBadge
                      label={`${row.usage.toFixed(1)}%`}
                      tone={row.usage > 100 ? "danger" : row.usage >= 80 ? "warning" : "success"}
                    />
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
