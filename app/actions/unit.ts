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

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) throw new Error("Unit name is required");

  await db.unit.create({
    data: {
      courseId,
      number: (last?.number ?? 0) + 1,
      name: name.trim(),
    },
  });
  revalidatePath(`/course/${courseId}`);
}

export async function updateUnit(id: string, courseId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) throw new Error("Unit name is required");

  await db.unit.update({
    where: { id },
    data: { name: name.trim() },
  });
  revalidatePath(`/course/${courseId}`);
}

export async function deleteUnit(id: string, courseId: string) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  // Collect upload keys before cascade delete removes them
  const unit = await db.unit.findUnique({
    where: { id },
    include: { resources: { select: { imageKey: true, fileKey: true } } },
  });
  const keys = unit?.resources.flatMap((r) => [r.imageKey, r.fileKey]).filter(Boolean) as string[];

  await db.unit.delete({ where: { id } });

  if (keys.length > 0) {
    try {
      const { UTApi } = await import("uploadthing/server");
      await new UTApi().deleteFiles(keys);
    } catch { /* non-fatal */ }
  }

  revalidatePath(`/course/${courseId}`);
}

export async function setUnitStatus(id: string, courseId: string, status: UnitStatus) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  const now = new Date();
  const data: Parameters<typeof db.unit.update>[0]["data"] = { status };

  if (status === "DONE") {
    const unit = await db.unit.findUnique({ where: { id }, select: { reviewIntervalDays: true } });
    const interval = unit?.reviewIntervalDays ?? 7;
    data.completedAt = now;
    data.nextReviewAt = new Date(now.getTime() + interval * 86400000);
  } else {
    // Clear review schedule if moved away from DONE
    data.completedAt = null;
    data.nextReviewAt = null;
  }

  await db.unit.update({ where: { id }, data });
  revalidatePath(`/course/${courseId}`);
  revalidatePath("/");
}

const INTERVAL_LADDER = [1, 3, 7, 14, 30];

export async function markUnitReviewed(id: string, courseId: string) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  const unit = await db.unit.findUnique({
    where: { id },
    select: { reviewIntervalDays: true },
  });
  if (!unit) throw new Error("Unit not found");

  const current = unit.reviewIntervalDays;
  const idx = INTERVAL_LADDER.indexOf(current);
  const next = INTERVAL_LADDER[Math.min(idx + 1, INTERVAL_LADDER.length - 1)];
  const nextReviewAt = new Date(Date.now() + next * 86400000);

  await db.unit.update({
    where: { id },
    data: { reviewIntervalDays: next, nextReviewAt },
  });
  revalidatePath("/");
}

export async function markUnitNeedsWork(id: string, courseId: string) {
  const userId = await requireUser();
  await verifyCourseOwner(courseId, userId);

  await db.unit.update({
    where: { id },
    data: { status: "REVISE", nextReviewAt: null, completedAt: null },
  });
  revalidatePath("/");
  revalidatePath(`/course/${courseId}`);
}
