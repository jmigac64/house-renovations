import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { ProjectTabs } from "../project-tabs";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { createExpenseAction, markExpensePaidAction } from "@/src/server/actions/core";
import { canEdit } from "@/src/lib/permissions";
import { formatMoney } from "@/src/lib/money";

export default async function ProjectExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; categoryId?: string; vendorId?: string }>;
}) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await params;
  const filters = await searchParams;

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: session.workspaceId } });
  if (!project) {
    notFound();
  }

  const where = {
    projectId,
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
  };

  const [categories, rooms, phases, vendors, budgets, expenses] = await Promise.all([
    db.category.findMany({ where: { workspaceId: session.workspaceId, archived: false }, orderBy: { name: "asc" } }),
    db.room.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
    db.phase.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
    db.vendor.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { name: "asc" } }),
    db.budgetLine.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    db.expense.findMany({
      where,
      include: { category: true, room: true, phase: true, vendor: true, files: true },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const money = (value: number) => formatMoney(value, project.currency, session.workspace.locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.name} · Expenses`}
        subtitle="Track invoices, receipts, statuses, and budget impact."
        actions={
          <a
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100"
            href={`/api/exports/expenses?projectId=${project.id}`}
          >
            Export CSV
          </a>
        }
      />
      <ProjectTabs projectId={projectId} active="expenses" />

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <select name="status" defaultValue={filters.status || ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PLANNED">Planned</option>
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REIMBURSABLE">Reimbursable</option>
          </select>
          <select name="categoryId" defaultValue={filters.categoryId || ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select name="vendorId" defaultValue={filters.vendorId || ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Apply filters</button>
        </form>
      </section>

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add Expense</h2>
          <form action={createExpenseAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="projectId" value={projectId} />
            <input name="title" required placeholder="Expense title" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="amount" required type="number" step="0.01" min={0} placeholder="Amount" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="expenseDate" required type="date" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="status" defaultValue="DRAFT" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="DRAFT">Draft</option>
              <option value="PLANNED">Planned</option>
              <option value="ORDERED">Ordered</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="REIMBURSABLE">Reimbursable</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select name="categoryId" required className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
            <select name="budgetLineId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Budget line (optional)</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                </option>
              ))}
            </select>
            <select name="paymentMethod" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Payment method</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="LOAN">Loan</option>
              <option value="OTHER">Other</option>
            </select>
            <input name="invoiceNumber" placeholder="Invoice number" className="rounded-xl border border-slate-300 px-3 py-2" />
            <textarea name="description" placeholder="Description" className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Create expense</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Date</th>
                <th className="py-2">Title</th>
                <th className="py-2">Category</th>
                <th className="py-2">Room</th>
                <th className="py-2">Phase</th>
                <th className="py-2">Vendor</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-right">Files</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-slate-100">
                  <td className="py-2">{expense.expenseDate.toISOString().slice(0, 10)}</td>
                  <td className="py-2">{expense.title}</td>
                  <td className="py-2">{expense.category.name}</td>
                  <td className="py-2">{expense.room?.name || "-"}</td>
                  <td className="py-2">{expense.phase?.name || "-"}</td>
                  <td className="py-2">{expense.vendor?.name || "-"}</td>
                  <td className="py-2">{expense.status.replaceAll("_", " ")}</td>
                  <td className="py-2 text-right">{money(Number(expense.amount))}</td>
                  <td className="py-2 text-right">{expense.files.length}</td>
                  <td className="py-2 text-right">
                    {canEdit(session.role) && expense.status !== "PAID" ? (
                      <form action={markExpensePaidAction.bind(null, expense.id)}>
                        <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Mark paid</button>
                      </form>
                    ) : null}
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
