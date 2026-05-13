"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProjectStatus, VendorType, ExpenseStatus, FundingStatus, FundingType, WorkspaceRole, PaymentMethod } from "@prisma/client";
import { db } from "@/src/lib/db";
import { clearSession, createSession, hashPassword, requireSetupComplete, requireWorkspaceAccess, requireWorkspaceEditor, verifyPassword } from "@/src/lib/auth";
import { DEFAULT_CATEGORIES, DEFAULT_PHASES, DEFAULT_ROOMS } from "@/src/lib/constants";
import { assertCanEdit, canManageUsers } from "@/src/lib/permissions";
import { budgetSchema, expenseSchema, fundingSchema, loginSchema, projectSchema, roleSchema, roomPhaseSchema, setupSchema, vendorSchema } from "@/src/lib/validations";

function value(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

function optional(data: FormData, key: string): string | undefined {
  const v = value(data, key);
  return v.length > 0 ? v : undefined;
}

export async function setupAction(formData: FormData) {
  const hasUsers = await db.user.count();
  if (hasUsers > 0) {
    redirect("/login");
  }

  const parsed = setupSchema.parse({
    ownerName: value(formData, "ownerName"),
    ownerEmail: value(formData, "ownerEmail"),
    ownerPassword: value(formData, "ownerPassword"),
    workspaceName: value(formData, "workspaceName"),
    defaultCurrency: value(formData, "defaultCurrency") || "EUR",
  });

  const user = await db.user.create({
    data: {
      name: parsed.ownerName,
      email: parsed.ownerEmail.toLowerCase(),
      passwordHash: await hashPassword(parsed.ownerPassword),
      memberships: {
        create: {
          role: "OWNER",
          workspace: {
            create: {
              name: parsed.workspaceName,
              defaultCurrency: parsed.defaultCurrency.toUpperCase(),
              categories: {
                create: DEFAULT_CATEGORIES.map((name) => ({ name })),
              },
            },
          },
        },
      },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  await requireSetupComplete();

  const parsed = loginSchema.parse({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });

  const user = await db.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
  if (!user?.isActive) {
    redirect("/login?error=invalid");
  }

  const valid = await verifyPassword(parsed.password, user.passwordHash);
  if (!valid) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function createProjectAction(formData: FormData) {
  const session = await requireWorkspaceEditor();

  const parsed = projectSchema.parse({
    name: value(formData, "name"),
    description: optional(formData, "description"),
    address: optional(formData, "address"),
    startDate: optional(formData, "startDate"),
    targetEndDate: optional(formData, "targetEndDate"),
    status: (optional(formData, "status") as ProjectStatus) || "PLANNING",
    totalPlannedBudget: optional(formData, "totalPlannedBudget"),
    currency: (optional(formData, "currency") || session.workspace.defaultCurrency).toUpperCase(),
  });

  const project = await db.project.create({
    data: {
      workspaceId: session.workspaceId,
      name: parsed.name,
      description: parsed.description,
      address: parsed.address,
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      targetEndDate: parsed.targetEndDate ? new Date(parsed.targetEndDate) : undefined,
      status: parsed.status,
      totalPlannedBudget: parsed.totalPlannedBudget,
      currency: parsed.currency,
      rooms: {
        create: DEFAULT_ROOMS.map((name, index) => ({ name, sortOrder: index })),
      },
      phases: {
        create: DEFAULT_PHASES.map((name, index) => ({ name, sortOrder: index })),
      },
    },
  });

  await db.auditLog.create({
    data: {
      workspaceId: session.workspaceId,
      userId: session.userId,
      entityType: "Project",
      entityId: project.id,
      action: "CREATE",
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function createVendorAction(formData: FormData) {
  const session = await requireWorkspaceEditor();

  const parsed = vendorSchema.parse({
    name: value(formData, "name"),
    type: (optional(formData, "type") as VendorType) || "OTHER",
    contactPerson: optional(formData, "contactPerson"),
    email: optional(formData, "email"),
    phone: optional(formData, "phone"),
    address: optional(formData, "address"),
    taxId: optional(formData, "taxId"),
    notes: optional(formData, "notes"),
  });

  await db.vendor.create({
    data: {
      workspaceId: session.workspaceId,
      ...parsed,
    },
  });

  revalidatePath("/vendors");
}

export async function createBudgetAction(formData: FormData) {
  const session = await requireWorkspaceEditor();

  const parsed = budgetSchema.parse({
    projectId: value(formData, "projectId"),
    name: value(formData, "name"),
    categoryId: value(formData, "categoryId"),
    roomId: optional(formData, "roomId"),
    phaseId: optional(formData, "phaseId"),
    vendorId: optional(formData, "vendorId"),
    plannedAmount: value(formData, "plannedAmount"),
    contingencyPercent: optional(formData, "contingencyPercent") || 0,
    notes: optional(formData, "notes"),
  });

  const project = await db.project.findFirstOrThrow({
    where: { id: parsed.projectId, workspaceId: session.workspaceId },
  });
  assertCanEdit(session.role);

  await db.budgetLine.create({
    data: {
      ...parsed,
      roomId: parsed.roomId || undefined,
      phaseId: parsed.phaseId || undefined,
      vendorId: parsed.vendorId || undefined,
      projectId: project.id,
    },
  });

  revalidatePath(`/projects/${project.id}/budgets`);
}

export async function createExpenseAction(formData: FormData) {
  const session = await requireWorkspaceEditor();

  const parsed = expenseSchema.parse({
    projectId: value(formData, "projectId"),
    title: value(formData, "title"),
    description: optional(formData, "description"),
    amount: value(formData, "amount"),
    taxAmount: optional(formData, "taxAmount"),
    expenseDate: value(formData, "expenseDate"),
    paymentDate: optional(formData, "paymentDate"),
    status: (optional(formData, "status") as ExpenseStatus) || "DRAFT",
    categoryId: value(formData, "categoryId"),
    roomId: optional(formData, "roomId"),
    phaseId: optional(formData, "phaseId"),
    vendorId: optional(formData, "vendorId"),
    budgetLineId: optional(formData, "budgetLineId"),
    paymentMethod: optional(formData, "paymentMethod") as PaymentMethod | undefined,
    invoiceNumber: optional(formData, "invoiceNumber"),
    warrantyUntil: optional(formData, "warrantyUntil"),
    notes: optional(formData, "notes"),
  });

  await db.project.findFirstOrThrow({
    where: { id: parsed.projectId, workspaceId: session.workspaceId },
  });

  await db.expense.create({
    data: {
      ...parsed,
      roomId: parsed.roomId || undefined,
      phaseId: parsed.phaseId || undefined,
      vendorId: parsed.vendorId || undefined,
      budgetLineId: parsed.budgetLineId || undefined,
      paymentMethod: parsed.paymentMethod || undefined,
      expenseDate: new Date(parsed.expenseDate),
      paymentDate: parsed.paymentDate ? new Date(parsed.paymentDate) : undefined,
      warrantyUntil: parsed.warrantyUntil ? new Date(parsed.warrantyUntil) : undefined,
      currency: session.workspace.defaultCurrency,
      createdById: session.userId,
    },
  });

  revalidatePath(`/projects/${parsed.projectId}/expenses`);
}

export async function markExpensePaidAction(expenseId: string) {
  const session = await requireWorkspaceEditor();

  const expense = await db.expense.findFirstOrThrow({
    where: {
      id: expenseId,
      project: { workspaceId: session.workspaceId },
    },
  });

  await db.expense.update({
    where: { id: expense.id },
    data: {
      status: "PAID",
      paymentDate: new Date(),
    },
  });

  revalidatePath(`/projects/${expense.projectId}/expenses`);
}

export async function createFundingAction(formData: FormData) {
  const session = await requireWorkspaceEditor();

  const parsed = fundingSchema.parse({
    projectId: value(formData, "projectId"),
    sourceName: value(formData, "sourceName"),
    type: (optional(formData, "type") as FundingType) || "OTHER",
    amount: value(formData, "amount"),
    receivedDate: optional(formData, "receivedDate"),
    status: (optional(formData, "status") as FundingStatus) || "EXPECTED",
    notes: optional(formData, "notes"),
  });

  await db.project.findFirstOrThrow({ where: { id: parsed.projectId, workspaceId: session.workspaceId } });

  await db.fundingSource.create({
    data: {
      projectId: parsed.projectId,
      sourceName: parsed.sourceName,
      type: parsed.type,
      amount: parsed.amount,
      receivedDate: parsed.receivedDate ? new Date(parsed.receivedDate) : undefined,
      status: parsed.status,
      notes: parsed.notes,
    },
  });

  revalidatePath(`/projects/${parsed.projectId}`);
}

export async function createRoomAction(formData: FormData) {
  const session = await requireWorkspaceEditor();
  const parsed = roomPhaseSchema.parse({
    projectId: value(formData, "projectId"),
    name: value(formData, "name"),
    notes: optional(formData, "notes"),
  });

  await db.project.findFirstOrThrow({ where: { id: parsed.projectId, workspaceId: session.workspaceId } });

  await db.room.create({
    data: {
      projectId: parsed.projectId,
      name: parsed.name,
      notes: parsed.notes,
    },
  });

  revalidatePath(`/projects/${parsed.projectId}/rooms`);
}

export async function createPhaseAction(formData: FormData) {
  const session = await requireWorkspaceEditor();
  const parsed = roomPhaseSchema.parse({
    projectId: value(formData, "projectId"),
    name: value(formData, "name"),
    notes: optional(formData, "notes"),
  });

  await db.project.findFirstOrThrow({ where: { id: parsed.projectId, workspaceId: session.workspaceId } });

  await db.phase.create({
    data: {
      projectId: parsed.projectId,
      name: parsed.name,
      notes: parsed.notes,
    },
  });

  revalidatePath(`/projects/${parsed.projectId}/phases`);
}

export async function createCategoryAction(formData: FormData) {
  const session = await requireWorkspaceEditor();
  const name = value(formData, "name");
  if (!name) {
    throw new Error("Category name is required");
  }

  await db.category.create({
    data: {
      workspaceId: session.workspaceId,
      name,
      color: optional(formData, "color"),
    },
  });

  revalidatePath("/settings/categories");
}

export async function updateMemberRoleAction(formData: FormData) {
  const session = await requireWorkspaceAccess();
  if (!canManageUsers(session.role)) {
    throw new Error("Forbidden");
  }

  const parsed = roleSchema.parse({
    userId: value(formData, "userId"),
    role: (optional(formData, "role") as WorkspaceRole) || "VIEWER",
  });

  await db.workspaceMember.updateMany({
    where: {
      workspaceId: session.workspaceId,
      userId: parsed.userId,
    },
    data: {
      role: parsed.role,
    },
  });

  revalidatePath("/settings/users");
}

export async function disableUserAction(formData: FormData) {
  const session = await requireWorkspaceAccess();
  if (!canManageUsers(session.role)) {
    throw new Error("Forbidden");
  }

  const userId = value(formData, "userId");
  if (!userId || userId === session.userId) {
    throw new Error("Cannot disable this account");
  }

  await db.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  revalidatePath("/settings/users");
}

export async function createUserAction(formData: FormData) {
  const session = await requireWorkspaceAccess();
  if (!canManageUsers(session.role)) {
    throw new Error("Forbidden");
  }

  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const role = (optional(formData, "role") as WorkspaceRole) || "VIEWER";

  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required");
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      memberships: {
        create: {
          workspaceId: session.workspaceId,
          role,
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      workspaceId: session.workspaceId,
      userId: session.userId,
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      metadata: { role },
    },
  });

  revalidatePath("/settings/users");
}

export async function updateWorkspaceAction(formData: FormData) {
  const session = await requireWorkspaceAccess();
  if (!canManageUsers(session.role)) {
    throw new Error("Forbidden");
  }

  const name = value(formData, "name");
  const defaultCurrency = value(formData, "defaultCurrency").toUpperCase();
  const locale = value(formData, "locale");

  if (!name || !defaultCurrency) {
    throw new Error("Name and currency are required");
  }

  await db.workspace.update({
    where: { id: session.workspaceId },
    data: {
      name,
      defaultCurrency,
      locale: locale || "en-US",
    },
  });

  revalidatePath("/settings/workspace");
  revalidatePath("/dashboard");
}

export async function updateAccountAction(formData: FormData) {
  const session = await requireWorkspaceAccess();
  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  await db.user.update({
    where: { id: session.userId },
    data: {
      name,
      email,
    },
  });

  revalidatePath("/settings/account");
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireWorkspaceAccess();
  const currentPassword = value(formData, "currentPassword");
  const newPassword = value(formData, "newPassword");

  if (!currentPassword || newPassword.length < 8) {
    throw new Error("Valid current password and new password are required");
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  });

  revalidatePath("/settings/account");
}
