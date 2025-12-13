import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Define the user table
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: integer("email_verified").default(0),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("tenant"),
});

// Schema for inserting a user - using refinement functions to avoid type errors
export const insertUserSchema = createInsertSchema(user, {
  id: (schema) => schema,
  firstName: (schema) => schema.min(1),
  lastName: (schema) => schema.min(1),
  email: (schema) => schema.email(),
  password: (schema) => schema.min(6),
  role: (schema) =>
    schema.refine((val) => ["tenant", "landlord", "admin"].includes(val), {
      message: "Role must be tenant, landlord, or admin",
    }),
});

// Schema for selecting a user
export const selectUserSchema = createSelectSchema(user);

// Schema for updating a user - making all fields optional
export const updateUserSchema = createUpdateSchema(user, {
  firstName: (schema) => schema.min(1),
  lastName: (schema) => schema.min(1),
  email: z.email(),
  password: (schema) => schema.min(6),
  role: (schema) =>
    schema.refine((val) => ["tenant", "landlord", "admin"].includes(val), {
      message: "Role must be tenant, landlord, or admin",
    }),
});

// Public user type - for use in API responses
export type User = Pick<
  z.infer<typeof selectUserSchema>,
  "id" | "email" | "firstName" | "lastName" | "role"
>;
