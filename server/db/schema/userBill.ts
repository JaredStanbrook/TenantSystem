// db/schema/user_bill.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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
