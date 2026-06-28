"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createCourse(semesterId: string, formData: FormData) {
  const userId = await requireUser();
  const semester = await db.semester.findFirst({ where: { id: semesterId, userId } });
  if (!semester) throw new Error("Not found");

  await db.course.create({
    data: {
      semesterId,
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      credits: Number(formData.get("credits") ?? 3),
      examDate: formData.get("examDate") ? new Date(formData.get("examDate") as string) : null,
      syllabus: (formData.get("syllabus") as string) || null,
      color: (formData.get("color") as string) || "#8B5CF6",
      lockOrder: formData.get("lockOrder") === "on",
    },
  });
  revalidatePath(`/semester/${semesterId}`);
}

export async function updateCourse(id: string, semesterId: string, formData: FormData) {
  const userId = await requireUser();
  const course = await db.course.findFirst({
    where: { id, semester: { userId } },
  });
  if (!course) throw new Error("Not found");

  await db.course.update({
    where: { id },
    data: {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      credits: Number(formData.get("credits") ?? 3),
      examDate: formData.get("examDate") ? new Date(formData.get("examDate") as string) : null,
      syllabus: (formData.get("syllabus") as string) || null,
      color: (formData.get("color") as string) || "#8B5CF6",
      lockOrder: formData.get("lockOrder") === "on",
    },
  });
  revalidatePath(`/semester/${semesterId}`);
}

export async function updateSyllabus(id: string, syllabus: string) {
  const userId = await requireUser();
  const course = await db.course.findFirst({
    where: { id, semester: { userId } },
    select: { id: true, semesterId: true },
  });
  if (!course) throw new Error("Not found");

  await db.course.update({
    where: { id },
    data: { syllabus: syllabus.trim() || null },
  });
  revalidatePath(`/course/${id}`);
}

export async function deleteCourse(id: string, semesterId: string) {
  const userId = await requireUser();
  const course = await db.course.findFirst({
    where: { id, semester: { userId } },
  });
  if (!course) throw new Error("Not found");

  await db.course.delete({ where: { id } });
  revalidatePath(`/semester/${semesterId}`);
}
