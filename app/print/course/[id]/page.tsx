import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { MarkdownMath } from "@/components/MarkdownMath";

export default async function PrintCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const course = await db.course.findFirst({
    where: { id, semester: { userId: session.user.id } },
    include: {
      semester: true,
      units: {
        orderBy: { number: "asc" },
        include: {
          topics: { orderBy: { createdAt: "asc" } },
          resources: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!course) notFound();

  const printTypes = ["NOTES", "KEY_NOTES", "PAST_QUESTIONS"] as const;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
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
          <p className="text-xs text-gray-500 uppercase tracking-wide">{course.semester.name}</p>
          <h1 className="text-2xl font-bold mt-1">{course.code} — {course.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Exported {today}</p>
        </div>

        {course.units.map((unit, idx) => {
          const relevantResources = unit.resources.filter((r) => printTypes.includes(r.type as typeof printTypes[number]));
          return (
            <div key={unit.id} className={idx > 0 ? "page-break mt-8" : "mt-0"}>
              <h2 className="text-lg font-bold mb-3 pb-2 border-b border-gray-200">
                Unit {unit.number}: {unit.name}
              </h2>

              {unit.topics.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Topics</h3>
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
                <div key={r.id} className="mb-4 pl-2 border-l-2 border-gray-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    {r.type.replace("_", " ")} — {r.title}
                  </p>
                  {r.body && <MarkdownMath>{r.body}</MarkdownMath>}
                  {r.fileUrl && (
                    <p className="text-xs text-gray-400 mt-1">📎 {r.fileName ?? r.fileUrl}</p>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
