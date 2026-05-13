import { ExpenseStatus, FundingStatus, FundingType, PaymentMethod, ProjectStatus, VendorType, WorkspaceRole } from "@prisma/client";
import { z } from "zod";

export const setupSchema = z.object({
  ownerName: z.string().min(2),
  ownerEmail: z.email(),
  ownerPassword: z.string().min(8),
  workspaceName: z.string().min(2),
  defaultCurrency: z.string().min(3).max(3).default("EUR"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  status: z.enum(ProjectStatus),
  totalPlannedBudget: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(3).max(3),
});

export const vendorSchema = z.object({
  name: z.string().min(2),
  type: z.enum(VendorType),
  contactPerson: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export const budgetSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2),
  categoryId: z.string().min(1),
  roomId: z.string().optional(),
  phaseId: z.string().optional(),
  vendorId: z.string().optional(),
  plannedAmount: z.coerce.number().nonnegative(),
  contingencyPercent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  expenseDate: z.string().min(1),
  paymentDate: z.string().optional(),
  status: z.enum(ExpenseStatus),
  categoryId: z.string().min(1),
  roomId: z.string().optional(),
  phaseId: z.string().optional(),
  vendorId: z.string().optional(),
  budgetLineId: z.string().optional(),
  paymentMethod: z.enum(PaymentMethod).optional(),
  invoiceNumber: z.string().optional(),
  warrantyUntil: z.string().optional(),
  notes: z.string().optional(),
});

export const fundingSchema = z.object({
  projectId: z.string().min(1),
  sourceName: z.string().min(2),
  type: z.enum(FundingType),
  amount: z.coerce.number().nonnegative(),
  receivedDate: z.string().optional(),
  status: z.enum(FundingStatus),
  notes: z.string().optional(),
});

export const roomPhaseSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2),
  notes: z.string().optional(),
});

export const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(WorkspaceRole),
});
