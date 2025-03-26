import { sql } from "drizzle-orm";
import { integer, text, real, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const bill = sqliteTable("bill", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().default("rent"), // ("bill_type IN ('rent', 'utility')")
  title: text("title").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  dueDate: text("date_due").notNull(), // Renamed for better readability
  createdAt: text("created_at")
    .default(sql`(CURRENT_DATE)`)
    .notNull(),
});

// Schema for inserting a bill - can be used to validate API requests
export const insertBillSchema = createInsertSchema(bill, {
  id: z.number().optional(),
  type: z.enum(["rent", "utility"]),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, {
    message: "Amount must be a valid monetary value",
  }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Date must be a valid date",
  }),
  description: z.string().optional(),
});

// Schema for selecting a bill - can be used to validate API responses
export const selectBillSchema = createSelectSchema(bill);
