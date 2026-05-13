import { CategoryPieChart, GenericBarChart } from "@/src/components/charts";
import { EmptyState } from "@/src/components/empty-state";
import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { formatMoney } from "@/src/lib/money";
import { getCategorySpending } from "@/src/lib/reports";

export default async function CategorySpendingReportPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await searchParams;
  const projects = await db.project.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } });

  if (projects.length === 0) {
    return <EmptyState title="No projects" description="Create a project to use reports." />;
  }

  const selected = projects.find((p) => p.id === projectId) ?? projects[0];
  const rows = await getCategorySpending(selected.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Category Spending" subtitle="Spending distribution and trend by category." />
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
        <CategoryPieChart data={rows.slice(0, 8).map((row) => ({ name: row.category, value: row.spent }))} />
        <GenericBarChart data={rows.slice(0, 8).map((row) => ({ category: row.category, spent: row.spent }))} xKey="category" yKey="spent" />
      </div>

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Spent</th>
                <th className="py-2 text-right">Planned</th>
                <th className="py-2 text-right">Difference</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">% of total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2">{row.category}</td>
                  <td className="py-2 text-right">{formatMoney(row.spent, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.planned, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.difference, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{row.expenseCount}</td>
                  <td className="py-2 text-right">{row.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
