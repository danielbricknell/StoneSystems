"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DepotType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { str } from "@/lib/form-data";

export async function createDepot(formData: FormData) {
  await requireSession();

  const name = str(formData, "name");
  const type = str(formData, "type") as DepotType | null;

  if (!name || !type) throw new Error("Name and type are required");

  await prisma.depot.create({
    data: {
      name,
      type,
      address: str(formData, "address"),
      assignedUserId: str(formData, "assignedUserId"),
    },
  });

  revalidatePath("/depots");
  revalidatePath("/schedule");
  redirect("/depots");
}
