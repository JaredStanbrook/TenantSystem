// worker/schema/shared_expense.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";
import { property } from "./property.schema";

// 1. The Expense Item (e.g., "Toilet Paper Pack")
export const sharedExpense = sqliteTable("shared_expense", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),

  // Who bought it?
  purchaserId: text("purchaser_id")
    .notNull()
    .references(() => users.id),

  description: text("description").notNull(),
  totalAmount: integer("total_amount").notNull(),

  purchasedAt: integer("purchased_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// 2. The Split (Who owes the Purchaser?)
export const expenseSplit = sqliteTable("expense_split", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sharedExpenseId: integer("shared_expense_id")
    .notNull()
    .references(() => sharedExpense.id, { onDelete: "cascade" }),

  // Who owes money?
  debtorId: text("debtor_id")
    .notNull()
    .references(() => users.id),

  amountOwed: integer("amount_owed").notNull(),

  isSettled: integer("is_settled", { mode: "boolean" }).default(false).notNull(),
  settledAt: integer("settled_at", { mode: "timestamp" }),
});

// --- Zod Schemas ---
export const insertSharedExpenseSchema = createInsertSchema(sharedExpense, {
  totalAmount: z.coerce.number().min(1),
  purchasedAt: z.coerce.date(),
});

// Helper schema for the frontend form which usually submits the expense AND the splits together
export const createExpenseFormSchema = insertSharedExpenseSchema.extend({
  splits: z.array(
    z.object({
      debtorId: z.string(),
      amountOwed: z.number().min(1),
    })
  ),
});

export const selectSharedExpenseSchema = createSelectSchema(sharedExpense);
export type SharedExpense = z.infer<typeof selectSharedExpenseSchema>;

export const selectExpenseSplitSchema = createSelectSchema(expenseSplit);
export type ExpenseSplit = z.infer<typeof selectExpenseSplitSchema>;
