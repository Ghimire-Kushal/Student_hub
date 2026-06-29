"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createSemester(formData: FormData) {
  const userId = await requireUser();
  const name = formData.get("name") as string;
  const terminalDate = formData.get("terminalDate") as string;

  await db.semester.create({
    data: {
      name,
      terminalDate: terminalDate ? new Date(terminalDate) : null,
      userId,
    },
  });
  revalidatePath("/");
}

export async function updateSemester(id: string, formData: FormData) {
  const userId = await requireUser();
  const name = formData.get("name") as string;
  const terminalDate = formData.get("terminalDate") as string;
  const examDate = terminalDate ? new Date(terminalDate) : null;

  await db.semester.updateMany({
    where: { id, userId },
    data: { name, terminalDate: examDate },
  });

  // Propagate terminal date to all courses in this semester
  await db.course.updateMany({
    where: { semester: { id, userId } },
    data: { examDate },
  });

  revalidatePath("/");
  revalidatePath(`/semester/${id}`);
}

export async function deleteSemester(id: string) {
  const userId = await requireUser();
  await db.semester.deleteMany({ where: { id, userId } });
  revalidatePath("/");
}

export async function archiveSemester(id: string, archived: boolean) {
  const userId = await requireUser();
  await db.semester.updateMany({ where: { id, userId }, data: { archived } });
  revalidatePath("/");
}
