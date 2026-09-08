"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { str } from "@/lib/form-data";

export async function createUser(formData: FormData) {
  await requirePermission("manage_users");

  const fullName = str(formData, "fullName");
  const email = str(formData, "email");
  const password = str(formData, "password");
  const roleId = str(formData, "roleId");
  const depotId = str(formData, "depotId");

  if (!fullName || !email || !password || !roleId || !depotId) {
    throw new Error("Name, email, password, role, and depot are required");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      phone: str(formData, "phone"),
      roleId,
      depotId,
    },
  });

  revalidatePath("/users");
  redirect("/users");
}
