"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { str } from "@/lib/form-data";

export async function createCustomer(formData: FormData) {
  await requireSession();

  const name = str(formData, "name");
  if (!name) throw new Error("Customer name is required");

  const customer = await prisma.customer.create({
    data: {
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      billingAddress: str(formData, "billingAddress"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function addProperty(customerId: string, formData: FormData) {
  await requireSession();

  await prisma.property.create({
    data: {
      customerId,
      label: str(formData, "label"),
      address: str(formData, "address"),
      accessNotes: str(formData, "accessNotes"),
    },
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function addContact(customerId: string, formData: FormData) {
  await requireSession();

  const name = str(formData, "name");
  if (!name) throw new Error("Contact name is required");

  const propertyIds = formData
    .getAll("propertyIds")
    .filter((value): value is string => typeof value === "string");

  await prisma.contact.create({
    data: {
      customerId,
      name,
      role: str(formData, "role"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      isPrimary: formData.get("isPrimary") === "on",
      contactProperties:
        propertyIds.length > 0
          ? { create: propertyIds.map((propertyId) => ({ propertyId })) }
          : undefined,
    },
  });

  revalidatePath(`/customers/${customerId}`);
}
