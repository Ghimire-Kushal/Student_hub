import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { CourseCard } from "@/components/CourseCard";
import { AddCourseButton } from "@/components/AddCourseButton";
import { BackLink } from "@/components/BackLink";

export default async function SemesterPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const semester = await db.semester.findFirst({
    where: { id, userId: session.user.id },
    include: {
      courses: {
        include: { units: { select: { status: true }, orderBy: { number: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!semester) notFound();

  const daysLeft = semester.terminalDate
    ? Math.ceil((semester.terminalDate.getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen">
      <TopBar userEmail={session.user.email} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <BackLink href="/" label="Dashboard" />

        {/* Breadcrumb */}
        <nav className="text-sm text-ink-muted mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-ink transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-ink font-medium">{semester.name}</span>
        </nav>

        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{semester.name}</h1>
            {daysLeft !== null && (
              <p className={`text-sm mt-1 ${daysLeft <= 14 ? "text-red-600 font-semibold" : "text-ink-muted"}`}>
                Terminal exam: {semester.terminalDate?.toLocaleDateString()} ({daysLeft > 0 ? `${daysLeft} days` : "passed"})
              </p>
            )}
          </div>
          <AddCourseButton semesterId={semester.id} />
        </div>

        {semester.courses.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <p className="text-lg mb-2">No subjects yet.</p>
            <p className="text-sm">Add your first subject to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {semester.courses.map((course) => {
              const total = course.units.length;
              const done = course.units.filter((u) => u.status === "DONE").length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    code: course.code,
                    name: course.name,
                    credits: course.credits,
                    examDate: course.examDate?.toISOString() ?? null,
                    color: course.color,
                    lockOrder: course.lockOrder,
                    syllabus: course.syllabus,
                    semesterId: semester.id,
                    units: course.units,
                    pct,
                  }}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
