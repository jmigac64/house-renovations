import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/src/lib/db";
import { getSessionUser } from "@/src/lib/auth";
import { getMaxUploadBytes, getUploadDir, isAllowedFile, uniqueStoredName } from "@/src/lib/files";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session?.workspaceId || !session.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!isAllowedFile(file.name)) {
    return NextResponse.json({ error: "File type is not allowed" }, { status: 400 });
  }

  if (file.size > getMaxUploadBytes()) {
    return NextResponse.json({ error: "File exceeds max upload size" }, { status: 400 });
  }

  const projectId = String(formData.get("projectId") || "") || undefined;
  const expenseId = String(formData.get("expenseId") || "") || undefined;
  const vendorId = String(formData.get("vendorId") || "") || undefined;
  const returnTo = String(formData.get("returnTo") || "/files");

  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, workspaceId: session.workspaceId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  if (vendorId) {
    const vendor = await db.vendor.findFirst({ where: { id: vendorId, workspaceId: session.workspaceId } });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
  }

  if (expenseId) {
    const expense = await db.expense.findFirst({ where: { id: expenseId, project: { workspaceId: session.workspaceId } } });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
  }

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const storedName = uniqueStoredName(file.name);
  const storagePath = path.join(uploadDir, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(storagePath, bytes);

  await db.fileAttachment.create({
    data: {
      workspaceId: session.workspaceId,
      projectId,
      expenseId,
      vendorId,
      uploadedById: session.userId,
      originalName: file.name,
      storedName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath,
    },
  });

  return NextResponse.redirect(new URL(returnTo, request.url));
}
