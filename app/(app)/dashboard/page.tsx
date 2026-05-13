import Link from "next/link";
import { PageHeader } from "@/src/components/page-header";
import { MetricCard } from "@/src/components/metric-card";
import { EmptyState } from "@/src/components/empty-state";
import { CategoryPieChart, GenericBarChart, SpendingLineChart } from "@/src/components/charts";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { formatMoney } from "@/src/lib/money";
import { getCategorySpending, getDashboardMetrics, getMonthlyCashFlow, getVendorSpending } from "@/src/lib/reports";
import { db } from "@/src/lib/db";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await searchParams;

  const projects = await db.project.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Create your first project to start tracking renovation costs." />
        <EmptyState title="No projects yet" description="Go to Projects and create a project to unlock dashboards and reports." />
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === projectId) ?? projects[0];

  const [metrics, category, vendor, cashflow, recentExpenses] = await Promise.all([
    getDashboardMetrics(selectedProject.id),
    getCategorySpending(selectedProject.id),
    getVendorSpending(selectedProject.id),
    getMonthlyCashFlow(selectedProject.id),
    db.expense.findMany({
      where: { projectId: selectedProject.id },
      include: { category: true, vendor: true },
      orderBy: { expenseDate: "desc" },
      take: 8,
    }),
  ]);

  const money = (value: number) => formatMoney(value, selectedProject.currency, session.workspace.locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of planned budget, actual costs, cash, and forecast."
        actions={
          <form>
            <select
              name="projectId"
              defaultValue={selectedProject.id}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button type="submit" className="ml-2 rounded-xl bg-slate-900 px-3 py-2 text-white">
              Switch
            </button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Planned Budget" value={money(metrics.totalPlannedBudget)} />
        <MetricCard label="Actual Expenses" value={money(metrics.actualExpenses)} tone="warning" helper={`${metrics.budgetUsage}% usage`} />
        <MetricCard label="Remaining Budget" value={money(metrics.remainingBudget)} tone={metrics.remainingBudget >= 0 ? "success" : "danger"} />
        <MetricCard label="Forecasted Final Cost" value={money(metrics.forecastedFinalCost)} tone="info" />
        <MetricCard label="Paid Expenses" value={money(metrics.paidExpenses)} />
        <MetricCard label="Unpaid Expenses" value={money(metrics.unpaidExpenses)} tone="warning" />
        <MetricCard label="Available Cash" value={money(metrics.availableCash)} tone={metrics.availableCash >= 0 ? "success" : "danger"} />
        <MetricCard label="Funding Gap" value={money(metrics.fundingGap)} tone={metrics.fundingGap > 0 ? "danger" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart data={category.slice(0, 6).map((row) => ({ name: row.category, value: row.spent }))} />
        <SpendingLineChart
          data={cashflow.map((row) => ({
            month: row.month,
            value: row.monthlyExpenses,
          }))}
        />
      </div>

      <GenericBarChart
        data={vendor.slice(0, 8).map((row) => ({ vendor: row.vendor, total: row.total }))}
        xKey="vendor"
        yKey="total"
      />

      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Expenses</h2>
          <Link className="text-sm text-sky-700 hover:underline" href={`/projects/${selectedProject.id}/expenses`}>
            View all
          </Link>
        </div>
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Date</th>
                <th className="py-2">Title</th>
                <th className="py-2">Category</th>
                <th className="py-2">Vendor</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-slate-100">
                  <td className="py-2">{expense.expenseDate.toISOString().slice(0, 10)}</td>
                  <td className="py-2">{expense.title}</td>
                  <td className="py-2">{expense.category.name}</td>
                  <td className="py-2">{expense.vendor?.name || "-"}</td>
                  <td className="py-2">{expense.status.replaceAll("_", " ")}</td>
                  <td className="py-2 text-right">{money(Number(expense.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
