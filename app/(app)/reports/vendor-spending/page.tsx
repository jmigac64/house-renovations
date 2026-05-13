import { GenericBarChart } from "@/src/components/charts";
import { EmptyState } from "@/src/components/empty-state";
import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { formatMoney } from "@/src/lib/money";
import { getVendorSpending } from "@/src/lib/reports";

export default async function VendorSpendingReportPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await searchParams;
  const projects = await db.project.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } });

  if (projects.length === 0) {
    return <EmptyState title="No projects" description="Create a project to use reports." />;
  }

  const selected = projects.find((p) => p.id === projectId) ?? projects[0];
  const rows = await getVendorSpending(selected.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Spending" subtitle="Contractor and supplier cost breakdown." />
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

      <GenericBarChart data={rows.slice(0, 10).map((row) => ({ vendor: row.vendor, total: row.total }))} xKey="vendor" yKey="total" />

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Vendor</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Paid</th>
                <th className="py-2 text-right">Unpaid</th>
                <th className="py-2 text-right">Count</th>
                <th className="py-2 text-right">Average</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2">{row.vendor}</td>
                  <td className="py-2 text-right">{formatMoney(row.total, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.paid, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{formatMoney(row.unpaid, selected.currency, session.workspace.locale)}</td>
                  <td className="py-2 text-right">{row.count}</td>
                  <td className="py-2 text-right">{formatMoney(row.average, selected.currency, session.workspace.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
