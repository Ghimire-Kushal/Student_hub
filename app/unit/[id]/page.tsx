import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { TopicChecklist } from "@/components/TopicChecklist";
import { ResourceTabs } from "@/components/ResourceTabs";
import { statusColors } from "@/lib/theme";
import { UnitStatus } from "@prisma/client";
import { setUnitStatus } from "@/app/actions/unit";

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const unit = await db.unit.findFirst({
    where: { id, course: { semester: { userId: session.user.id } } },
    include: {
      topics: { orderBy: { createdAt: "asc" } },
      resources: { orderBy: { createdAt: "desc" } },
      course: { include: { semester: true } },
    },
  });

  if (!unit) notFound();

  const colors = statusColors[unit.status as UnitStatus];
  const donePct = unit.topics.length
    ? Math.round((unit.topics.filter((t) => t.done).length / unit.topics.length) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar userEmail={session.user.email} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-ink-muted mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-ink">Dashboard</Link>
          <span>/</span>
          <Link href={`/semester/${unit.course.semester.id}`} className="hover:text-ink">{unit.course.semester.name}</Link>
          <span>/</span>
          <Link href={`/course/${unit.course.id}`} className="hover:text-ink">{unit.course.name}</Link>
          <span>/</span>
          <span className="text-ink font-medium">Unit {unit.number}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <span className="font-mono text-xs text-ink-muted">Unit {unit.number}</span>
            <h1 className="text-2xl font-semibold text-ink mt-0.5">{unit.name}</h1>
            {unit.topics.length > 0 && (
              <p className="text-sm text-ink-muted mt-1">{donePct}% topics done</p>
            )}
          </div>
          <form
            action={async (fd) => {
              "use server";
              const session2 = await (await import("@/lib/auth")).auth();
              if (!session2?.user?.id) throw new Error("Unauthorized");
              await setUnitStatus(id, unit.courseId, fd.get("status") as UnitStatus);
            }}
            className="flex items-center gap-2"
          >
            <select
              name="status"
              defaultValue={unit.status}
              onChange={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
              className="text-sm px-3 py-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
            >
              {(["NONE", "ONGOING", "REVISE", "DONE"] as UnitStatus[]).map((s) => (
                <option key={s} value={s}>{statusColors[s].label}</option>
              ))}
            </select>
          </form>
        </div>

        {/* Topics checklist */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-4">Topics</h2>
          <TopicChecklist
            unitId={unit.id}
            topics={unit.topics.map((t) => ({ id: t.id, text: t.text, done: t.done }))}
          />
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-4">Resources</h2>
          <ResourceTabs
            unitId={unit.id}
            resources={unit.resources.map((r) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              body: r.body,
              imageUrl: r.imageUrl,
              fileUrl: r.fileUrl,
              fileName: r.fileName,
            }))}
          />
        </section>
      </main>
    </div>
  );
}
