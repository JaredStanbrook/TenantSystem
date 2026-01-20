import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { property } from "./property.schema";
import { users } from "./auth.schema";

export const RECURRENCE_FREQUENCY = ["weekly", "fortnightly", "monthly", "yearly"] as const;

// The "Master Plan" for a recurring invoice
export const recurringInvoice = sqliteTable("recurring_invoice", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),

  // Template Details (Copied to new invoices)
  type: text("type").notNull(),
  description: text("description"),
  totalAmount: integer("total_amount").notNull(), // Cents

  // Schedule Configuration
  frequency: text("frequency", { enum: RECURRENCE_FREQUENCY }).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),

  // The Anchor Date: When should the NEXT invoice be generated?
  nextRunDate: integer("next_run_date", { mode: "timestamp" }).notNull(),

  // When should the generated invoice be DUE relative to creation?
  // e.g., Create on 1st, Due on 7th = 7 days offset
  dueDaysOffset: integer("due_days_offset").default(7).notNull(),

  // Optional Termination
  endDate: integer("end_date", { mode: "timestamp" }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// Tenants involved in this recurrence (The Splits)
export const recurringInvoiceSplit = sqliteTable("recurring_invoice_split", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recurringInvoiceId: integer("recurring_invoice_id")
    .notNull()
    .references(() => recurringInvoice.id, { onDelete: "cascade" }),

  userId: text("user_id")
    .notNull()
    .references(() => users.id),

  amountOwed: integer("amount_owed").notNull(), // Fixed amount share
});
