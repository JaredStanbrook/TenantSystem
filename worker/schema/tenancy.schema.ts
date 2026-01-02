// worker/schema/tenancy.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { property } from "./property.schema";
import { room } from "./room.schema";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const TENANCY_STATUS_VALUES = [
  "pending_agreement",
  "bond_pending",
  "move_in_ready",
  "active",
  "notice_period",
  "ended_pending_bond",
  "closed",
  "evicted",
] as const;

export const tenancy = sqliteTable("tenancy", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),
  roomId: integer("room_id").references(() => room.id), // New link to room

  // Contractual Process Status
  status: text("status", {
    enum: TENANCY_STATUS_VALUES,
  })
    .default("pending_agreement")
    .notNull(),

  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),

  agreedRentAmount: integer("agreed_rent_amount"),
  bondAmount: integer("bond_amount"), // Track bond specifically

  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(() => new Date()),
});

// --- Zod Schemas ---
export const createTenancyFormSchema = z.object({
  email: z.email(),
  propertyId: z.coerce.number(),
  roomId: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
  startDate: z.coerce.date(),
  endDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  bondAmount: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
});

export const updateTenancyFormSchema = createTenancyFormSchema.omit({ email: true });

export const selectTenancySchema = createSelectSchema(tenancy);
export type Tenancy = z.infer<typeof selectTenancySchema>;
