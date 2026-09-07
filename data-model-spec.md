# Field Service Management App — Data Model Spec

Draft schema for a 17-person field service business: customer database, job/project
tracking, scheduling, and QuickBooks Online (QBO) sync for invoices, inventory, and
timesheets.

Conventions: every table has `id` (UUID, primary key), `created_at`, `updated_at`.
Foreign keys are named `<table>_id`. QBO-synced tables carry a `qbo_id` and
`qbo_sync_status` field.

---

## 1. People & Access

### `branches`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "North Branch", "Downtown" |
| address | text | |

### `users` (internal staff)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| full_name | text | |
| email | text | unique, used for login |
| phone | text | |
| role_id | uuid | FK → `roles` |
| branch_id | uuid | FK → `branches` — primary branch for scheduling/filtering |
| active | boolean | deactivate instead of delete |
| qbo_employee_id | text | link to QBO employee for time sync |

### `roles`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. Admin, Office/Dispatcher, Manager, Field Tech |
| permissions | jsonb | e.g. `{"view_financials": true, "edit_jobs": true, "manage_users": false}` |

Suggested starter roles for a 17-person team:
- **Admin** — full access, billing, user management
- **Office/Dispatcher** — customers, scheduling, jobs, invoicing; no user management
- **Manager** — everything Office has + reporting, approve timesheets
- **Field Tech** — sees only their assigned jobs, can log time/notes/photos, no financials

---

## 2. Customers & Properties

### `customers`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | company or individual name |
| billing_address | text | |
| phone | text | |
| email | text | |
| notes | text | |
| qbo_id | text | link to QBO Customer |
| qbo_sync_status | text | synced / pending / error |

### `properties` (service locations — a customer can have several)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK → `customers` |
| label | text | e.g. "Main Office", "Warehouse B" |
| address | text | |
| access_notes | text | gate codes, parking, pets, etc. |

### `contacts` (people at a customer — useful when customer is a company)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK → `customers` — every contact still belongs to one parent account |
| name | text | |
| role | text | e.g. Property Manager |
| phone | text | |
| email | text | |
| is_primary | boolean | |

### `contact_properties` (join table — scopes a contact to specific properties)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| contact_id | uuid | FK → `contacts` |
| property_id | uuid | FK → `properties` |

A contact with **no rows** in `contact_properties` is an account-wide contact —
visible and relevant across all of that customer's properties (e.g. the owner
or main office contact). A contact with **one or more rows** is scoped only to
those specific properties (e.g. a site manager who's only relevant at one
building, or a contact shared across a handful of properties but not the whole
account). This covers all three cases you described — parent-level, single-
property, and multi-property contacts — without needing separate tables for
each.

---

## 3. Jobs (small jobs, large projects, service calls)

One table with a `type` field keeps reporting and scheduling unified, rather than
three separate tables with duplicated logic.

### `jobs`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK → `customers` |
| property_id | uuid | FK → `properties` |
| type | text | `service_call` / `small_job` / `large_project` |
| status | text | e.g. new, scheduled, in_progress, completed, invoiced, closed |
| title | text | short description |
| description | text | |
| priority | text | for service calls: normal / urgent / emergency |
| assigned_user_ids | uuid[] | staff assigned |
| parent_job_id | uuid | nullable — for large projects broken into phases/sub-jobs |
| scheduled_start | timestamp | |
| scheduled_end | timestamp | |
| actual_start | timestamp | |
| actual_end | timestamp | |
| qbo_invoice_id | text | link to QBO Invoice once billed |

Large projects can use `parent_job_id` to group phases (e.g. "Phase 1: Demo",
"Phase 2: Install") under one parent, so scheduling and time tracking stay
granular while reporting can roll up to the project level.

### `job_line_items` (labor, materials, flat fees — what ends up on the invoice)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| job_id | uuid | FK → `jobs` |
| inventory_item_id | uuid | FK → `inventory_items`, nullable (blank for labor/flat fees) |
| description | text | |
| quantity | numeric | |
| unit_price | numeric | |
| line_total | numeric | |

