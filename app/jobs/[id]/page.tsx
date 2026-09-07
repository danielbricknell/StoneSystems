import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatEnum } from "@/lib/format";
import {
  addJobAttachment,
  addJobLineItem,
  addJobNote,
  removeAppointment,
  scheduleJob,
  updateJobStatus,
} from "../actions";
import { clockIn, clockOut } from "../../time/actions";
import { createInvoice, updateInvoiceStatus } from "../../invoices/actions";
import { LineItemForm } from "@/components/LineItemForm";

const STATUSES = [
  "new",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "closed",
] as const;

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;

const ATTACHMENT_CATEGORIES = [
  "before_photo",
  "after_photo",
  "signature",
  "document",
] as const;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

const SYSTEM_USER_EMAIL = "system@internal.local";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const session = await requireSession();

  const [job, technicians, openEntry, inventoryItems, canViewFinancials, canEditJobs] =
    await Promise.all([
    prisma.job.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        property: true,
        lineItems: { orderBy: { createdAt: "asc" } },
        appointments: { orderBy: { startTime: "asc" }, include: { user: true } },
        timeEntries: { orderBy: { clockIn: "desc" }, include: { user: true } },
        invoices: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" }, include: { user: true } },
        attachments: { orderBy: { createdAt: "desc" }, include: { uploader: true } },
      },
    }),
    prisma.user.findMany({
      where: { active: true, email: { not: SYSTEM_USER_EMAIL } },
      orderBy: { fullName: "asc" },
    }),
    prisma.timeEntry.findFirst({
      where: { userId: session.userId, clockOut: null },
      include: { job: true },
    }),
    prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),
    hasPermission(session.userId, "view_financials"),
    hasPermission(session.userId, "edit_jobs"),
  ]);

  if (!job) notFound();

  const updateStatusForJob = updateJobStatus.bind(null, job.id);
  const addLineItemForJob = addJobLineItem.bind(null, job.id);
  const scheduleThisJob = scheduleJob.bind(null, job.id);
  const clockInToThisJob = clockIn.bind(null, job.id);
  const createInvoiceForJob = createInvoice.bind(null, job.id);
  const addNoteForJob = addJobNote.bind(null, job.id);
  const addAttachmentForJob = addJobAttachment.bind(null, job.id);
  const total = job.lineItems.reduce((sum, item) => sum + item.lineTotal.toNumber(), 0);
  const inventoryOptions = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    unitPrice: item.unitPrice ? item.unitPrice.toNumber() : null,
  }));

  return (
    <main>
      <div className="page-header">
        <h1>{job.title}</h1>
        <Link href="/jobs">← All jobs</Link>
      </div>

      <div className="card">
        <p className="section-title">Details</p>
        <p className="meta">
          Customer: <Link href={`/customers/${job.customer.id}`}>{job.customer.name}</Link>
        </p>
        <p className="meta">
          Property: {job.property.label ?? job.property.address ?? "—"}
        </p>
        <p className="meta">Type: {formatEnum(job.type)}</p>
        <p className="meta">Priority: {job.priority ? formatEnum(job.priority) : "—"}</p>
        <p className="meta">
          Scheduled:{" "}
          {job.scheduledStart ? job.scheduledStart.toLocaleString() : "—"}
          {job.scheduledEnd ? ` – ${job.scheduledEnd.toLocaleString()}` : ""}
        </p>
        {job.description && <p className="meta">Description: {job.description}</p>}
      </div>

      <div className="card">
        <p className="section-title">Status</p>
        <p className="meta">
          Current: <span className="badge">{formatEnum(job.status)}</span>
        </p>
        {canEditJobs && (
          <form action={updateStatusForJob} className="form-inline">
            <div className="field">
              <label htmlFor="status">Change status</label>
              <select id="status" name="status" defaultValue={job.status}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatEnum(status)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-secondary">
              Update Status
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <p className="section-title">Scheduling</p>
        {job.appointments.length === 0 ? (
          <p className="empty">Not scheduled yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Technician</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                {canEditJobs && <th></th>}
              </tr>
            </thead>
            <tbody>
              {job.appointments.map((appointment) => {
                const removeThisAppointment = removeAppointment.bind(
                  null,
                  appointment.id,
                  job.id,
                );
                return (
                  <tr key={appointment.id}>
                    <td>{appointment.user.fullName}</td>
                    <td>{appointment.startTime.toLocaleString()}</td>
                    <td>{appointment.endTime.toLocaleString()}</td>
                    <td>
                      <span className="badge">{formatEnum(appointment.status)}</span>
                    </td>
                    {canEditJobs && (
                      <td>
                        <form action={removeThisAppointment}>
                          <button type="submit" className="btn-danger">
                            Remove
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {canEditJobs &&
          (technicians.length === 0 ? (
            <p className="empty">
              Add a team member before scheduling. <Link href="/users/new">New team member →</Link>
            </p>
          ) : (
            <form
              key={job.appointments.length}
              action={scheduleThisJob}
              className="stack divider-top"
            >
              <div className="field">
                <label>Technicians</label>
                <div className="checkbox-list">
                  {technicians.map((tech) => (
                    <label key={tech.id} className="field-inline">
                      <input type="checkbox" name="userIds" value={tech.id} />
                      {tech.fullName}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-inline">
                <div className="field">
                  <label htmlFor="startTime">Start</label>
                  <input id="startTime" name="startTime" type="datetime-local" required />
                </div>
                <div className="field">
                  <label htmlFor="endTime">End</label>
                  <input id="endTime" name="endTime" type="datetime-local" required />
                </div>
                <button type="submit" className="btn btn-secondary">
                  Schedule
                </button>
              </div>
            </form>
          ))}
      </div>

      <div className="card">
        <p className="section-title">Line Items</p>
        {job.lineItems.length === 0 ? (
          <p className="empty">No line items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                {canViewFinancials && (
                  <>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {job.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity.toString()}</td>
                  {canViewFinancials && (
                    <>
                      <td>${item.unitPrice.toFixed(2)}</td>
                      <td>${item.lineTotal.toFixed(2)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            {canViewFinancials && (
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <strong>Total</strong>
                  </td>
                  <td colSpan={2}>
                    <strong>${total.toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {canEditJobs && (
          <LineItemForm
            key={job.lineItems.length}
            action={addLineItemForJob}
            inventoryItems={inventoryOptions}
          />
        )}
      </div>

      <div className="card">
        <p className="section-title">Time Tracking</p>
        {searchParams.error === "already-clocked-in" && (
          <p className="empty error-text">
            You&apos;re already clocked in on another job. Clock out there first.
          </p>
        )}

        {job.timeEntries.length === 0 ? (
          <p className="empty">No time logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Technician</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Billable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {job.timeEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.user.fullName}</td>
                  <td>{entry.clockIn.toLocaleString()}</td>
                  <td>{entry.clockOut ? entry.clockOut.toLocaleString() : "In progress"}</td>
                  <td>{entry.billable ? "Yes" : "No"}</td>
                  <td>
                    <span className="badge">{formatEnum(entry.approvalStatus)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="divider-top">
          {openEntry && openEntry.jobId === job.id ? (
            <form
              action={clockOut.bind(null, openEntry.id, job.id)}
              className="form-inline"
            >
              <div className="field">
                <label htmlFor="breakMinutes">Break (minutes)</label>
                <input
                  id="breakMinutes"
                  name="breakMinutes"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </div>
              <div className="field field-inline">
                <input id="billable" name="billable" type="checkbox" defaultChecked />
                <label htmlFor="billable">Billable</label>
              </div>
              <div className="field">
                <label htmlFor="notes">Notes</label>
                <input id="notes" name="notes" />
              </div>
              <button type="submit" className="btn">
                Clock Out
              </button>
            </form>
          ) : openEntry ? (
            <p className="empty">
              You&apos;re clocked in on{" "}
              <Link href={`/jobs/${openEntry.jobId}`}>{openEntry.job.title}</Link>. Clock out
              there before starting this one.
            </p>
          ) : (
            <form action={clockInToThisJob}>
              <button type="submit" className="btn">
                Clock In
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <p className="section-title">Notes</p>
        {job.notes.length === 0 ? (
          <p className="empty">No notes yet.</p>
        ) : (
          <div className="stack">
            {job.notes.map((note) => (
              <div key={note.id}>
                <p className="meta">
                  <strong>{note.user.fullName}</strong> — {note.createdAt.toLocaleString()}
                </p>
                <p>{note.body}</p>
              </div>
            ))}
          </div>
        )}

        <form action={addNoteForJob} className="stack divider-top">
          <div className="field">
            <label htmlFor="body">Add a note</label>
            <textarea id="body" name="body" rows={3} required />
          </div>
          <div>
            <button type="submit" className="btn btn-secondary">
              Add Note
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <p className="section-title">Attachments</p>
        {job.attachments.length === 0 ? (
          <p className="empty">No attachments yet.</p>
        ) : (
          <div className="stack">
            {job.attachments.map((attachment) => {
              const isImage = IMAGE_EXTENSIONS.some((ext) =>
                attachment.fileUrl.toLowerCase().endsWith(ext),
              );
              return (
                <div key={attachment.id}>
                  <p className="meta">
                    <strong>{attachment.uploader.fullName}</strong> —{" "}
                    {attachment.createdAt.toLocaleString()}
                    {attachment.category && (
                      <>
                        {" "}
                        · <span className="badge">{formatEnum(attachment.category)}</span>
                      </>
                    )}
                  </p>
                  {isImage ? (
                    <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                      <img
                        src={attachment.fileUrl}
                        alt={attachment.category ? formatEnum(attachment.category) : "Attachment"}
                        className="attachment-thumb"
                      />
                    </a>
                  ) : (
                    <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                      View file
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form action={addAttachmentForJob} className="form-inline divider-top">
          <div className="field">
            <label htmlFor="file">File</label>
            <input id="file" name="file" type="file" required />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue="">
              <option value="">—</option>
              {ATTACHMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatEnum(category)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary">
            Upload
          </button>
        </form>
      </div>

      {canViewFinancials && (
        <div className="card">
          <p className="section-title">Invoicing</p>
          {job.invoices.length === 0 ? (
            <form action={createInvoiceForJob}>
              <button type="submit" className="btn">
                Create Invoice (${total.toFixed(2)})
              </button>
            </form>
          ) : (
            <div className="stack">
              {job.invoices.map((invoice) => {
                const updateThisInvoiceStatus = updateInvoiceStatus.bind(
                  null,
                  invoice.id,
                  job.id,
                );
                return (
                  <div key={invoice.id}>
                    <p className="meta">
                      Total: ${invoice.total?.toFixed(2) ?? "0.00"} — Current:{" "}
                      <span className="badge">{formatEnum(invoice.status)}</span>
                    </p>
                    <form action={updateThisInvoiceStatus} className="form-inline">
                      <div className="field">
                        <label htmlFor={`invoiceStatus-${invoice.id}`}>Change status</label>
                        <select
                          id={`invoiceStatus-${invoice.id}`}
                          name="status"
                          defaultValue={invoice.status}
                        >
                          {INVOICE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatEnum(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-secondary">
                        Update Status
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
