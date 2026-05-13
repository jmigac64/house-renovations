import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { WorkspaceRole } from "@prisma/client";
import { db } from "@/src/lib/db";

const SESSION_COOKIE = "hr_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined;
const APP_URL = process.env.APP_URL?.trim() || undefined;

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return fallback;
}

function isHttpsUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return undefined;
  }
}

const appUrlIsHttps = isHttpsUrl(APP_URL);
const explicitSecureCookie = process.env.SESSION_COOKIE_SECURE;
const AUTH_DEBUG = parseBool(process.env.AUTH_DEBUG, false);

function authLog(event: string, details: Record<string, unknown>) {
  if (!AUTH_DEBUG) {
    return;
  }
  console.info(`[auth] ${event}`, details);
}

function parseForwardedProto(forwarded: string | null) {
  if (!forwarded) {
    return undefined;
  }
  const match = forwarded.match(/proto=([^;,\s]+)/i);
  if (!match?.[1]) {
    return undefined;
  }
  return match[1].replace(/^"|"$/g, "").toLowerCase();
}

async function resolveCookieSecure() {
  if (explicitSecureCookie !== undefined) {
    return {
      secure: parseBool(explicitSecureCookie, false),
      source: "SESSION_COOKIE_SECURE",
    } as const;
  }

  const headerStore = await headers();
  const xForwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (xForwardedProto === "https") {
    return { secure: true, source: "x-forwarded-proto" } as const;
  }
  if (xForwardedProto === "http") {
    return { secure: false, source: "x-forwarded-proto" } as const;
  }

  const forwardedProto = parseForwardedProto(headerStore.get("forwarded"));
  if (forwardedProto === "https") {
    return { secure: true, source: "forwarded" } as const;
  }
  if (forwardedProto === "http") {
    return { secure: false, source: "forwarded" } as const;
  }

  if (appUrlIsHttps !== undefined) {
    return { secure: appUrlIsHttps, source: "APP_URL" } as const;
  }

  return { secure: process.env.NODE_ENV === "production", source: "NODE_ENV" } as const;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const tokenHash = hashToken(rawToken);
  const tokenHashPrefix = tokenHash.slice(0, 8);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const { secure, source } = await resolveCookieSecure();
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: rawToken,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
  });

  authLog("session.create", {
    userId,
    tokenHashPrefix,
    secure,
    secureSource: source,
    domain: SESSION_COOKIE_DOMAIN ?? null,
    appUrl: APP_URL ?? null,
    appUrlIsHttps: appUrlIsHttps ?? null,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const { secure, source } = await resolveCookieSecure();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  if (SESSION_COOKIE_DOMAIN) {
    cookieStore.set({
      name: SESSION_COOKIE,
      value: "",
      expires: new Date(0),
      path: "/",
      domain: SESSION_COOKIE_DOMAIN,
      httpOnly: true,
      secure,
      sameSite: "lax",
    });
  } else {
    cookieStore.delete(SESSION_COOKIE);
  }

  authLog("session.clear", {
    hadCookie: Boolean(token),
    secure,
    secureSource: source,
    domain: SESSION_COOKIE_DOMAIN ?? null,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    authLog("session.read", {
      cookiePresent: false,
      sessionFound: false,
      reason: "missing-cookie",
    });
    return null;
  }

  const tokenHash = hashToken(token);
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              workspace: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!session || !session.user.isActive) {
    authLog("session.read", {
      cookiePresent: true,
      sessionFound: Boolean(session),
      tokenHashPrefix: tokenHash.slice(0, 8),
      userActive: session?.user.isActive ?? null,
      reason: !session ? "session-not-found-or-expired" : "user-disabled",
    });
    return null;
  }

  await db.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  const activeMembership = session.user.memberships[0] ?? null;
  authLog("session.read", {
    cookiePresent: true,
    sessionFound: true,
    tokenHashPrefix: tokenHash.slice(0, 8),
    userId: session.user.id,
    hasMembership: Boolean(activeMembership),
  });

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    workspaceId: activeMembership?.workspaceId ?? null,
    workspace: activeMembership?.workspace ?? null,
    role: activeMembership?.role ?? null,
  };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireSetupComplete() {
  const userCount = await db.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }
}

export async function requireWorkspaceAccess() {
  const session = await requireUser();
  if (!session.workspaceId || !session.role) {
    throw new Error("No workspace membership");
  }
  return session as {
    userId: string;
    name: string;
    email: string;
    workspaceId: string;
    role: WorkspaceRole;
    workspace: { id: string; name: string; defaultCurrency: string; locale: string };
  };
}

export async function requireWorkspaceEditor() {
  const session = await requireWorkspaceAccess();
  if (session.role === "VIEWER") {
    throw new Error("Forbidden");
  }
  return session;
}
