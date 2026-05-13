import { db } from "@/src/lib/db";

export async function getWorkspaceProjects(workspaceId: string) {
  return db.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectForWorkspace(projectId: string, workspaceId: string) {
  return db.project.findFirst({
    where: { id: projectId, workspaceId },
  });
}
