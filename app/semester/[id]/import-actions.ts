"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { extractPdfText, parseSyllabus, importSyllabusIntoSemester } from "@/lib/syllabus-import";
import type { ParsedSyllabus } from "@/lib/syllabus-import";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function previewSyllabus(
  semesterId: string,
  rawText: string,
): Promise<ParsedSyllabus> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Verify semester belongs to user
  const sem = await db.semester.findFirst({ where: { id: semesterId, userId: session.user.id } });
  if (!sem) throw new Error("Semester not found");

  return parseSyllabus(rawText);
}

export async function previewSyllabusFromPdf(
  semesterId: string,
  pdfUrl: string,
): Promise<ParsedSyllabus> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sem = await db.semester.findFirst({ where: { id: semesterId, userId: session.user.id } });
  if (!sem) throw new Error("Semester not found");

  const text = await extractPdfText(pdfUrl);
  return parseSyllabus(text);
}

export async function confirmImport(
  semesterId: string,
  syllabus: ParsedSyllabus,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await importSyllabusIntoSemester(syllabus, semesterId, session.user.id);
  revalidatePath(`/semester/${semesterId}`);
}
