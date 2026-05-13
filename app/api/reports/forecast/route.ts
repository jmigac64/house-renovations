import { NextResponse } from "next/server";
import { getForecast } from "@/src/lib/reports";
import { getSessionUser } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId query parameter is required" }, { status: 400 });
  }

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: session.workspaceId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const report = await getForecast(projectId);
  return NextResponse.json({ project: { id: project.id, name: project.name }, report });
}
