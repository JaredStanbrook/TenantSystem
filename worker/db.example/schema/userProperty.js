import { integer, text, sqliteTable, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { user } from "./user";
import { property } from "./property";
export const userProperty = sqliteTable("user_property", {
    userId: text("user_id")
        .notNull()
        .references(() => user.id),
    propertyId: integer("property_id")
        .notNull()
        .references(() => property.id),
    weeklyRent: real("weekly_rent"),
    arrivalDate: text("arrival_date"),
    departureDate: text("departure_date"),
    active: integer("active", { mode: "boolean" }).default(true),
});
// Schema for inserting a user-property link
export const insertUserPropertySchema = createInsertSchema(userProperty, {
    userId: (schema) => schema.min(1),
    propertyId: (schema) => schema.int(),
    weeklyRent: (schema) => schema
        .refine((val) => val === undefined || val > 0, {
        message: "Weekly rent must be greater than 0",
    })
        .optional(),
    arrivalDate: (schema) => schema
        .refine((date) => !isNaN(Date.parse(date)), {
        message: "Arrival date must be a valid date",
    })
        .optional(),
    departureDate: (schema) => schema
        .refine((date) => !isNaN(Date.parse(date)), {
        message: "Departure date must be a valid date",
    })
        .optional(),
    active: (schema) => schema.default(true),
});
// Schema for selecting a user-property link
export const selectUserPropertySchema = createSelectSchema(userProperty);
// Schema for updating a user-property link — all fields optional
export const updateUserPropertySchema = createUpdateSchema(userProperty, {
    userId: (schema) => schema.min(1),
    propertyId: (schema) => schema.int(),
    weeklyRent: (schema) => schema
        .refine((val) => val === undefined || val > 0, {
        message: "Weekly rent must be greater than 0",
    })
        .optional(),
    arrivalDate: (schema) => schema
        .refine((date) => !isNaN(Date.parse(date)), {
        message: "Arrival date must be a valid date",
    })
        .optional(),
    departureDate: (schema) => schema
        .refine((date) => !isNaN(Date.parse(date)), {
        message: "Departure date must be a valid date",
    })
        .optional(),
    active: (schema) => schema.default(true),
});
