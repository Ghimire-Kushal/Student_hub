"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function updateName(name: string) {
  const userId = await requireUser();
  name = name.trim();
  if (!name) throw new Error("Name cannot be empty.");
  await db.user.update({ where: { id: userId }, data: { name } });
  revalidatePath("/profile");
}

export async function updateEmail(email: string, currentPassword: string) {
  const userId = await requireUser();
  email = email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Invalid email address.");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("Current password is incorrect.");

  const taken = await db.user.findFirst({ where: { email, NOT: { id: userId } } });
  if (taken) throw new Error("That email is already in use.");

  await db.user.update({ where: { id: userId }, data: { email } });
  revalidatePath("/profile");
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const userId = await requireUser();
  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("Current password is incorrect.");

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { password: hashed } });
  revalidatePath("/profile");
}

export async function getProfile() {
  const userId = await requireUser();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, createdAt: true },
  });
  return user;
}
