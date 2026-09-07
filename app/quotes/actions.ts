"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { JobType, Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dateOrNull(formData: FormData, key: string): Date | null {
  const value = str(formData, key);
  return value ? new Date(value) : null;
}

export async function createQuote(formData: FormData) {
  const session = await requirePermission("view_financials");

  const customerId = str(formData, "customerId");
  if (!customerId) throw new Error("Customer is required");

  const quote = await prisma.quote.create({
    data: {
      customerId,
      propertyId: str(formData, "propertyId"),
      notes: str(formData, "notes"),
      expiresAt: dateOrNull(formData, "expiresAt"),
      createdBy: session.userId,
      total: 0,
    },
  });

  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

export async function addQuoteLineItem(quoteId: string, formData: FormData) {
  await requirePermission("view_financials");

  const description = str(formData, "description");
  const quantity = Number(str(formData, "quantity"));
  const unitPrice = Number(str(formData, "unitPrice"));
  const inventoryItemId = str(formData, "inventoryItemId");

  if (!description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    throw new Error("Description, quantity, and unit price are required");
  }

  const lineTotal = quantity * unitPrice;

  await prisma.$transaction([
    prisma.quoteLineItem.create({
      data: { quoteId, inventoryItemId, description, quantity, unitPrice, lineTotal },
    }),
    prisma.quote.update({
      where: { id: quoteId },
      data: { total: { increment: lineTotal } },
    }),
  ]);

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
}

export async function updateQuoteStatus(quoteId: string, formData: FormData) {
  await requirePermission("view_financials");

  const status = formData.get("status");
  if (typeof status !== "string") return;

  const data: Prisma.QuoteUpdateInput = { status: status as QuoteStatus };
  if (status === "sent") {
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (quote && !quote.sentAt) data.sentAt = new Date();
  }

  await prisma.quote.update({ where: { id: quoteId }, data });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
}

export async function convertQuoteToJob(quoteId: string) {
  await requirePermission("view_financials");

  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { lineItems: true },
  });

  if (quote.jobId) throw new Error("Quote has already been converted");

  const propertyId = quote.propertyId;
  if (!propertyId) throw new Error("Quote needs a property before it can convert to a job");

  const job = await prisma.$transaction(async (tx) => {
    const newJob = await tx.job.create({
      data: {
        customerId: quote.customerId,
        propertyId,
        type: JobType.small_job,
        title: quote.notes ? quote.notes.slice(0, 80) : "Converted from quote",
      },
    });

    if (quote.lineItems.length > 0) {
      await tx.jobLineItem.createMany({
        data: quote.lineItems.map((item) => ({
          jobId: newJob.id,
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      });
    }

    await tx.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.converted, jobId: newJob.id },
    });

    return newJob;
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}
