import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { user } from "./user";
import { bill } from "./bill";
export const userBill = sqliteTable("user_bill", {
    userId: text("user_id")
        .notNull()
        .references(() => user.id),
    billId: integer("bill_id")
        .notNull()
        .references(() => bill.id, { onDelete: "cascade" }),
});
// Schema for inserting a user-bill link
export const insertUserBillSchema = createInsertSchema(userBill, {
    userId: (schema) => schema.min(1),
    billId: (schema) => schema.int(),
});
// Schema for selecting a user-bill link
export const selectUserBillSchema = createSelectSchema(userBill);
// Schema for updating a user-bill link — all fields optional
export const updateUserBillSchema = createUpdateSchema(userBill, {
    userId: (schema) => schema.min(1),
    billId: (schema) => schema.int(),
});
