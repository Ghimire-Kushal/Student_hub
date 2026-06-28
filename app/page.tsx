import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { SemesterCard } from "@/components/SemesterCard";
import { AddSemesterButton } from "@/components/AddSemesterButton";

interface SearchParams { search?: string; archived?: string }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { search, archived: showArchived } = await searchParams;

  // Search across units, courses, topics, resources
  if (search) {
    const results = await db.$transaction([
      db.unit.findMany({
        where: {
          name: { contains: search, mode: "insensitive" },
          course: { semester: { userId } },
        },
        include: { course: { include: { semester: true } } },
        take: 10,
      }),
      db.course.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
          semester: { userId },
        },
        include: { semester: true },
        take: 10,
      }),
      db.topic.findMany({
        where: {
          text: { contains: search, mode: "insensitive" },
          unit: { course: { semester: { userId } } },
        },
        include: { unit: { include: { course: { include: { semester: true } } } } },
        take: 10,
      }),
      db.resource.findMany({
        where: {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
          ],
          unit: { course: { semester: { userId } } },
        },
        include: { unit: { include: { course: { include: { semester: true } } } } },
        take: 10,
      }),
    ]);

    const [units, courses, topics, resources] = results;

    return (
      <div className="min-h-screen">
        <TopBar userEmail={session.user.email} />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-ink mb-6">
            Search results for &ldquo;{search}&rdquo;
          </h1>
          <Link href="/" className="text-sm text-accent hover:underline mb-6 block">← Back to dashboard</Link>

          {units.length === 0 && courses.length === 0 && topics.length === 0 && resources.length === 0 && (
            <p className="text-ink-muted text-sm">No results found.</p>
          )}

          {courses.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Subjects</h2>
              <div className="space-y-2">
                {courses.map((c) => (
                  <Link key={c.id} href={`/course/${c.id}`} className="block bg-white border border-border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
                    <span className="font-medium text-ink">{c.code} — {c.name}</span>
                    <span className="text-xs text-ink-muted ml-2">{c.semester.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {units.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Units</h2>
              <div className="space-y-2">
                {units.map((u) => (
                  <Link key={u.id} href={`/unit/${u.id}`} className="block bg-white border border-border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
                    <span className="font-medium text-ink">{u.name}</span>
                    <span className="text-xs text-ink-muted ml-2">{u.course.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {topics.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Topics</h2>
              <div className="space-y-2">
                {topics.map((t) => (
                  <Link key={t.id} href={`/unit/${t.unit.id}`} className="block bg-white border border-border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
                    <span className="text-ink">{t.text}</span>
                    <span className="text-xs text-ink-muted ml-2">{t.unit.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {resources.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Resources</h2>
              <div className="space-y-2">
                {resources.map((r) => (
                  <Link key={r.id} href={`/unit/${r.unit.id}`} className="block bg-white border border-border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
                    <span className="font-medium text-ink">{r.title}</span>
                    <span className="text-xs text-ink-muted ml-2">{r.unit.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  const semesters = await db.semester.findMany({
    where: { userId, archived: showArchived === "1" },
    include: {
      _count: { select: { courses: true } },
      courses: {
        include: {
          units: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute progress per semester
  const semestersWithPct = semesters.map((s) => {
    const allUnits = s.courses.flatMap((c) => c.units);
    const pct = allUnits.length
      ? Math.round((allUnits.filter((u) => u.status === "DONE").length / allUnits.length) * 100)
      : 0;
    return {
      id: s.id,
      name: s.name,
      terminalDate: s.terminalDate?.toISOString() ?? null,
      archived: s.archived,
      _count: s._count,
      pct,
      complete: allUnits.length > 0 && pct === 100,
    };
  });

  // Revision queue (all REVISE units across active semesters)
  const reviseUnits = await db.unit.findMany({
    where: {
      status: "REVISE",
      course: { semester: { userId, archived: false } },
    },
    include: { course: { include: { semester: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Nearest terminal exam (urgent countdown)
  const nearestTerminal = await db.semester.findFirst({
    where: { userId, archived: false, terminalDate: { gte: new Date() } },
    orderBy: { terminalDate: "asc" },
  });

  const terminalDaysLeft = nearestTerminal?.terminalDate
    ? Math.ceil((nearestTerminal.terminalDate.getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen">
      <TopBar userEmail={session.user.email} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Urgent terminal exam banner */}
        {terminalDaysLeft !== null && terminalDaysLeft <= 14 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-semibold text-red-800">Terminal exam in {terminalDaysLeft} day{terminalDaysLeft !== 1 ? "s" : ""}!</p>
              <p className="text-sm text-red-600">{nearestTerminal?.name}</p>
            </div>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink">
            {showArchived === "1" ? "Archived Semesters" : "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href={showArchived === "1" ? "/" : "/?archived=1"}
              className="text-sm text-ink-muted hover:text-ink transition-colors"
            >
              {showArchived === "1" ? "← Active" : "Archived"}
            </Link>
            {showArchived !== "1" && <AddSemesterButton />}
          </div>
        </div>

        {/* Revision queue */}
        {reviseUnits.length > 0 && showArchived !== "1" && (
          <section className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-orange-800 uppercase tracking-wide mb-3">
              Revision Queue ({reviseUnits.length})
            </h2>
            <div className="space-y-2">
              {reviseUnits.map((u) => (
                <Link
                  key={u.id}
                  href={`/unit/${u.id}`}
                  className="flex items-center gap-3 bg-white border border-orange-100 rounded-lg px-3 py-2 hover:shadow-sm transition-shadow"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-sm text-ink font-medium flex-1">{u.name}</span>
                  <span className="text-xs text-ink-muted">{u.course.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Semester grid */}
        {semestersWithPct.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <p className="text-lg mb-2">{showArchived === "1" ? "No archived semesters." : "No semesters yet."}</p>
            {showArchived !== "1" && <p className="text-sm">Create your first semester to get started.</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {semestersWithPct.map((s) => (
              <SemesterCard key={s.id} semester={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
