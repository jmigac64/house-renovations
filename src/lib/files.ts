import crypto from "crypto";
import path from "path";
import { ALLOWED_UPLOAD_EXTENSIONS } from "@/src/lib/constants";

export const defaultMaxUploadMb = 20;

export function getUploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export function getMaxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB || defaultMaxUploadMb);
  return (Number.isFinite(mb) ? mb : defaultMaxUploadMb) * 1024 * 1024;
}

export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getFileExtension(filename: string) {
  return path.extname(filename).toLowerCase();
}

export function isAllowedFile(filename: string) {
  return ALLOWED_UPLOAD_EXTENSIONS.includes(getFileExtension(filename) as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number]);
}

export function uniqueStoredName(original: string) {
  const safe = sanitizeFilename(original);
  const ext = getFileExtension(safe);
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}
