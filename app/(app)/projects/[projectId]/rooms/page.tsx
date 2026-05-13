import { notFound } from "next/navigation";
import { PageHeader } from "@/src/components/page-header";
import { ProjectTabs } from "../project-tabs";
import { requireWorkspaceAccess } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import { canEdit } from "@/src/lib/permissions";
import { createRoomAction } from "@/src/server/actions/core";

export default async function ProjectRoomsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await requireWorkspaceAccess();
  const { projectId } = await params;

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: session.workspaceId } });
  if (!project) {
    notFound();
  }

  const rooms = await db.room.findMany({ where: { projectId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return (
    <div className="space-y-6">
      <PageHeader title={`${project.name} · Rooms`} subtitle="Group budget and expenses by physical location." />
      <ProjectTabs projectId={projectId} active="rooms" />

      {canEdit(session.role) ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold">Add Room</h2>
          <form action={createRoomAction} className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="projectId" value={projectId} />
            <input name="name" required placeholder="Room name" className="rounded-xl border border-slate-300 px-3 py-2" />
            <input name="notes" placeholder="Notes" className="rounded-xl border border-slate-300 px-3 py-2" />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Add room</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4">
        <ul className="grid gap-2">
          {rooms.map((room) => (
            <li key={room.id} className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="font-medium text-slate-900">{room.name}</p>
              {room.notes ? <p className="text-sm text-slate-600">{room.notes}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
