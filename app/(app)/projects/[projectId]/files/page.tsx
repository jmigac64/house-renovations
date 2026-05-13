import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { ProjectTabs } from "../project-tabs";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { canEdit } from "@/src/lib/permissions";

export default async function ProjectFilesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await params;

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: session.workspaceId } });
  if (!project) {
    notFound();
  }

  const files = await db.fileAttachment.findMany({
    where: { projectId },
    include: { expense: true, vendor: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={`${project.name} · Files`} subtitle="Invoices, receipts, and supporting documents." />
      <ProjectTabs projectId={projectId} active="files" />

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Upload File</h2>
          <form action="/api/files/upload" method="post" encType="multipart/form-data" className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="returnTo" value={`/projects/${projectId}/files`} />
            <select name="expenseId" className="rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Attach to expense (optional)</option>
              {(await db.expense.findMany({ where: { projectId }, orderBy: { expenseDate: "desc" }, take: 100 })).map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.expenseDate.toISOString().slice(0, 10)} · {expense.title}
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
                <th className="py-2">Type</th>
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
                  <td className="py-2">{file.mimeType}</td>
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
