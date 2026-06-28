"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { importSyllabusIntoSemester } from "@/lib/syllabus-import";
import { routeParseSyllabus } from "@/lib/parse-syllabus-router";
import type { ParsedSyllabus } from "@/lib/syllabus-import";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function previewSyllabus(
  semesterId: string,
  rawText: string,
): Promise<ParsedSyllabus> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sem = await db.semester.findFirst({ where: { id: semesterId, userId: session.user.id } });
  if (!sem) throw new Error("Semester not found");

  return routeParseSyllabus(rawText);
}

export async function previewSyllabusFromPdfUrl(
  semesterId: string,
  pdfUrl: string,
): Promise<ParsedSyllabus> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sem = await db.semester.findFirst({ where: { id: semesterId, userId: session.user.id } });
  if (!sem) throw new Error("Semester not found");

  const { extractPdfText } = await import("@/lib/syllabus-import-pdf");
  const text = await extractPdfText(pdfUrl);
  return routeParseSyllabus(text);
}

export async function confirmImport(
  semesterId: string,
  syllabus: ParsedSyllabus,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await importSyllabusIntoSemester(syllabus, { semesterId, userId: session.user.id });
  revalidatePath(`/semester/${semesterId}`);
  revalidatePath(`/`); // refresh dashboard revision queue
}
