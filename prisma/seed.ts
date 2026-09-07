import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// Starter roles from data-model-spec.md section 1.
const STARTER_ROLES = [
  {
    name: "Admin",
    permissions: {
      view_financials: true,
      edit_jobs: true,
      manage_users: true,
    },
  },
  {
    name: "Office/Dispatcher",
    permissions: {
      view_financials: true,
      edit_jobs: true,
      manage_users: false,
    },
  },
  {
    name: "Manager",
    permissions: {
      view_financials: true,
      edit_jobs: true,
      manage_users: false,
      approve_timesheets: true,
      view_reports: true,
    },
  },
  {
    name: "Field Tech",
    permissions: {
      view_financials: false,
      edit_jobs: false,
      manage_users: false,
      log_time: true,
      log_notes: true,
    },
  },
];

// Starter depots — fixed offices for now; vehicle depots (technician vans)
// get created via /depots/new once real technicians exist.
const STARTER_DEPOTS = ["Raleigh Office", "Charlotte Office"];

// Non-human placeholder, excluded from Team/Schedule listings — kept around
// for any future record that needs an author but isn't tied to a real user.
const SYSTEM_USER_EMAIL = "system@internal.local";

// Default admin login. Locally this falls back to a known dev password;
// in production `SEED_ADMIN_PASSWORD` is required so a real deployment
// never silently gets seeded with a guessable one.
const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@fieldservice.local";
const DEFAULT_ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? null : "changeme123");

async function main() {
  for (const role of STARTER_ROLES) {
    const existing = await prisma.role.findFirst({ where: { name: role.name } });
    if (!existing) {
      await prisma.role.create({ data: role });
    }
  }

  console.log("Seeded starter roles:", STARTER_ROLES.map((r) => r.name).join(", "));

  const adminRole = await prisma.role.findFirstOrThrow({ where: { name: "Admin" } });

  for (const name of STARTER_DEPOTS) {
    const existing = await prisma.depot.findFirst({ where: { name } });
    if (!existing) {
      await prisma.depot.create({ data: { name, type: "office" } });
    }
  }

  console.log("Seeded depots:", STARTER_DEPOTS.join(", "));

  const depot = await prisma.depot.findFirstOrThrow({
    where: { name: STARTER_DEPOTS[0] },
  });

  await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      fullName: "System",
      email: SYSTEM_USER_EMAIL,
      roleId: adminRole.id,
      depotId: depot.id,
    },
  });

  console.log("Seeded placeholder system user:", SYSTEM_USER_EMAIL);

  const existingAdmin = await prisma.user.findUnique({ where: { email: DEFAULT_ADMIN_EMAIL } });
  if (!existingAdmin) {
    if (!DEFAULT_ADMIN_PASSWORD) {
      throw new Error(
        "SEED_ADMIN_PASSWORD must be set when seeding a production database (NODE_ENV=production).",
      );
    }
    await prisma.user.create({
      data: {
        fullName: "Admin",
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
        roleId: adminRole.id,
        depotId: depot.id,
      },
    });
    console.log(`Seeded default admin login: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
