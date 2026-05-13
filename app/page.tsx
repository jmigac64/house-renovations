import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import { getSessionUser } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userCount = await db.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
