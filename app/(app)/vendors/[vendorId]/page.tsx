import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { formatMoney } from "@/src/lib/money";

export default async function VendorDetailPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const session = await requireWorkspaceAccess();
  const { vendorId } = await params;

  const vendor = await db.vendor.findFirst({
    where: { id: vendorId, workspaceId: session.workspaceId },
    include: {
      expenses: {
        include: {
          project: true,
          category: true,
        },
        orderBy: {
          expenseDate: "desc",
        },
      },
      files: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!vendor) {
    notFound();
  }

  const total = vendor.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const paid = vendor.expenses.filter((expense) => expense.status === "PAID").reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={vendor.name} subtitle="Vendor details, related expenses, and documents." />

      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-slate-500">Type</p>
          <p className="font-medium">{vendor.type.replaceAll("_", " ")}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Contact</p>
          <p className="font-medium">{vendor.contactPerson || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Total spending</p>
          <p className="font-medium">{formatMoney(total, session.workspace.defaultCurrency, session.workspace.locale)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Paid amount</p>
          <p className="font-medium">{formatMoney(paid, session.workspace.defaultCurrency, session.workspace.locale)}</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold">Related expenses</h2>
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Date</th>
                <th className="py-2">Project</th>
                <th className="py-2">Title</th>
                <th className="py-2">Category</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {vendor.expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-slate-100">
                  <td className="py-2">{expense.expenseDate.toISOString().slice(0, 10)}</td>
                  <td className="py-2">{expense.project.name}</td>
                  <td className="py-2">{expense.title}</td>
                  <td className="py-2">{expense.category.name}</td>
                  <td className="py-2">{expense.status.replaceAll("_", " ")}</td>
                  <td className="py-2 text-right">{formatMoney(Number(expense.amount), expense.currency, session.workspace.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold">Related files</h2>
        <ul className="space-y-2">
          {vendor.files.map((file) => (
            <li key={file.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>{file.originalName}</span>
              <span>
                <a className="mr-2 text-sky-700 hover:underline" href={`/api/files/${file.id}`} target="_blank" rel="noreferrer">
                  Preview
                </a>
                <a className="text-sky-700 hover:underline" href={`/api/files/${file.id}/download`}>
                  Download
                </a>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