### `job_notes`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| job_id | uuid | FK → `jobs` |
| user_id | uuid | author |
| body | text | |
| created_at | timestamp | |

### `job_attachments`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| job_id | uuid | FK → `jobs` |
| file_url | text | photo, signed work order, etc. |
| uploaded_by | uuid | FK → `users` |
| category | text | before_photo / after_photo / signature / document |

---

## 4. Quotes / Estimates

Quotes need to exist independently of `jobs`, since they typically happen
*before* work is approved — often before a job record exists at all (e.g.
quoting a prospective large project, or offering options on a service call).

### `quotes`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | FK → `customers` |
| property_id | uuid | FK → `properties`, nullable if not yet tied to a specific site |
| job_id | uuid | FK → `jobs`, nullable — set once a quote is accepted and converted |
| status | text | draft / sent / accepted / declined / expired / converted |
| notes | text | terms, scope notes, etc. |
| qbo_estimate_id | text | link to QBO Estimate |
| qbo_sync_status | text | synced / pending / error |
| total | numeric | |
| created_by | uuid | FK → `users` |
| sent_at | timestamp | nullable |
| expires_at | timestamp | nullable |

### `quote_line_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| quote_id | uuid | FK → `quotes` |
| inventory_item_id | uuid | FK → `inventory_items`, nullable (blank for labor/flat fees) |
| description | text | |
| quantity | numeric | |
| unit_price | numeric | |
| line_total | numeric | |

Same shape as `job_line_items` — quotes can pull pricing directly from
`inventory_items`, same as a job's line items, so a tech or office staff can
build a quote by picking parts/materials off the same catalog used everywhere
else in the app.

**Conversion flow:** once a quote is `accepted`, it converts into (or attaches
to) a `job` — its line items get copied into `job_line_items`, and `job_id` on
the quote gets set. QBO supports converting an Estimate directly into an
Invoice, so the same relationship (`qbo_estimate_id` → eventual
`qbo_invoice_id`) can mirror that on the QBO side rather than rebuilding it
from scratch.

---

## 5. Service Call Intake

### `service_requests` (incoming, unprocessed intake)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| source | text | `email` / `web_form` |
| raw_email_body | text | nullable — full email content if source = email |
| customer_name | text | as provided by requester |
| customer_email | text | |
| customer_phone | text | |
| property_address | text | as provided, may not match an existing `property` |
| description | text | what they're requesting |
| status | text | new / reviewed / converted / spam |
| matched_customer_id | uuid | FK → `customers`, nullable until dispatcher matches/creates |
| converted_job_id | uuid | FK → `jobs`, nullable until converted |
| received_at | timestamp | |

### Service call intake

Two intake channels feed the same `service_requests` staging table rather than
creating a `job` directly:

- **Dedicated inbox** — a monitored email address (e.g.
  `requests@yourcompany.com`) that an automated process reads and inserts as a
  `service_request` row.
- **Website form** — a simple form (name, contact info, property address,
  description) that posts directly into the same table.

Landing in a staging table first (rather than auto-creating a `job`) matters
because incoming requests are often incomplete or messy — a first-time
customer's address may not match an existing `property`, contact details may
need cleanup, or the request might not be legitimate. A dispatcher reviews
`new` requests, matches or creates the customer/property, and **converts** the
request into a real `job` (populating `converted_job_id`), at which point
normal scheduling takes over.

An automatic confirmation is sent to the requester as soon as a
`service_request` row is created (before dispatcher review) — just an
acknowledgment that the request was received, not a scheduling commitment.
This applies to both channels, so the web form's confirmation and the email
inbox's auto-reply can share the same trigger logic.

## 6. Scheduling

### `appointments` (calendar entries — links a job to a time slot and tech)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| job_id | uuid | FK → `jobs` |
| user_id | uuid | assigned tech |
| start_time | timestamp | |
| end_time | timestamp | |
| status | text | scheduled / confirmed / en_route / done / no_show |

Keeping this separate from `jobs.scheduled_start/end` lets one job have multiple
visits (common for large projects or follow-up service calls) without changing
the job record itself.

### Scheduling dashboard (UI)

