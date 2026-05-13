import { db } from "@/src/lib/db";
import { getSessionUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [session, users] = await Promise.all([getSessionUser(), db.user.count()]);

  if (session) {
    redirect("/dashboard");
  }

  if (users === 0 && typeof children === "object") {
    // Setup route is valid when no users exist.
  }

  return <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">{children}</div>;
}
