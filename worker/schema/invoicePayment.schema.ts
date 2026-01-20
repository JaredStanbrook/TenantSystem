// worker/schema/invoicePayment.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { invoice } from "./invoice.schema";

export const PAYMENT_STATUS_VALUES = ["pending", "partial", "paid", "overdue", "void"] as const;

export const invoicePayment = sqliteTable("invoice_payment", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoice.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),

  // Financials
  amountOwed: integer("amount_owed").notNull(),
  amountPaid: integer("amount_paid").default(0).notNull(),

  // Authoritative Status
  status: text("status", { enum: PAYMENT_STATUS_VALUES }).default("pending").notNull(),

  paidAt: integer("paid_at", { mode: "timestamp" }),

  // --- Tenant Interactions ---
  tenantMarkedPaidAt: integer("tenant_marked_paid_at", { mode: "timestamp" }),
  paymentReference: text("payment_reference"), // Receipt/Ref

  // Extensions
  extensionStatus: text("extension_status", {
    enum: ["none", "pending", "approved", "rejected"],
  })
    .default("none")
    .notNull(),

  extensionRequestedDate: integer("extension_requested_date", { mode: "timestamp" }),
  extensionReason: text("extension_reason"),

  // Authoritative Extension (set by Admin)
  dueDateExtensionDays: integer("due_date_extension_days").default(0).notNull(),

  // Admin Feedback
  adminNote: text("admin_note"),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- Zod Schemas ---
export const insertInvoicePaymentSchema = createInsertSchema(invoicePayment);
export const selectInvoicePaymentSchema = createSelectSchema(invoicePayment);

// Form Schemas for Actions
export const markPaidSchema = z.object({
  reference: z.string().optional(),
});

export const extensionRequestSchema = z.object({
  requestedDate: z.coerce.date(),
  reason: z.string().optional(),
});
export type InvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;
