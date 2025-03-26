import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./user";
import { property } from "./property";

export const userProperty = sqliteTable("user_property", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),
});

// Schema for inserting a tenant_property - can be used to validate API requests
export const insertUserPropertySchema = createInsertSchema(userProperty, {
  userId: z.string(),
  propertyId: z.number().int(),
});

// Schema for selecting a tenant_property - can be used to validate API responses
export const selectUserPropertySchema = createSelectSchema(userProperty);
