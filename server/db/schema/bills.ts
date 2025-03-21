//rename (employee + Employee)
import { sql } from "drizzle-orm";
import { integer, text, real, sqliteTable, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().default("rent"), //("bill_type IN ('rent', 'utility')"),
  title: text("title").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  dateDue: text("date").notNull(),
  createdAt: text("created_at")
    .default(sql`(CURRENT_DATE)`)
    .notNull(),
});

// Schema for inserting an bills - can be used to validate API requests
export const insertBillSchema = createInsertSchema(bills, {
  id: z.number().optional(),
  type: z.enum(["rent", "utility"]),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, {
    message: "Amount must be a valid monetary value",
  }),
  dateDue: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Date must be a valid date",
  }),
  description: z.string().optional(),
});
// Schema for selecting an bills - can be used to validate API responses
export const selectBillSchema = createSelectSchema(bills);
