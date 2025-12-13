import { sql } from "drizzle-orm";
import { integer, text, real, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";
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

// Schema for inserting an expense
export const insertExpenseSchema = createInsertSchema(expense, {
  id: (schema) => schema.optional(),
  userId: (schema) => schema.min(1),
  propertyId: (schema) => schema.int(),
  title: (schema) => schema.min(3, { message: "Title must be at least 3 characters" }),
  description: (schema) => schema.min(5).optional(),
  amount: (schema) =>
    schema.refine((value) => Number(value) > 0, {
      message: "Amount must be a valid monetary value",
    }),
  expenseDate: (schema) =>
    schema.refine((date) => !isNaN(Date.parse(date)), {
      message: "Date must be a valid date",
    }),
});

// Schema for selecting an expense
export const selectExpenseSchema = createSelectSchema(expense);

// Schema for updating an expense — all fields optional
export const updateExpenseSchema = createUpdateSchema(expense, {
  userId: (schema) => schema.min(1),
  propertyId: (schema) => schema.int(),
  title: (schema) => schema.min(3, { message: "Title must be at least 3 characters" }),
  description: (schema) => schema.min(5).optional(),
  amount: (schema) =>
    schema.refine((value) => Number(value) > 0, {
      message: "Amount must be a valid monetary value",
    }),
  expenseDate: (schema) =>
    schema.refine((date) => !isNaN(Date.parse(date)), {
      message: "Date must be a valid date",
    }),
});

// Public type for Expense API responses
export type Expense = Pick<
  z.infer<typeof selectExpenseSchema>,
  "id" | "userId" | "propertyId" | "title" | "amount" | "expenseDate"
>;
