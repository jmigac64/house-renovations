import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionUser } from "@/src/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await getSessionUser();
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const file = await db.fileAttachment.findFirst({
    where: { id: fileId, workspaceId: session.workspaceId },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await readFile(file.storagePath).catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "Stored file missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `inline; filename=\"${file.originalName}\"`,
    },
  });
}
