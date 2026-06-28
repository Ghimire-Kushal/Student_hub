import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { TopicChecklist } from "@/components/TopicChecklist";
import { ResourceTabs } from "@/components/ResourceTabs";
import { BackLink } from "@/components/BackLink";
import { UnitStatusSelect } from "@/components/UnitStatusSelect";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { PracticeButton } from "@/components/PracticeButton";

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

  const donePct = unit.topics.length
    ? Math.round((unit.topics.filter((t) => t.done).length / unit.topics.length) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar userEmail={session.user.email} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <BackLink href={`/course/${unit.course.id}`} label={unit.course.name} />

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
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap" id="unit-header">
          <div>
            <span className="font-mono text-xs text-ink-muted">Unit {unit.number}</span>
            <h1 className="text-2xl font-semibold text-ink mt-0.5">{unit.name}</h1>
            {unit.topics.length > 0 && (
              <p className="text-sm text-ink-muted mt-1">{donePct}% topics done</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PracticeButton questions={unit.resources.filter((r) => r.type === "PAST_QUESTIONS").map((r) => ({ id: r.id, title: r.title, body: r.body }))} />
            <ExportPdfButton href={`/print/unit/${unit.id}`} label="Export PDF" />
          <UnitStatusSelect unitId={unit.id} courseId={unit.courseId} status={unit.status} />
          </div>
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
              tags: r.tags,
            }))}
          />
        </section>
      </main>
    </div>
  );
}
