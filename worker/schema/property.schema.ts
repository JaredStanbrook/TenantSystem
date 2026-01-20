// worker/schema/property.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";

// --- 1. Database Table Definition ---
export const property = sqliteTable("property", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  landlordId: text("landlord_id")
    .notNull()
    .references(() => users.id),

  // Identification
  nickname: text("nickname"), // e.g. "The Beach House"

  // Address Components (More robust than single string)
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state").notNull(), // or enum if specific to a country
  postcode: text("postcode").notNull(),
  country: text("country").default("Australia").notNull(),

  // Specs
  propertyType: text("property_type", {
    enum: ["house", "apartment", "unit", "studio", "townhouse"],
  })
    .default("house")
    .notNull(),
  bedrooms: integer("bedrooms").default(1).notNull(),
  bathrooms: integer("bathrooms").default(1).notNull(), // Integer is safer, use 1 for 1, 2 for 2.
  parkingSpaces: integer("parking_spaces").default(0).notNull(),

  // Financials
  rentAmount: integer("rent_amount").notNull(), // Stored in CENTS to avoid float errors
  rentFrequency: text("rent_frequency", { enum: ["weekly", "fortnightly", "monthly"] })
    .default("weekly")
    .notNull(),

  // State
  status: text("status", { enum: ["vacant", "occupied", "maintenance"] })
    .default("vacant")
    .notNull(),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull()
    .$onUpdate(() => new Date()),
  billingAnchorDay: integer("billing_anchor_day").default(1).notNull(),
});

// --- 2. Zod Schemas for Validation ---

// Base Schema for Inserting (Form Validation)
export const insertPropertySchema = createInsertSchema(property, {
  nickname: (s) => s.optional(),
  addressLine1: (s) => s.min(5, "Address too short"),
  postcode: (s) => s.regex(/^\d{4}$/, "Must be a valid 4-digit postcode"), // Example regex
  rentAmount: (s) => s.min(1, "Rent cannot be free").transform((val) => Number(val)), // Ensure number
  bedrooms: (s) => s.min(0),
  bathrooms: (s) => s.min(1),
});

// Refine Schema for Form Handling (Coercing strings to numbers from HTML forms)
export const formPropertySchema = insertPropertySchema
  .omit({
    id: true,
    landlordId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    rentAmount: z.coerce.number().min(0, "Rent must be a positive number"),
    bedrooms: z.coerce.number().min(0),
    bathrooms: z.coerce.number().min(0),
    parkingSpaces: z.coerce.number().min(0),
    rentStrategy: z.enum(["distribute_property_rent", "preserve_room_rates"]).optional(),
  });

export const safePropertySchema = z.object({
  id: z.number(),
  nickname: z.string().nullable(),
  addressLine1: z.string(),
});
export type SafeProperty = z.infer<typeof safePropertySchema>;
export const selectPropertySchema = createSelectSchema(property);
export type Property = z.infer<typeof selectPropertySchema>;
