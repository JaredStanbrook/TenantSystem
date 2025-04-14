import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

// Schema for inserting a user - can be used to validate API requests
export const insertUserSchema = createInsertSchema(user, {
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["landlord", "tenant"]),
});

// Schema for selecting a user - can be used to validate API responses
export const selectUserSchema = createSelectSchema(user);
export type User = Pick<
  z.infer<typeof selectUserSchema>,
  "id" | "email" | "firstName" | "lastName" | "role"
>;
