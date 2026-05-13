import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { StatusBadge } from "@/src/components/status-badge";
import { ProjectTabs } from "../project-tabs";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { createBudgetAction } from "@/src/server/actions/core";
import { canEdit } from "@/src/lib/permissions";
import { formatMoney } from "@/src/lib/money";
import { getPlannedVsActual } from "@/src/lib/reports";

export default async function ProjectBudgetsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await params;

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: session.workspaceId } });
  if (!project) {
    notFound();
  }

  const [categories, rooms, phases, vendors, rows] = await Promise.all([
    db.category.findMany({ where: { workspaceId: session.workspaceId, archived: false }, orderBy: { name: "asc" } }),
    db.room.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
    db.phase.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
    db.vendor.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { name: "asc" } }),
    getPlannedVsActual(projectId),
  ]);

  const money = (value: number) => formatMoney(value, project.currency, session.workspace.locale);

  return (
    <div className="space-y-6">
      <PageHeader title={`${project.name} · Budgets`} subtitle="Plan spending by category, room, phase, and vendor." />
      <ProjectTabs projectId={projectId} active="budgets" />

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add Budget Line</h2>
          <form action={createBudgetAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="projectId" value={projectId} />
            <input name="name" required placeholder="Budget line name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="categoryId" required className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              name="plannedAmount"
              type="number"
              min={0}
              step="0.01"
              required
              placeholder="Planned amount"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              name="contingencyPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="Contingency %"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <select name="roomId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Room (optional)</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <select name="phaseId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Phase (optional)</option>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
            <select name="vendorId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Vendor (optional)</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Create line</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold">Planned vs Actual</h2>
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Category</th>
                <th className="py-2">Room</th>
                <th className="py-2">Phase</th>
                <th className="py-2 text-right">Planned total</th>
                <th className="py-2 text-right">Actual</th>
                <th className="py-2 text-right">Remaining</th>
                <th className="py-2">Status</th>
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
                      label={`${row.status} (${row.usage.toFixed(1)}%)`}
                      tone={row.status === "Over budget" ? "danger" : row.status === "Near limit" ? "warning" : "success"}
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
