"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function addTag(resourceId: string, unitId: string, tag: string) {
  const userId = await requireUser();
  const resource = await db.resource.findFirst({
    where: { id: resourceId, unit: { course: { semester: { userId } } } },
    select: { tags: true },
  });
  if (!resource) throw new Error("Not found");

  const clean = tag.trim().toLowerCase().replace(/\s+/g, "-");
  if (!clean || resource.tags.includes(clean)) return;

  await db.resource.update({
    where: { id: resourceId },
    data: { tags: [...resource.tags, clean] },
  });
  revalidatePath(`/unit/${unitId}`);
}

export async function removeTag(resourceId: string, unitId: string, tag: string) {
  const userId = await requireUser();
  const resource = await db.resource.findFirst({
    where: { id: resourceId, unit: { course: { semester: { userId } } } },
    select: { tags: true },
  });
  if (!resource) throw new Error("Not found");

  await db.resource.update({
    where: { id: resourceId },
    data: { tags: resource.tags.filter((t: string) => t !== tag) },
  });
  revalidatePath(`/unit/${unitId}`);
}
