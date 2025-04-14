import { integer, text, sqliteTable, real } from "drizzle-orm/sqlite-core";
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
  weeklyRent: real("weekly_rent"),
  arrivalDate: text("arrival_date"),
  departureDate: text("departure_date"),
  active: integer("active", { mode: "boolean" }).default(true),
});

// Schema for inserting a tenant_property - can be used to validate API requests
export const insertUserPropertySchema = createInsertSchema(userProperty, {
  userId: z.string(),
  propertyId: z.number().int(),
  weeklyRent: z.number().optional(),
  arrivalDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Date must be a valid date",
    })
    .optional(),
  departureDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Date must be a valid date",
    })
    .optional(),
  active: z.boolean().default(true),
});

// Schema for selecting a tenant_property - can be used to validate API responses
export const selectUserPropertySchema = createSelectSchema(userProperty);
