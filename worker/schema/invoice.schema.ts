// worker/schema/invoice.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { property } from "./property.schema";

export const INVOICE_TYPE_VALUES = [
  "rent",
  "water",
  "electricity",
  "gas",
  "internet",
  "maintenance",
  "other",
] as const;

export const invoice = sqliteTable("invoice", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),

  // Bill Details
  type: text("type", {
    enum: INVOICE_TYPE_VALUES,
  }).notNull(),

  description: text("description"), // e.g. "Cycle 2 Water Bill"

  // Amounts (Always in Cents)
  totalAmount: integer("total_amount").notNull(),

  // Dates
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  issuedDate: integer("issued_date", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// --- Zod Schemas ---
export const insertInvoiceSchema = createInsertSchema(invoice, {
  dueDate: z.coerce.date(),
  totalAmount: z.coerce.number().min(1, "Amount must be positive"),
});

export const selectInvoiceSchema = createSelectSchema(invoice);
export type Invoice = z.infer<typeof selectInvoiceSchema>;
