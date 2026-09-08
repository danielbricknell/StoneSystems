"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { str } from "@/lib/form-data";

export async function clockIn(jobId: string) {
  const session = await requireSession();

  // Wrapped in a transaction so the "is there an open entry" check and the
  // create happen against the same snapshot, closing most of the window for
  // a double-click/two-tab race to create two open entries for one user.
  const alreadyClockedIn = await prisma.$transaction(async (tx) => {
    const openEntry = await tx.timeEntry.findFirst({
      where: { userId: session.userId, clockOut: null },
    });

    if (openEntry) return true;

    await tx.timeEntry.create({
      data: { userId: session.userId, jobId, clockIn: new Date() },
    });

    return false;
  });

  if (alreadyClockedIn) {
    redirect(`/jobs/${jobId}?error=already-clocked-in`);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/time");
}

export async function clockOut(timeEntryId: string, jobId: string, formData: FormData) {
  const session = await requireSession();

  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id: timeEntryId } });
  if (entry.userId !== session.userId) {
    throw new Error("You can only clock yourself out");
  }

  const breakMinutes = Number(str(formData, "breakMinutes") ?? "0");

  await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: {
      clockOut: new Date(),
      breakMinutes: Number.isFinite(breakMinutes) ? breakMinutes : 0,
      billable: formData.get("billable") === "on",
      notes: str(formData, "notes"),
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/time");
}

export async function approveTimeEntry(timeEntryId: string) {
  const session = await requirePermission("approve_timesheets");
  const entry = await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { approvalStatus: "approved", approvedBy: session.userId, approvedAt: new Date() },
  });

  revalidatePath(`/jobs/${entry.jobId}`);
  revalidatePath("/time");
}

export async function rejectTimeEntry(timeEntryId: string) {
  const session = await requirePermission("approve_timesheets");
  const entry = await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { approvalStatus: "rejected", approvedBy: session.userId, approvedAt: new Date() },
  });

  revalidatePath(`/jobs/${entry.jobId}`);
  revalidatePath("/time");
}
