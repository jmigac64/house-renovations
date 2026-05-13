import Link from "next/link";
import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { createVendorAction } from "@/src/server/actions/core";
import { canEdit } from "@/src/lib/permissions";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requireWorkspaceAccess();
  const { type } = await searchParams;

  const vendors = await db.vendor.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(type ? { type: type as never } : {}),
    },
    include: {
      expenses: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" subtitle="Manage contractors, suppliers, consultants, and public bodies." />

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <select name="type" defaultValue={type || ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">All types</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="CONSULTANT">Consultant</option>
            <option value="PUBLIC_BODY">Public body</option>
            <option value="OTHER">Other</option>
          </select>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Apply</button>
        </form>
      </section>

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add Vendor</h2>
          <form action={createVendorAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input name="name" required placeholder="Vendor name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <select name="type" defaultValue="OTHER" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="CONTRACTOR">Contractor</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="CONSULTANT">Consultant</option>
              <option value="PUBLIC_BODY">Public body</option>
              <option value="OTHER">Other</option>
            </select>
            <input name="contactPerson" placeholder="Contact person" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="email" type="email" placeholder="Email" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="phone" placeholder="Phone" className="rounded-xl border border-slate-300 px-3 py-2" />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Create vendor</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Type</th>
                <th className="py-2">Email</th>
                <th className="py-2">Phone</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b border-slate-100">
                  <td className="py-2">{vendor.name}</td>
                  <td className="py-2">{vendor.type.replaceAll("_", " ")}</td>
                  <td className="py-2">{vendor.email || "-"}</td>
                  <td className="py-2">{vendor.phone || "-"}</td>
                  <td className="py-2 text-right">{vendor.expenses.length}</td>
                  <td className="py-2 text-right">
                    <Link className="text-sky-700 hover:underline" href={`/vendors/${vendor.id}`}>
                      Details
                    </Link>
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
