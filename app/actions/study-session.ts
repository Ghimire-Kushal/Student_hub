"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function logStudySession(minutes: number, courseId?: string) {
  const userId = await requireUser();
  if (minutes <= 0 || minutes > 1440) throw new Error("Invalid duration");

  if (courseId) {
    const course = await db.course.findFirst({ where: { id: courseId, semester: { userId } } });
    if (!course) throw new Error("Course not found");
  }

  await db.studySession.create({
    data: { userId, minutes, courseId: courseId ?? null },
  });
  revalidatePath("/");
}
