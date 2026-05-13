import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { canEdit } from "@/src/lib/permissions";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; vendorId?: string; expenseId?: string }>;
}) {
  const session = await requireWorkspaceAccess();
  const filters = await searchParams;

  const [projects, vendors, expenses, files] = await Promise.all([
    db.project.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { name: "asc" } }),
    db.vendor.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { name: "asc" } }),
    db.expense.findMany({ where: { project: { workspaceId: session.workspaceId } }, orderBy: { expenseDate: "desc" }, take: 200 }),
    db.fileAttachment.findMany({
      where: {
        workspaceId: session.workspaceId,
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
        ...(filters.expenseId ? { expenseId: filters.expenseId } : {}),
      },
      include: {
        project: true,
        vendor: true,
        expense: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Files" subtitle="Browse uploaded invoices, receipts, and project documents." />

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <select name="projectId" defaultValue={filters.projectId || ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
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
          <select name="expenseId" defaultValue={filters.expenseId || ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">All expenses</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.title}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Apply filters</button>
        </form>
      </section>

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Upload File</h2>
          <form action="/api/files/upload" method="post" encType="multipart/form-data" className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="returnTo" value="/files" />
            <select name="projectId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Project (optional)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
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
            <select name="expenseId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Expense (optional)</option>
              {expenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.title}
                </option>
              ))}
            </select>
            <input name="file" required type="file" className="rounded-xl border border-slate-300 px-3 py-2" />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Upload</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Project</th>
                <th className="py-2">Expense</th>
                <th className="py-2">Vendor</th>
                <th className="py-2">Uploaded</th>
                <th className="py-2 text-right">Size</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b border-slate-100">
                  <td className="py-2">{file.originalName}</td>
                  <td className="py-2">{file.project?.name || "-"}</td>
                  <td className="py-2">{file.expense?.title || "-"}</td>
                  <td className="py-2">{file.vendor?.name || "-"}</td>
                  <td className="py-2">{file.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="py-2 text-right">{(file.sizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="py-2 text-right">
                    <a className="mr-2 text-sky-700 hover:underline" href={`/api/files/${file.id}`} target="_blank" rel="noreferrer">
                      Preview
                    </a>
                    <a className="text-sky-700 hover:underline" href={`/api/files/${file.id}/download`}>
                      Download
                    </a>
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
