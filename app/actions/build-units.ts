"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseSyllabusFree } from "@/lib/parse-syllabus-free";

export async function buildUnitsFromSyllabus(courseId: string): Promise<{ created: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const course = await db.course.findFirst({
    where: { id: courseId, semester: { userId: session.user.id } },
    select: { id: true, syllabus: true, semesterId: true, _count: { select: { units: true } } },
  });
  if (!course) throw new Error("Course not found");
  if (!course.syllabus?.trim()) throw new Error("No syllabus text to parse");
  if (course._count.units > 0) throw new Error("Course already has units");

  const parsed = parseSyllabusFree(course.syllabus);

  // Use first subject that has units, or combine all units across subjects
  const allUnits = parsed.subjects.flatMap((s) => s.units);
  if (allUnits.length === 0) {
    throw new Error(
      "No units detected in the syllabus. Make sure the text contains 'Unit N: Title' headings.",
    );
  }

  // Deduplicate by number (keep first occurrence)
  const seen = new Set<number>();
  const units = allUnits.filter((u) => {
    if (seen.has(u.number)) return false;
    seen.add(u.number);
    return true;
  });

  for (const unit of units) {
    const created = await db.unit.create({
      data: {
        number: unit.number,
        name: unit.name,
        courseId,
        status: "NONE",
      },
    });
    if (unit.topics.length > 0) {
      await db.topic.createMany({
        data: unit.topics.map((t) => ({ text: t.text, unitId: created.id })),
      });
    }
  }

  revalidatePath(`/course/${courseId}`);
  return { created: units.length };
}
