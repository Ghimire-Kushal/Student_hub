import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { MarkdownMath } from "@/components/MarkdownMath";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const course = await db.course.findUnique({
    where: { shareToken: token },
    include: {
      semester: { select: { name: true } },
      units: {
        orderBy: { number: "asc" },
        include: {
          topics: { orderBy: { createdAt: "asc" } },
          resources: {
            where: { type: { in: ["NOTES", "KEY_NOTES", "PAST_QUESTIONS"] } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!course) notFound();

  return (
    <div className="min-h-screen bg-paper">
      {/* Read-only header */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-serif font-semibold text-ink">Study Tracker</span>
          <span className="text-xs text-ink-muted border border-border rounded-full px-3 py-1">Read-only view</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Course header */}
        <div className="mb-8 pb-6 border-b border-border">
          <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">{course.semester.name}</p>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
            <div>
              <span className="font-mono text-sm text-ink-muted">{course.code}</span>
              <h1 className="text-2xl font-semibold text-ink">{course.name}</h1>
              <p className="text-sm text-ink-muted">{course.credits} credits</p>
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="space-y-8">
          {course.units.map((unit) => (
            <div key={unit.id}>
              <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <span className="font-mono text-sm text-ink-muted">U{unit.number}</span>
                {unit.name}
              </h2>

              {unit.topics.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Topics</p>
                  <ul className="space-y-1">
                    {unit.topics.map((t) => (
                      <li key={t.id} className={`flex items-center gap-2 text-sm ${t.done ? "line-through text-ink-muted" : "text-ink"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.done ? "bg-green-400" : "bg-border"}`} />
                        {t.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unit.resources.map((r) => (
                <div key={r.id} className="mb-4 bg-white border border-border rounded-xl px-4 py-3">
                  <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">
                    {r.type.replace("_", " ")} · {r.title}
                  </p>
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {r.tags.map((t) => (
                        <span key={t} className="text-xs px-1.5 py-0.5 bg-accent-light text-accent rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  {r.body && <MarkdownMath>{r.body}</MarkdownMath>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
