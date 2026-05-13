import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionUser } from "@/src/lib/auth";

function csvEscape(input: string | number | null | undefined) {
  const value = String(input ?? "");
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `\"${value.replaceAll("\"", "\"\"")}\"`;
  }
  return value;
}

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

  const expenses = await db.expense.findMany({
    where: { projectId },
    include: { category: true, room: true, phase: true, vendor: true },
    orderBy: { expenseDate: "desc" },
  });

  const header = [
    "Date",
    "Title",
    "Category",
    "Room",
    "Phase",
    "Vendor",
    "Status",
    "Amount",
    "Currency",
    "Invoice Number",
    "Payment Method",
  ];

  const lines = expenses.map((expense) =>
    [
      expense.expenseDate.toISOString().slice(0, 10),
      expense.title,
      expense.category.name,
      expense.room?.name || "",
      expense.phase?.name || "",
      expense.vendor?.name || "",
      expense.status,
      Number(expense.amount).toFixed(2),
      expense.currency,
      expense.invoiceNumber || "",
      expense.paymentMethod || "",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=expenses-${project.name.replace(/\s+/g, "-").toLowerCase()}.csv`,
    },
  });
}
