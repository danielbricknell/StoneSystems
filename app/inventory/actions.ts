"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createInventoryItem(formData: FormData) {
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
