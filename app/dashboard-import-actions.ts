"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parseSyllabus, importSyllabusIntoSemester } from "@/lib/syllabus-import";
import type { ParsedSyllabus } from "@/lib/syllabus-import";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function previewSyllabusFromText(rawText: string): Promise<ParsedSyllabus> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return parseSyllabus(rawText);
}

export interface ConfirmDashboardImportArgs {
  syllabus: ParsedSyllabus;
  semesterId?: string;
  newSemesterName?: string;
}

export async function confirmDashboardImport(
  args: ConfirmDashboardImportArgs,
): Promise<{ semesterId: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { semesterId, newSemesterName } = args;

  if (semesterId) {
    const owns = await db.semester.findFirst({ where: { id: semesterId, userId: session.user.id } });
    if (!owns) throw new Error("Semester not found or access denied.");
  }

  const result = await importSyllabusIntoSemester(args.syllabus, {
    semesterId,
    newSemesterName,
    userId: session.user.id,
  });

  revalidatePath("/");
  revalidatePath(`/semester/${result.semesterId}`);

  return result;
}

export async function getUserSemesters() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return db.semester.findMany({
    where: { userId: session.user.id, archived: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}
