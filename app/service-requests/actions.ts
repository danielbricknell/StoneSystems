"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { JobType, ServiceRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function markServiceRequestReviewed(requestId: string) {
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: ServiceRequestStatus.reviewed },
  });

  revalidatePath(`/service-requests/${requestId}`);
  revalidatePath("/service-requests");
}

export async function markServiceRequestSpam(requestId: string) {
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: ServiceRequestStatus.spam },
  });

  revalidatePath(`/service-requests/${requestId}`);
  revalidatePath("/service-requests");
}

export async function convertServiceRequest(requestId: string, formData: FormData) {
  const request = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.convertedJobId) throw new Error("This request has already been converted");

  const customerIdInput = str(formData, "customerId");
  const propertyIdInput = str(formData, "propertyId");
  const title = str(formData, "title");
  const type = str(formData, "type") as JobType | null;

  if (!title || !type) throw new Error("Title and type are required");

  const job = await prisma.$transaction(async (tx) => {
    let customerId = customerIdInput;
    if (!customerId) {
      const newCustomer = await tx.customer.create({
        data: {
          name: request.customerName ?? "Unknown customer",
          email: request.customerEmail,
          phone: request.customerPhone,
        },
      });
      customerId = newCustomer.id;
    }

    let propertyId = propertyIdInput;
    if (!propertyId) {
      const newProperty = await tx.property.create({
        data: {
          customerId,
          address: request.propertyAddress,
        },
      });
      propertyId = newProperty.id;
    }

    const newJob = await tx.job.create({
      data: {
        customerId,
        propertyId,
        title,
        type,
        description: request.description,
      },
    });

    await tx.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: ServiceRequestStatus.converted,
        matchedCustomerId: customerId,
        convertedJobId: newJob.id,
      },
    });

    return newJob;
  });

  revalidatePath(`/service-requests/${requestId}`);
  revalidatePath("/service-requests");
  revalidatePath("/jobs");
  revalidatePath("/customers");
  redirect(`/jobs/${job.id}`);
}
