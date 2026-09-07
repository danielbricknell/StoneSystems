"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { establishSession } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    redirect("/login?error=1");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !user.active) {
    redirect("/login?error=1");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    redirect("/login?error=1");
  }

  await establishSession(user.id);
  redirect("/");
}
