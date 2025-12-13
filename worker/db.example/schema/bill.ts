import { sql } from "drizzle-orm";
import { integer, text, real, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { user } from "./user.ts";
import { property } from "./property.ts";

export const bill = sqliteTable("bill", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  landlordId: text("user_id")
    .notNull()
    .references(() => user.id),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),
  type: text("type").notNull().default("rent"),
  title: text("title").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  dueDate: text("date_due").notNull(),
  createdAt: text("created_at")
    .default(sql`(CURRENT_DATE)`)
    .notNull(),
});

export const insertBillSchema = createInsertSchema(bill, {
  id: (schema) => schema.optional(),
  landlordId: (schema) => schema.min(1),
  propertyId: (schema) => schema.int(),
  type: (schema) =>
    schema.refine((val) => ["rent", "utility"].includes(val), {
      message: "Type must be 'rent' or 'utility'",
    }),
  title: (schema) => schema.min(3, { message: "Title must be at least 3 characters" }),
  amount: (schema) =>
    schema.refine((val) => /^\d+(\.\d{1,2})?$/.test(String(val)), {
      message: "Amount must be a valid monetary value",
    }),
  dueDate: (schema) =>
    schema.refine((date) => !isNaN(Date.parse(date)), {
      message: "Date must be a valid date",
    }),
  description: (schema) => schema.optional(),
});

export const selectBillSchema = createSelectSchema(bill);

export const updateBillSchema = createUpdateSchema(bill, {
  landlordId: (schema) => schema.min(1),
  propertyId: (schema) => schema.int(),
  type: (schema) =>
    schema.refine((val) => ["rent", "utility"].includes(val), {
      message: "Type must be 'rent' or 'utility'",
    }),
  title: (schema) => schema.min(3, { message: "Title must be at least 3 characters" }),
  amount: (schema) =>
    schema.refine((val) => /^\d+(\.\d{1,2})?$/.test(String(val)), {
      message: "Amount must be a valid monetary value",
    }),
  dueDate: (schema) =>
    schema.refine((date) => !isNaN(Date.parse(date)), {
      message: "Date must be a valid date",
    }),
  description: (schema) => schema.optional(),
});

export type Bill = Pick<
  z.infer<typeof selectBillSchema>,
  "id" | "landlordId" | "propertyId" | "type" | "title" | "amount" | "dueDate"
>;
