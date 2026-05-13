import { PageHeader } from "@/src/components/page-header";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { canEdit } from "@/src/lib/permissions";
import { createCategoryAction } from "@/src/server/actions/core";

export default async function SettingsCategoriesPage() {
  const session = await requireWorkspaceAccess();
  const categories = await db.category.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" subtitle="Budget and expense categories." />

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add Category</h2>
          <form action={createCategoryAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input name="name" required placeholder="Category name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="color" placeholder="Color (optional)" className="rounded-xl border border-slate-300 px-3 py-2" />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Add category</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <ul className="grid gap-2">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>{category.name}</span>
              <span>{category.archived ? "Archived" : "Active"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
