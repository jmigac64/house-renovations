import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { MetricCard } from "@/src/components/metric-card";
import { GenericBarChart } from "@/src/components/charts";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { getCategorySpending, getDashboardMetrics, getVendorSpending } from "@/src/lib/reports";
import { formatMoney } from "@/src/lib/money";
import { createFundingAction } from "@/src/server/actions/core";
import { canEdit } from "@/src/lib/permissions";
import { ProjectTabs } from "./project-tabs";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await params;

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: session.workspaceId },
  });

  if (!project) {
    notFound();
  }

  const [metrics, byCategory, byVendor, funding] = await Promise.all([
    getDashboardMetrics(project.id),
    getCategorySpending(project.id),
    getVendorSpending(project.id),
    db.fundingSource.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const money = (value: number) => formatMoney(value, project.currency, session.workspace.locale);

  return (
    <div className="space-y-6">
      <PageHeader title={project.name} subtitle="Budget summary, spending by room/phase/category, and funding status." />
      <ProjectTabs projectId={project.id} active="" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Planned" value={money(metrics.totalPlannedBudget)} />
        <MetricCard label="Actual" value={money(metrics.actualExpenses)} tone="warning" />
        <MetricCard label="Remaining" value={money(metrics.remainingBudget)} tone={metrics.remainingBudget >= 0 ? "success" : "danger"} />
        <MetricCard label="Forecast" value={money(metrics.forecastedFinalCost)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GenericBarChart data={byCategory.slice(0, 8).map((x) => ({ category: x.category, spent: x.spent }))} xKey="category" yKey="spent" />
        <GenericBarChart data={byVendor.slice(0, 8).map((x) => ({ vendor: x.vendor, total: x.total }))} xKey="vendor" yKey="total" />
      </div>

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add Funding Source</h2>
          <form action={createFundingAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="projectId" value={project.id} />
            <input name="sourceName" required placeholder="Source name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="type" defaultValue="SAVINGS" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="SAVINGS">Savings</option>
              <option value="LOAN">Loan</option>
              <option value="SUBSIDY">Subsidy</option>
              <option value="REFUND">Refund</option>
              <option value="SALE">Sale</option>
              <option value="OTHER">Other</option>
            </select>
            <input name="amount" required type="number" min={0} step="0.01" placeholder="Amount" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="receivedDate" type="date" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="status" defaultValue="EXPECTED" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="EXPECTED">Expected</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Add funding</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Funding Sources</h2>
          <Link href="/reports/monthly-cash-flow" className="text-sm text-sky-700 hover:underline">
            Cash flow report
          </Link>
        </div>
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Source</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2">Received date</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {funding.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100">
                  <td className="py-2">{entry.sourceName}</td>
                  <td className="py-2">{entry.type}</td>
                  <td className="py-2">{entry.status}</td>
                  <td className="py-2">{entry.receivedDate?.toISOString().slice(0, 10) || "-"}</td>
                  <td className="py-2 text-right">{money(Number(entry.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
