"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function verifyUnitOwner(unitId: string, userId: string) {
  const unit = await db.unit.findFirst({
    where: { id: unitId, course: { semester: { userId } } },
  });
  if (!unit) throw new Error("Not found");
  return unit;
}

export async function createTopic(unitId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  await db.topic.create({
    data: { unitId, text: formData.get("text") as string },
  });
  revalidatePath(`/unit/${unitId}`);
}

export async function toggleTopic(id: string, unitId: string, done: boolean) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  await db.topic.update({ where: { id }, data: { done } });
  revalidatePath(`/unit/${unitId}`);
}

export async function deleteTopic(id: string, unitId: string) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  await db.topic.delete({ where: { id } });
  revalidatePath(`/unit/${unitId}`);
}
