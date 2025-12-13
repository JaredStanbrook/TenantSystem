import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { user } from "./user.ts";
export const property = sqliteTable("property", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    landlordId: text("landlord_id")
        .notNull()
        .references(() => user.id),
    address: text("address").notNull(),
});
// Schema for inserting a property
export const insertPropertySchema = createInsertSchema(property, {
    landlordId: (schema) => schema.min(1),
    address: (schema) => schema.min(5, { message: "Address must be at least 5 characters" }),
});
// Schema for selecting a property
export const selectPropertySchema = createSelectSchema(property);
// Schema for updating a property — all fields optional
export const updatePropertySchema = createUpdateSchema(property, {
    landlordId: (schema) => schema.min(1),
    address: (schema) => schema.min(5, { message: "Address must be at least 5 characters" }),
});