Main view: a grid with **technicians down the left** (rows) and **days of the
week across the top** (columns). Each cell shows that tech's appointments for
that day (as blocks, similar to a calendar week view).

- **Branch filter** at the top narrows the technician list to a single branch
  (or "All branches"), using `users.branch_id` — makes it easy to schedule
  within one office without scrolling past staff from other locations.
- Clicking a cell/block opens the underlying `appointment` → `job` for detail
  or reassignment.
- Unassigned jobs (no appointment yet) likely need a side panel or separate
  "unscheduled" list so dispatchers can drag them onto a tech's day — worth
  confirming if drag-and-drop scheduling is a priority or if a simpler
  click-to-assign flow is enough.

### Assignment workflow

Scheduling a job works as: **click the job → choose a time, a number of
days, and one or more technicians.** The dashboard (section above) stays
open in a second tab/panel as a reference while making that choice.

This maps cleanly onto `appointments` with no schema changes: selecting
multiple technicians for one job creates **one `appointment` row per
technician**, each sharing the same `job_id` and the same (or overlapping)
`start_time`/`end_time` range spanning the chosen number of days. A 3-day job
with 2 techs assigned produces 2 appointment rows, each spanning that 3-day
window — so each tech's row on the dashboard grid shows the job across all
3 days, and unassigning one tech just removes their single row without
touching the others.

---

## 7. Time Tracking (→ QBO Time Tracking sync)

### `time_entries`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → `users` |
| job_id | uuid | FK → `jobs` |
| clock_in | timestamp | |
| clock_out | timestamp | nullable while active |
| break_minutes | integer | |
| billable | boolean | |
| notes | text | |
| approval_status | text | pending / approved / rejected |
| approved_by | uuid | FK → `users`, nullable until approved |
| approved_at | timestamp | nullable |
| qbo_time_activity_id | text | link to QBO TimeActivity |
| qbo_sync_status | text | synced / pending / error |

Sync to QBO only fires once `approval_status = approved` — a manager reviews
and approves entries (individually or in a batch, e.g. end of week) before
they push out. A dashboard view of `pending` entries per manager covers this
workflow without needing a separate approvals table.

---

## 8. Inventory (→ QBO Items sync)

### `inventory_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| sku | text | |
| unit_cost | numeric | |
| unit_price | numeric | |
| quantity_on_hand | numeric | pulled from QBO or tracked locally |
| qbo_item_id | text | link to QBO Item |
| qbo_sync_status | text | synced / pending / error |

Design decision to confirm with you: should QBO stay the **source of truth for
stock levels** (your app pulls/reads only), or does your team also need to
decrement inventory from the field (e.g. a tech uses 2 parts on a job) and push
that back to QBO? This affects sync direction and how much inventory logic
lives in your app vs. QBO.

---

## 9. Invoicing (→ QBO Invoices sync)

Rather than duplicating full invoice logic, the app holds a lightweight
`invoices` record that mirrors QBO status, since QBO remains the accounting
source of truth.

### `invoices`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| job_id | uuid | FK → `jobs` |
| qbo_invoice_id | text | |
| status | text | draft / sent / paid / overdue / void — mirrored from QBO |
| total | numeric | |
| synced_at | timestamp | |

---

## 10. Sync Infrastructure

### `qbo_sync_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entity_type | text | customer / invoice / item / time_activity |
| entity_id | uuid | local record id |
| direction | text | push / pull |
| status | text | success / error |
| error_message | text | nullable |
| created_at | timestamp | |

Useful for debugging sync issues without digging through logs — a simple admin
screen listing recent sync failures goes a long way at this scale.

---

## Decisions made

1. **Inventory sync** — QBO is the sole source of truth for stock levels;
   the app reads/displays only, no local quantity tracking.
2. **Permission tiers** — Field Techs do not see pricing or financials; they
   get job details, schedule, notes, and time entry only.
3. **Multi-visit jobs** — large projects commonly rotate through different
   techs. Handled by `appointments` being separate from `jobs`, each with its
   own `user_id`.
4. **Timesheet approval** — manager sign-off is required before a time entry
   syncs to QBO (see `approval_status` on `time_entries`).
