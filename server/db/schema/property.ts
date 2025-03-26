import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./user.ts";

export const property = sqliteTable("property", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  landlordId: text("landlord_id")
    .notNull()
    .references(() => user.id),
  address: text("address").notNull(),
});

// Schema for inserting a property - can be used to validate API requests
export const insertPropertySchema = createInsertSchema(property, {
  landlordId: z.string(),
  address: z.string(),
});

// Schema for selecting a property - can be used to validate API responses
export const selectPropertySchema = createSelectSchema(property);
