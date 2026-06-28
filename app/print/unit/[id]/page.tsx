import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { MarkdownMath } from "@/components/MarkdownMath";

export default async function PrintUnitPage({ params }: { params: Promise<{ id: string }> }) {
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

  const printTypes = ["NOTES", "KEY_NOTES", "PAST_QUESTIONS"] as const;
  const relevantResources = unit.resources.filter((r) => printTypes.includes(r.type as typeof printTypes[number]));
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
        body { font-family: system-ui, sans-serif; background: white; color: #111; margin: 0; }
        .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg shadow hover:bg-purple-700"
        >
          Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg shadow hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      <div className="container">
        {/* Header */}
        <div className="mb-8 pb-4 border-b-2 border-gray-300">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {unit.course.semester.name} · {unit.course.code} {unit.course.name}
          </p>
          <h1 className="text-2xl font-bold mt-1">Unit {unit.number}: {unit.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Exported {today}</p>
        </div>

        {unit.topics.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Topics</h2>
            <ul className="list-disc pl-5 text-sm space-y-0.5">
              {unit.topics.map((t) => (
                <li key={t.id} style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "#aaa" : "inherit" }}>
                  {t.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {relevantResources.map((r) => (
          <div key={r.id} className="mb-6 pl-3 border-l-2 border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              {r.type.replace("_", " ")} — {r.title}
            </p>
            {r.body && <MarkdownMath>{r.body}</MarkdownMath>}
            {r.fileUrl && (
              <p className="text-xs text-gray-400 mt-1">📎 {r.fileName ?? r.fileUrl}</p>
            )}
          </div>
        ))}

        {relevantResources.length === 0 && (
          <p className="text-sm text-gray-400 italic">No notes, key notes, or questions for this unit.</p>
        )}
      </div>
    </>
  );
}
