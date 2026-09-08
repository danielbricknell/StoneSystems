"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function createInvoice(jobId: string) {
  await requirePermission("view_financials");

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { lineItems: true },
  });

  const total = job.lineItems.reduce((sum, item) => sum + item.lineTotal.toNumber(), 0);

  // Checked inside the transaction (rather than as a separate query before
  // it) so a double form submit can't have both requests pass the check
  // before either commits its create.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({ where: { jobId } });
    if (existing) throw new Error("This job already has an invoice");

    await tx.invoice.create({ data: { jobId, total } });
    await tx.job.update({ where: { id: jobId }, data: { status: JobStatus.invoiced } });
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/invoices");
}

export async function updateInvoiceStatus(invoiceId: string, jobId: string, formData: FormData) {
  await requirePermission("view_financials");

  const status = formData.get("status");
  if (typeof status !== "string") return;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: status as InvoiceStatus },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/invoices");
}
