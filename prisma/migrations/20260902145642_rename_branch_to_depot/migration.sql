-- CreateEnum
CREATE TYPE "DepotType" AS ENUM ('office', 'vehicle');

-- RenameTable: branches -> depots (preserves existing rows)
ALTER TABLE "branches" RENAME TO "depots";
ALTER TABLE "depots" RENAME CONSTRAINT "branches_pkey" TO "depots_pkey";

-- AlterTable: depots gains type + assigned_user_id
ALTER TABLE "depots" ADD COLUMN "type" "DepotType" NOT NULL DEFAULT 'office';
ALTER TABLE "depots" ADD COLUMN "assigned_user_id" UUID;

-- RenameColumn: users.branch_id -> users.depot_id (preserves existing values)
ALTER TABLE "users" RENAME COLUMN "branch_id" TO "depot_id";
ALTER TABLE "users" RENAME CONSTRAINT "users_branch_id_fkey" TO "users_depot_id_fkey";

-- AlterTable: inventory_items gains depot_id
ALTER TABLE "inventory_items" ADD COLUMN "depot_id" UUID;

-- AddForeignKey
ALTER TABLE "depots" ADD CONSTRAINT "depots_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_depot_id_fkey" FOREIGN KEY ("depot_id") REFERENCES "depots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
