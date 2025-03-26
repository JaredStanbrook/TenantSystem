//rename (employee + Employee)
import { sql } from "drizzle-orm";
import { integer, text, real, sqliteTable, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./user.ts";
import { property } from "./property.ts";

export const expense = sqliteTable("expense", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),
  title: text("title").notNull(),
  description: text("description"),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  createdAt: text("created_at")
    .default(sql`(CURRENT_DATE)`)
    .notNull(),
});

// Schema for inserting an expense - can be used to validate API requests
export const insertExpenseSchema = createInsertSchema(expense, {
  id: z.number().optional(),
  userId: z.string(),
  propertyId: z.number(),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(5).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, {
    message: "Amount must be a valid monetary value",
  }),
  expenseDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Date must be a valid date",
  }),
});

// Schema for selecting an expense - can be used to validate API responses
export const selectExpenseSchema = createSelectSchema(expense);
