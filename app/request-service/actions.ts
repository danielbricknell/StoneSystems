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

export async function submitServiceRequest(formData: FormData) {
  const customerName = str(formData, "customerName");
  const description = str(formData, "description");

  if (!customerName || !description) {
    redirect("/request-service?error=1");
  }

  await prisma.serviceRequest.create({
    data: {
      source: "web_form",
      customerName,
      customerEmail: str(formData, "customerEmail"),
      customerPhone: str(formData, "customerPhone"),
      propertyAddress: str(formData, "propertyAddress"),
      description,
      receivedAt: new Date(),
    },
  });

  revalidatePath("/service-requests");
  redirect("/request-service?submitted=1");
}
