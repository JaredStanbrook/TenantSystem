import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { properties } from "./properties";

export const tenantProperties = sqliteTable("tenantProperties", {
  tenantId: text("tenant_id")
    .notNull()
    .references(() => users.id),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id),
});

// Schema for inserting a user - can be used to validate API requests
export const insertTenantPropertySchema = createInsertSchema(tenantProperties, {
  tenantId: z.string(),
  propertyId: z.number().int(),
});

// Schema for selecting a user - can be used to validate API responses
export const selectTenantPropertySchema = createSelectSchema(tenantProperties);
