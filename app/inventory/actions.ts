"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { numberOrNull, str } from "@/lib/form-data";

export async function createInventoryItem(formData: FormData) {
  await requireSession();

  const name = str(formData, "name");
  if (!name) throw new Error("Item name is required");

  await prisma.inventoryItem.create({
    data: {
      name,
      sku: str(formData, "sku"),
      unitCost: numberOrNull(formData, "unitCost") ?? undefined,
      unitPrice: numberOrNull(formData, "unitPrice") ?? undefined,
      quantityOnHand: numberOrNull(formData, "quantityOnHand") ?? undefined,
      depotId: str(formData, "depotId"),
    },
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}
