"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function clockIn(jobId: string) {
  const session = await requireSession();

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId: session.userId, clockOut: null },
  });

  if (openEntry) {
    redirect(`/jobs/${jobId}?error=already-clocked-in`);
  }

  await prisma.timeEntry.create({
    data: { userId: session.userId, jobId, clockIn: new Date() },
  });

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
