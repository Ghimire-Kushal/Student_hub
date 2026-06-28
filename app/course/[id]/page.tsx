import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { UnitList } from "@/components/UnitList";
import { BackLink } from "@/components/BackLink";
import { ExportPdfButton } from "@/components/ExportPdfButton";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const course = await db.course.findFirst({
    where: { id, semester: { userId: session.user.id } },
    include: {
      semester: true,
      units: { orderBy: { number: "asc" } },
    },
  });

  if (!course) notFound();

  const daysLeft = course.examDate
    ? Math.ceil((course.examDate.getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen">
      <TopBar userEmail={session.user.email} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <BackLink href={`/semester/${course.semester.id}`} label={course.semester.name} />

        {/* Breadcrumb */}
        <nav className="text-sm text-ink-muted mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-ink">Dashboard</Link>
          <span>/</span>
          <Link href={`/semester/${course.semester.id}`} className="hover:text-ink">{course.semester.name}</Link>
          <span>/</span>
          <span className="text-ink font-medium">{course.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
            <div />
            <ExportPdfButton href={`/print/course/${course.id}`} label="Export PDF" />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-10 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: course.color }} />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm text-ink-muted">{course.code}</span>
                {daysLeft !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${daysLeft <= 7 ? "bg-red-50 border-red-200 text-red-700" : "bg-accent-light border-accent/20 text-accent"}`}>
                    Exam in {daysLeft > 0 ? `${daysLeft}d` : "passed"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-ink mt-0.5">{course.name}</h1>
              <p className="text-sm text-ink-muted">{course.credits} credits · {course.lockOrder ? "Chapters unlock in order" : "Free order"}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <UnitList
          course={{
            id: course.id,
            lockOrder: course.lockOrder,
            syllabus: course.syllabus,
            semesterId: course.semester.id,
          }}
          units={course.units.map((u) => ({
            id: u.id,
            number: u.number,
            name: u.name,
            status: u.status,
            courseId: u.courseId,
          }))}
        />
      </main>
    </div>
  );
}
