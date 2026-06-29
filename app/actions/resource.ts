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

async function deleteUploadThingFiles(keys: (string | null | undefined)[]) {
  const validKeys = keys.filter((k): k is string => !!k);
  if (validKeys.length === 0) return;
  try {
    const { UTApi } = await import("uploadthing/server");
    const utapi = new UTApi();
    await utapi.deleteFiles(validKeys);
  } catch {
    // Non-fatal: log but don't block the DB delete
    console.error("UploadThing cleanup failed for keys:", validKeys);
  }
}

export async function createResource(unitId: string, formData: FormData) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  const title = formData.get("title");
  if (typeof title !== "string" || !title.trim()) throw new Error("Title is required");
  const type = formData.get("type");
  if (typeof type !== "string") throw new Error("Type is required");

  await db.resource.create({
    data: {
      unitId,
      type: type as ResourceType,
      title: title.trim(),
      body: (formData.get("body") as string) || null,
      imageUrl: (formData.get("imageUrl") as string) || null,
      imageKey: (formData.get("imageKey") as string) || null,
      fileUrl: (formData.get("fileUrl") as string) || null,
      fileKey: (formData.get("fileKey") as string) || null,
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
      imageKey: (formData.get("imageKey") as string) || null,
      fileUrl: (formData.get("fileUrl") as string) || null,
      fileKey: (formData.get("fileKey") as string) || null,
      fileName: (formData.get("fileName") as string) || null,
    },
  });
  revalidatePath(`/unit/${unitId}`);
}

export async function deleteResource(id: string, unitId: string) {
  const userId = await requireUser();
  await verifyUnitOwner(unitId, userId);

  const resource = await db.resource.findUnique({
    where: { id },
    select: { imageKey: true, fileKey: true },
  });

  await db.resource.delete({ where: { id } });
  await deleteUploadThingFiles([resource?.imageKey, resource?.fileKey]);
  revalidatePath(`/unit/${unitId}`);
}

// Called when a unit or course is deleted — collects all resource keys first
export async function deleteUnitResources(unitId: string, userId: string) {
  const unit = await db.unit.findFirst({
    where: { id: unitId, course: { semester: { userId } } },
    include: { resources: { select: { imageKey: true, fileKey: true } } },
  });
  if (!unit) throw new Error("Not found");

  const keys = unit.resources.flatMap((r) => [r.imageKey, r.fileKey]);
  await db.unit.delete({ where: { id: unitId } });
  await deleteUploadThingFiles(keys);
}
