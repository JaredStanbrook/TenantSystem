import { integer, text, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { property } from "./property.schema";
import { room } from "./room.schema";
import { BILLING_STATUS_VALUES, EXTENSION_STATUS_VALUES } from "./billing.shared";

export const rent = sqliteTable(
  "rent",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sequenceNumber: integer("sequence_number").notNull(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => property.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    roomId: integer("room_id").references(() => room.id),
    description: text("description"),
    totalAmount: integer("total_amount").notNull(),
    amountPaid: integer("amount_paid").default(0).notNull(),
    status: text("status", { enum: BILLING_STATUS_VALUES }).default("open").notNull(),
    dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }).notNull(),
    issuedDate: integer("issued_date", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    tenantMarkedPaidAt: integer("tenant_marked_paid_at", { mode: "timestamp" }),
    paymentReference: text("payment_reference"),
    extensionStatus: text("extension_status", { enum: EXTENSION_STATUS_VALUES }).default("none").notNull(),
    extensionRequestedDate: integer("extension_requested_date", { mode: "timestamp" }),
    extensionReason: text("extension_reason"),
    dueDateExtensionDays: integer("due_date_extension_days").default(0).notNull(),
    adminNote: text("admin_note"),
    idempotencyKey: text("idempotency_key").unique(),
    archivedStatus: text("archived_status", { enum: BILLING_STATUS_VALUES }),
  },
  (table) => ({
    userSequenceIdx: uniqueIndex("rent_user_sequence_unique").on(table.userId, table.sequenceNumber),
  }),
);

export const insertRentSchema = createInsertSchema(rent, {
  sequenceNumber: z.coerce.number().int().positive().optional(),
  dueDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalAmount: z.coerce.number().min(1),
});
export const selectRentSchema = createSelectSchema(rent);
export type Rent = z.infer<typeof selectRentSchema>;
