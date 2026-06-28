"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function generateShareToken(courseId: string) {
  const userId = await requireUser();
  const course = await db.course.findFirst({
    where: { id: courseId, semester: { userId } },
  });
  if (!course) throw new Error("Not found");

  const token = randomBytes(16).toString("hex");
  await db.course.update({ where: { id: courseId }, data: { shareToken: token } });
  revalidatePath(`/course/${courseId}`);
  return token;
}

export async function revokeShareToken(courseId: string) {
  const userId = await requireUser();
  const course = await db.course.findFirst({
    where: { id: courseId, semester: { userId } },
  });
  if (!course) throw new Error("Not found");

  await db.course.update({ where: { id: courseId }, data: { shareToken: null } });
  revalidatePath(`/course/${courseId}`);
}
