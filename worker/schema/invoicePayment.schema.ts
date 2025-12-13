// worker/schema/invoice_payment.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { invoice } from "./invoice.schema";

export const invoicePayment = sqliteTable("invoice_payment", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoice.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id), // The tenant paying

  // The split logic
  amountOwed: integer("amount_owed").notNull(), // How much THIS user owes of the total invoice
  amountPaid: integer("amount_paid").default(0).notNull(),

  // State
  status: text("status", { enum: ["pending", "partial", "paid", "overdue"] })
    .default("pending")
    .notNull(),

  paidAt: integer("paid_at", { mode: "timestamp" }), // Null until paid

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- Zod Schemas ---
export const insertInvoicePaymentSchema = createInsertSchema(invoicePayment, {
  amountOwed: z.coerce.number(),
  amountPaid: z.coerce.number(),
});
