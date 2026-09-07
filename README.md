# Field Service App

Scaffold for a field service management app (customers, jobs, quotes, scheduling,
time tracking, inventory, QBO sync) per [`data-model-spec.md`](./data-model-spec.md).

Stack: Next.js (App Router, TypeScript) + Prisma + Postgres.

## What's here

- `prisma/schema.prisma` — full schema: every table from the spec, modeled as
  Prisma models with enums for the status/type fields.
- `prisma/seed.ts` — seeds the four starter roles from the spec (Admin,
  Office/Dispatcher, Manager, Field Tech) with their suggested permissions,
  a non-human placeholder "System" user/depot (`system@internal.local`,
  excluded from Team/Schedule listings, no password — can't log in), and a
  default admin login for local dev: **`admin@fieldservice.local` /
  `changeme123`**. Create real accounts via `/users/new` and treat that
  default as dev-only.
- `docker-compose.yml` — local Postgres 16.
- `app/` — Next.js shell plus `GET /api/health` (round-trips a query through
  Prisma to confirm the DB connection) and two feature slices:
  - `/customers`, `/customers/new`, `/customers/[id]` — list/create/detail,
    with add-property and add-contact forms on the detail page. Billing
    address uses Google Places autocomplete (`GOOGLE_PLACES_API_KEY`,
    proxied server-side via `app/api/places/autocomplete`). Adding a
    contact lets you scope it to specific properties via checkboxes (only
    shown once the customer has at least one); leaving all unchecked makes
    it account-wide, matching the spec's `contact_properties` semantics —
    zero rows there means visible across every property, one or more rows
    means scoped to just those.
  - `/jobs`, `/jobs/new`, `/jobs/[id]` — list/create/detail, with a
    customer→property cascading select on create, a status-update form, a
    line items table + add-form (total computed client-side — jobs have no
    stored `total` column, unlike quotes), a Scheduling section (assign
    one or more technicians to a start/end window, which creates one
    `appointment` per technician per the spec; each can be individually
    removed), a Time Tracking section — clock in/out for the logged-in
    user on that job (blocks clocking into a second job while already
    clocked in elsewhere, with a link to the open one) — and an Invoicing
    section: "Create Invoice" snapshots the current line-item total into a
    lightweight `invoice` record and flips the job to `invoiced` status;
    from there its status (draft/sent/paid/overdue/void) is updated
    manually, standing in for what QBO sync would normally drive.
    Jobs also have a Notes section (plain text, author + timestamp) and an
    Attachments section — real file uploads (photos, signed work orders)
    saved to `public/uploads/` and served by Next's static file handling;
    see the note below on why that's a local-dev choice, not a production
    one. An image renders as an inline thumbnail; anything else is a "View
    file" link. Every attachment/note author comes from the real logged-in
    session.
  - `/quotes`, `/quotes/new`, `/quotes/[id]` — list/create/detail, with
    line items (add-form recalculates the quote total), a status workflow
    (draft/sent/accepted/declined/expired), and a "Convert to Job" action
    once accepted — creates a `job` and copies the line items over, per the
    spec's conversion flow. Converting requires the quote to have a
    property set.
  - `/invoices` — read-only list across every job's invoice(s): job,
    customer, status, total.
  - `/request-service` — the **public, unauthenticated** intake form from
    the spec's "website form" channel (name, email, phone, property
    address, description). Submitting shows an on-screen confirmation in
    place of the spec's "automatic confirmation email" — there's no email
    sending in this scaffold. The other channel, a monitored inbox that
    auto-inserts a row per email, isn't built (no email-receiving infra
    exists here) — `source` on the model still distinguishes `email` vs.
    `web_form` for when that's added.
  - `/service-requests`, `/service-requests/[id]` — the staff-side review
    queue: list of incoming requests, and a detail page where a dispatcher
    marks one Reviewed/Spam or converts it — matching an existing customer
    (and one of their properties) or creating new ones from what the
    requester provided, then creating the `job` and linking
    `matched_customer_id`/`converted_job_id` back on the request.
  - `/users`, `/users/new` — the staff directory (name, email, password,
    role, home depot) — this is also where accounts are created (set a
    password at creation; there's no self-signup).
  - `/schedule` — the scheduling dashboard from the spec: technicians down
    the left, with a Week/Month toggle across the top (`?view=week|month`).
    Week shows 7 day columns with full labels; Month reuses the same
    technician-rows grid but for every day in the calendar month (28–31
    columns, just the day number as the header, full date on hover,
    scrollable via `.table-scroll`) — a deliberate choice to keep the same
    "each tech's day-by-day workload" mental model rather than switching to
    a traditional day-cell calendar layout for the month view. Both modes
    share prev/next navigation and a depot filter (offices only — a tech's
    van isn't a scheduling grouping), and each cell links through to the
    job.
  - `/time` — "My Time Entries" (the logged-in user's own timesheet across
    all jobs) plus a "Pending Approvals" queue across every user's completed
    entries, with Approve/Reject actions (`app/time/actions.ts`) — the
    dashboard-of-pending-entries the spec describes for the approval
    workflow. That section (and the actions themselves) are restricted to
    the `approve_timesheets` permission — see role-based permission
    enforcement below.
  - `/inventory`, `/inventory/new` — the parts/materials catalog (name, SKU,
    unit cost/price, quantity on hand). Per the spec's decision, QBO would
    normally own `quantity_on_hand`; since QBO sync isn't built, it's a
    plain manual field for now rather than fully absent. Each item can
    optionally be assigned a **Location** — any depot, office or vehicle
    (see below) — answering "what's on Sam's van" at the level of "this
    item currently lives there," not a full multi-location split-quantity
    ledger (a single item can't yet show "3 at the warehouse, 2 on the
    truck" simultaneously — that would need a separate stock-per-depot
    table, a bigger increment if it's ever needed).
  - `/depots`, `/depots/new` — depots are anywhere staff or stock are based:
    a fixed office/warehouse, or a technician's van (`DepotType`:
    office/vehicle). A vehicle depot can be assigned to one technician
    (`assignedUserId`); the create form swaps the Address field for a
    technician picker once you choose "Vehicle". This replaces what used to
    be a seed-only "Branch" concept — every staff member still has one home
    depot (`users.depot_id`, always an office in the UI, though the schema
    doesn't enforce that), separate from any van assigned to them.
  - `/search` — a universal search box, always in the top nav. Queries
    Jobs (title/description), and — for every role except Field Tech —
    Customers, Properties, Contacts, Quotes, Service Requests, Inventory,
    and Depots too (Team/Users only additionally requires `manage_users`,
    i.e. Admin). Each result links to the real record where one exists;
    Inventory/Depots/Team don't have individual detail pages yet, so those
    link to their list page instead. Uses Prisma's case-insensitive
    `contains` per field — no full-text index or ranking, fine at this
    scale but would need one (e.g. Postgres `tsvector`) if the data grows
    large enough for `ILIKE` scans to matter.

  Job and quote line-item forms share `components/LineItemForm.tsx` (a
  client component): an optional "From catalog" select that, when you pick
  an inventory item, auto-fills description and unit price (still
  editable) and stores `inventory_item_id` on the line item — otherwise it
  behaves as a plain custom line item. `convertQuoteToJob` already carried
  `inventory_item_id` across when copying a quote's line items into a job,
  so that link survives conversion too.

  Mutations go through server actions (`app/customers/actions.ts`,
  `app/jobs/actions.ts`, `app/quotes/actions.ts`, `app/users/actions.ts`,
  `app/time/actions.ts`, `app/inventory/actions.ts`, `app/invoices/actions.ts`,
  `app/depots/actions.ts`).
- **Auth**: `/login` + `/logout`, backed by `lib/auth.ts` and
  `middleware.ts`. Credentials-based — email + password (bcrypt-hashed),
  session is a signed JWT (`jose`, `SESSION_SECRET`) in an httpOnly cookie,
  verified on every request by `middleware.ts` (Edge runtime — kept
  dependency-free of Prisma/Node APIs on purpose). Every route requires a
  session except `/login`, `/api/health`, and `/request-service`.
  `createQuote` sets `created_by` from the real logged-in user. Not built:
  password reset, and session revocation on user delete/deactivate — a
  session stays valid (JWT, not checked against the DB) until it expires
  (7 days) or the user logs out.
- **Role-based permission enforcement** (`lib/permissions.ts`): checks
  `roles.permissions` (seeded per the spec's four starter roles) against
  the logged-in user, with Admin treated as a superuser regardless of what
  the jsonb says. Two layers:
  - `middleware.ts` — coarse, path-level, keyed off `roleName` from the JWT
    (no DB call, so it stays Edge-compatible): **Field Tech** can only
    reach `/`, `/jobs*`, `/schedule*`, `/time*` — matching the spec's "job
    details, schedule, notes, and time entry only" — any other path (direct
    URL included) redirects to `/jobs`. `/users*` is Admin-only regardless
    of role, since `manage_users` is false for every seeded role but Admin.
  - `hasPermission`/`requirePermission` — fine-grained checks used in pages
    (to hide controls) and server actions (to actually reject the mutation,
    not just hide the button — e.g. a Field Tech POSTing `updateJobStatus`
    directly gets rejected server-side). `view_financials` hides pricing —
    unit price/line total/invoice info on the job detail page (the one
    page Field Techs can reach that mixes financial and non-financial
    data) — and gates all quote/invoice mutations. `edit_jobs` gates
    job status/line-items/scheduling mutations (notes, attachments, and
    clock in/out stay open to everyone, per the spec). `approve_timesheets`
    (Manager/Admin only) gates the Approve/Reject actions and hides the
    "Pending Approvals" section on `/time` for anyone lacking it.
  - Not built: a UI for editing a role's permissions (they're seed-only
    right now), and row-level scoping like "a Field Tech's `/jobs` list
    shows only their own assigned jobs" — everyone who can reach `/jobs`
    currently sees every job, matching how `/schedule` already shows every
    tech's schedule to whoever can view it.
- `lib/prisma.ts` — shared Prisma client singleton.

## Prerequisites

- Node.js + npm — installed (Node 24 LTS via `winget install OpenJS.NodeJS.LTS`).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — installed, used for local Postgres.

## Setup

```bash
npm install
npm run db:up          # starts Postgres via docker compose
npm run db:migrate      # creates the database schema (prompts for a migration name first run)
npm run db:seed         # seeds starter roles
npm run dev              # http://localhost:3000
```

Visit `http://localhost:3000/api/health` — it should return
`{"status":"ok","db":"connected"}` once Postgres and the migration are up.

`.env` already points at the Docker Compose Postgres instance
(`postgresql://fieldservice:fieldservice@localhost:5432/fieldservice`); adjust
`.env.example` if you point this at a different database.

## Notes / open decisions carried over from the spec

- **Inventory sync**: QBO is meant to be the source of truth for stock
  levels. Since QBO sync isn't built, `/inventory` lets you manually set
  `quantity_on_hand` for now — once real sync exists, that field should
  become read-only in the UI and QBO-driven instead.
- **QBO integration itself** (OAuth, the actual sync jobs that populate
  `qbo_sync_log` and push/pull customers/invoices/items/time activities) is
  not implemented in this scaffold — only the local tables that model it.
- **Job attachments use local disk storage** (`public/uploads/`), which
  works for local dev but is the wrong choice for a real deployment: on
  serverless/container platforms (Vercel included) the filesystem isn't
  persistent or shared across instances, so uploads would vanish or 404
  unpredictably. A real deployment should swap `app/jobs/actions.ts`'s
  `addJobAttachment` for cloud object storage (S3, R2, etc.) — the
  `JobAttachment.fileUrl` field already just stores a URL, so the schema
  doesn't need to change. Attachment files are also gated by the same
  session-based auth as everything else (via `middleware.ts`), so they're
  not publicly link-shareable as-is.
- **Feature UI so far**: auth + role-based permission enforcement,
  customers (properties, contacts, contact-to-property scoping), jobs
  (status workflow, line items, scheduling, time tracking, invoicing,
  notes/attachments), quotes (line items, status workflow, convert-to-job),
  a staff directory, depots (offices and technician vehicles), the
  scheduling dashboard, time approvals, an inventory catalog wired into
  job/quote line items and depot locations, an invoices list, and service
  call intake (public form → dispatcher review → convert to
  customer/property/job). Not yet built: a UI for editing role permissions
  (currently seed-only), and per-depot stock-quantity tracking (today a
  catalog item has one location, not a split quantity across several).

## Useful commands

| Command | Purpose |
|---|---|
| `npm run db:up` / `db:down` | Start/stop local Postgres |
| `npm run db:migrate` | Create & apply a new migration (dev) |
| `npm run db:deploy` | Apply existing migrations (CI/prod) |
| `npm run db:studio` | Prisma Studio — browse/edit data in the browser |
| `npm run db:seed` | Re-run the starter-role seed |
