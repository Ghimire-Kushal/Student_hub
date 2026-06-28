import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { SemesterCard } from "@/components/SemesterCard";
import { AddSemesterButton } from "@/components/AddSemesterButton";
import { DashboardImportButton } from "@/components/DashboardImportButton";
import { RevisionQueue } from "@/components/RevisionQueue";
import { StudyLog } from "@/components/StudyLog";
import { ExportDataButton } from "@/components/ExportDataButton";

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

  // Manually-flagged REVISE units
  const reviseUnits = await db.unit.findMany({
    where: { status: "REVISE", course: { semester: { userId, archived: false } } },
    include: { course: { include: { semester: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Spaced-rep: DONE units whose nextReviewAt <= now
  const dueUnits = await db.unit.findMany({
    where: {
      status: "DONE",
      nextReviewAt: { lte: new Date() },
      course: { semester: { userId, archived: false } },
    },
    include: { course: { include: { semester: true } } },
    orderBy: { nextReviewAt: "asc" },
  });

  // Study log data
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  const sessions = await db.studySession.findMany({
    where: { userId },
    select: { minutes: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const weekMinutes = sessions
    .filter((s) => s.createdAt >= weekStart)
    .reduce((sum, s) => sum + s.minutes, 0);

  // Streak: consecutive calendar days with at least one session (working backwards from today)
  const sessionDays = new Set(sessions.map((s) => s.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const check = new Date(now);
  // If today has no session, start from yesterday
  if (!sessionDays.has(check.toISOString().slice(0, 10))) {
    check.setDate(check.getDate() - 1);
  }
  while (sessionDays.has(check.toISOString().slice(0, 10))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // Heatmap: daily totals for last 120 days
  const heatStart = new Date(now);
  heatStart.setDate(now.getDate() - 119);
  heatStart.setHours(0, 0, 0, 0);
  const recentSessions = sessions.filter((s) => s.createdAt >= heatStart);
  const dailyMap = new Map<string, number>();
  for (const s of recentSessions) {
    const d = s.createdAt.toISOString().slice(0, 10);
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + s.minutes);
  }
  const heatmapData = Array.from(dailyMap.entries()).map(([date, minutes]) => ({ date, minutes }));

  // Courses for study log selector
  const allCourses = await db.course.findMany({
    where: { semester: { userId, archived: false } },
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: "desc" },
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
            {showArchived !== "1" && (
              <>
                <DashboardImportButton />
                <AddSemesterButton />
              </>
            )}
          </div>
        </div>

        {/* Study log */}
        {showArchived !== "1" && (
          <StudyLog
            weekMinutes={weekMinutes}
            streak={streak}
            heatmapData={heatmapData}
            courses={allCourses}
          />
        )}

        {/* Revision queues (spaced-rep + manual REVISE) */}
        {showArchived !== "1" && (
          <RevisionQueue
            dueUnits={dueUnits.map((u) => ({
              id: u.id,
              number: u.number,
              name: u.name,
              nextReviewAt: u.nextReviewAt!.toISOString(),
              courseId: u.courseId,
              courseName: u.course.name,
              semesterName: u.course.semester.name,
            }))}
            reviseUnits={reviseUnits.map((u) => ({
              id: u.id,
              number: u.number,
              name: u.name,
              courseId: u.courseId,
              courseName: u.course.name,
            }))}
          />
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
