import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users.ts";

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  landlordId: text("landlord_id")
    .notNull()
    .references(() => users.id),
  address: text("address").notNull(),
});

// Schema for inserting a property - can be used to validate API requests
export const insertPropertySchema = createInsertSchema(properties, {
  landlordId: z.string().min(5),
  address: z.string(),
});

// Schema for selecting a property - can be used to validate API responses
export const selectPropertySchema = createSelectSchema(properties);
