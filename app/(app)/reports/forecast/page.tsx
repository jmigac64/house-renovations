import { MetricCard } from "@/src/components/metric-card";
import { EmptyState } from "@/src/components/empty-state";
import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { formatMoney } from "@/src/lib/money";
import { getForecast } from "@/src/lib/reports";

export default async function ForecastReportPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await searchParams;
  const projects = await db.project.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } });

  if (projects.length === 0) {
    return <EmptyState title="No projects" description="Create a project to use reports." />;
  }

  const selected = projects.find((p) => p.id === projectId) ?? projects[0];
  const report = await getForecast(selected.id);

  const money = (n: number) => formatMoney(n, selected.currency, session.workspace.locale);

  return (
    <div className="space-y-6">
      <PageHeader title="Remaining Budget Forecast" subtitle="Estimate final cost and budget/funding difference." />
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Current actual expenses" value={money(report.actualExpenses)} />
        <MetricCard label="Remaining planned budget" value={money(report.remainingPlannedBudget)} />
        <MetricCard label="Forecasted final cost" value={money(report.forecastedFinalCost)} tone="warning" />
        <MetricCard label="Total planned budget" value={money(report.totalPlannedBudget)} />
        <MetricCard
          label="Forecasted difference"
          value={money(report.forecastedDifference)}
          tone={report.forecastedDifference >= 0 ? "success" : "danger"}
        />
        <MetricCard label="Funding gap" value={money(report.fundingGap)} tone={report.fundingGap > 0 ? "danger" : "success"} />
      </div>
    </div>
  );
}
