// worker/schema/tenancy.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { property } from "./property.schema";

export const tenancy = sqliteTable("tenancy", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Relationships
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),

  // Lease Details
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }), // Nullable for periodic leases

  // Status
  status: text("status", { enum: ["active", "past", "evicted"] })
    .default("active")
    .notNull(),

  // Financial agreements (optional overrides)
  agreedRentAmount: integer("agreed_rent_amount"), // If different from property base rent

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- Zod Schemas ---
export const insertTenancySchema = createInsertSchema(tenancy, {
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const formTenancySchema = insertTenancySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
