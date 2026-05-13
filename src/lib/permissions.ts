import { WorkspaceRole } from "@prisma/client";

export function canEdit(role: WorkspaceRole) {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageUsers(role: WorkspaceRole) {
  return role === "OWNER";
}

export function assertCanEdit(role: WorkspaceRole) {
  if (!canEdit(role)) {
    throw new Error("Forbidden");
  }
}
