export function formatEnum(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Maps every status enum value used across the app (jobs, quotes, invoices,
// appointments, time entries, service requests) to a badge color — lets
// someone scan a table for what needs attention instead of reading every
// label. Values with no clear tone (depot type, attachment category, role
// names, etc.) fall through to the neutral badge style.
const STATUS_TONES: Record<string, "success" | "info" | "warning" | "danger"> = {
  completed: "success",
  paid: "success",
  approved: "success",
  accepted: "success",
  converted: "success",
  closed: "success",
  done: "success",
  confirmed: "success",
  scheduled: "info",
  in_progress: "info",
  sent: "info",
  en_route: "info",
  reviewed: "info",
  new: "warning",
  draft: "warning",
  pending: "warning",
  invoiced: "warning",
  overdue: "danger",
  void: "danger",
  declined: "danger",
  rejected: "danger",
  spam: "danger",
  expired: "danger",
  no_show: "danger",
};

export function statusBadgeClass(value: string): string {
  const tone = STATUS_TONES[value];
  return tone ? `badge badge-${tone}` : "badge";
}
