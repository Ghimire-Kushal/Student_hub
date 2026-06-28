"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function verifyCourseOwner(courseId: string, userId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, semester: { userId } },
  });
  if (!course) throw new Error("Not found");
  return course;
}

export async function createUnit(courseId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  const last = await db.unit.findFirst({
    where: { courseId },
    orderBy: { number: "desc" },
  });

  await db.unit.create({
    data: {
      courseId,
      number: (last?.number ?? 0) + 1,
      name: formData.get("name") as string,
    },
  });
  revalidatePath(`/course/${courseId}`);
}

export async function updateUnit(id: string, courseId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  await db.unit.update({
    where: { id },
    data: { name: formData.get("name") as string },
  });
  revalidatePath(`/course/${courseId}`);
}

export async function deleteUnit(id: string, courseId: string) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  await db.unit.delete({ where: { id } });
  revalidatePath(`/course/${courseId}`);
}

export async function setUnitStatus(id: string, courseId: string, status: UnitStatus) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  await db.unit.update({ where: { id }, data: { status } });
  revalidatePath(`/course/${courseId}`);
}
