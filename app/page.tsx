import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-paper p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-fraunces text-3xl text-ink">Dashboard</h1>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <p className="text-ink-muted text-sm">
          Signed in as <span className="text-ink font-medium">{session.user?.email}</span>
        </p>

        <div className="mt-8 rounded-lg border border-border bg-white/60 p-6 text-sm text-ink-muted">
          Step 3 complete — auth working. Semesters coming in Step 5.
        </div>
      </div>
    </main>
  );
}
