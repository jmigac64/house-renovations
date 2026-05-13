import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import { loginAction } from "@/src/server/actions/core";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const users = await db.user.count();
  if (users === 0) {
    redirect("/setup");
  }
  const { error } = await searchParams;

  return (
    <main className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Sign In</h1>
      <p className="mt-2 text-sm text-slate-600">Use your email and password to access your workspace.</p>
      {error === "invalid" ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Invalid email or password.
        </p>
      ) : null}

      <form action={loginAction} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Email
          <input name="email" type="email" required className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Password
          <input name="password" type="password" required className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Log In</button>
      </form>
    </main>
  );
}
