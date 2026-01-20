// worker/schema/invoice.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { property } from "./property.schema";
import { recurringInvoice } from "./recurring.schema";

// --- Enums & Constants ---
export const INVOICE_TYPES = [
  "rent",
  "water",
  "electricity",
  "gas",
  "internet",
  "maintenance",
  "other",
] as const;

export const INVOICE_STATUSES = ["draft", "open", "partial", "paid", "overdue", "void"] as const;

// --- Types for App-Wide Use ---
export type InvoiceType = (typeof INVOICE_TYPES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface CreateInvoiceDTO {
  propertyId: number;
  type: InvoiceType;
  description?: string;
  amountDollars: number;
  dueDate: Date;
  tenantIds: string[]; // Logic: Who pays is defined here, but stored in invoice_payment
}

// --- Database Table ---
export const invoice = sqliteTable("invoice", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Canonical Relationship: Property -> Invoice
  // (Specific Tenant liability is linked via invoice_payment table)
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),

  // Bill Details
  type: text("type", { enum: INVOICE_TYPES }).notNull(),
  description: text("description"),

  // Amounts (Always in Cents)
  totalAmount: integer("total_amount").notNull(),

  // High-level Status (Derived from Aggregated Payments)
  status: text("status", {
    enum: INVOICE_STATUSES,
  })
    .default("open")
    .notNull(),

  // Dates
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  issuedDate: integer("issued_date", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  recurringInvoiceId: integer("recurring_invoice_id").references(() => recurringInvoice.id),
});

// --- Zod Schemas ---
export const insertInvoiceSchema = createInsertSchema(invoice, {
  dueDate: z.coerce.date(),
  totalAmount: z.coerce.number().min(1, "Amount must be positive"),
});

export const selectInvoiceSchema = createSelectSchema(invoice);
export type Invoice = z.infer<typeof selectInvoiceSchema>;
