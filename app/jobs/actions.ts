"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AttachmentCategory, JobPriority, JobStatus, JobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { saveUploadedFile } from "@/lib/storage";
import { dateOrNull, str } from "@/lib/form-data";

export async function createJob(formData: FormData) {
  await requirePermission("edit_jobs");

  const customerId = str(formData, "customerId");
  const propertyId = str(formData, "propertyId");
  const title = str(formData, "title");
  const type = str(formData, "type") as JobType | null;

  if (!customerId || !propertyId || !title || !type) {
    throw new Error("Customer, property, title, and type are required");
  }

  const job = await prisma.job.create({
    data: {
      customerId,
      propertyId,
      title,
      type,
      priority: (str(formData, "priority") as JobPriority | null) ?? undefined,
      description: str(formData, "description"),
      scheduledStart: dateOrNull(formData, "scheduledStart"),
      scheduledEnd: dateOrNull(formData, "scheduledEnd"),
    },
  });

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function addJobLineItem(jobId: string, formData: FormData) {
  await requirePermission("edit_jobs");

  const description = str(formData, "description");
  const quantityRaw = str(formData, "quantity");
  const unitPriceRaw = str(formData, "unitPrice");
  const inventoryItemId = str(formData, "inventoryItemId");

  if (!description || !quantityRaw || !unitPriceRaw) {
    throw new Error("Description, quantity, and unit price are required");
  }

  const quantity = Number(quantityRaw);
  const unitPrice = Number(unitPriceRaw);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    throw new Error("Description, quantity, and unit price are required");
  }

  await prisma.jobLineItem.create({
    data: {
      jobId,
      inventoryItemId,
      description,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateJobStatus(jobId: string, formData: FormData) {
  await requirePermission("edit_jobs");

  const status = formData.get("status");
  if (typeof status !== "string") return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: status as JobStatus },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}

export async function scheduleJob(jobId: string, formData: FormData) {
  await requirePermission("edit_jobs");

  const startTime = dateOrNull(formData, "startTime");
  const endTime = dateOrNull(formData, "endTime");
  const userIds = formData.getAll("userIds").filter((v): v is string => typeof v === "string");

  if (!startTime || !endTime || userIds.length === 0) {
    throw new Error("Start time, end time, and at least one technician are required");
  }

  await prisma.appointment.createMany({
    data: userIds.map((userId) => ({ jobId, userId, startTime, endTime })),
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

export async function removeAppointment(appointmentId: string, jobId: string) {
  await requirePermission("edit_jobs");

  await prisma.appointment.delete({ where: { id: appointmentId } });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

export async function addJobNote(jobId: string, formData: FormData) {
  const session = await requireSession();
  const body = str(formData, "body");

  if (!body) throw new Error("Note body is required");

  await prisma.jobNote.create({
    data: { jobId, userId: session.userId, body },
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function addJobAttachment(jobId: string, formData: FormData) {
  const session = await requireSession();
  const file = formData.get("file");
  const category = str(formData, "category") as AttachmentCategory | null;

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required");
  }

  const fileUrl = await saveUploadedFile(file);

  await prisma.jobAttachment.create({
    data: {
      jobId,
      fileUrl,
      uploadedBy: session.userId,
      category,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
}
