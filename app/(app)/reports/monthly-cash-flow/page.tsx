import { GenericBarChart, SpendingLineChart } from "@/src/components/charts";
import { EmptyState } from "@/src/components/empty-state";
import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { formatMoney } from "@/src/lib/money";
import { getMonthlyCashFlow } from "@/src/lib/reports";

export default async function MonthlyCashFlowReportPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await searchParams;
  const projects = await db.project.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } });

  if (projects.length === 0) {
    return <EmptyState title="No projects" description="Create a project to use reports." />;
  }

  const selected = projects.find((p) => p.id === projectId) ?? projects[0];
  const rows = await getMonthlyCashFlow(selected.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly Cash Flow" subtitle="Funding, expenses, net flow, and running balance." />
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

      <div className="grid gap-4 lg:grid-cols-2">
        <GenericBarChart data={rows.map((row) => ({ month: row.month, net: row.net }))} xKey="month" yKey="net" />
        <SpendingLineChart data={rows.map((row) => ({ month: row.month, value: row.runningBalance }))} />
      </div>

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Month</th>
                <th className="py-2 text-right">Funding</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">Net</th>
                <th className="py-2 text-right">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b border-slate-100">
                  <td className="py-2">{row.month}</td>
                  <td className="py-2 text-right">{formatMoney(row.monthlyFunding, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.monthlyExpenses, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.net, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.runningBalance, selected.currency, session.workspace.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
