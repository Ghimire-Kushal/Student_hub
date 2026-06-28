"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ResourceType } from "@prisma/client";
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

export async function createResource(unitId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  await db.resource.create({
    data: {
      unitId,
      type: formData.get("type") as ResourceType,
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || null,
      imageUrl: (formData.get("imageUrl") as string) || null,
      fileUrl: (formData.get("fileUrl") as string) || null,
      fileName: (formData.get("fileName") as string) || null,
    },
  });
  revalidatePath(`/unit/${unitId}`);
}

export async function updateResource(id: string, unitId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  await db.resource.update({
    where: { id },
    data: {
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || null,
      imageUrl: (formData.get("imageUrl") as string) || null,
      fileUrl: (formData.get("fileUrl") as string) || null,
      fileName: (formData.get("fileName") as string) || null,
    },
  });
  revalidatePath(`/unit/${unitId}`);
}

export async function deleteResource(id: string, unitId: string) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  await db.resource.delete({ where: { id } });
  revalidatePath(`/unit/${unitId}`);
}
