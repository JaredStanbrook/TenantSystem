import { sql } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Waitlist table for unauthenticated / pre-user applications
export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: text("property_id"), // optional, which property they applied for
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  employment: text("employment"),
  references: text("references"),
  about: text("about"),
  pets: text("pets"),
  status: text("status").notNull().default("pending"), // pending | contacted | rejected | converted
  source: text("source"),
  notes: text("notes"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const insertWaitlistSchema = createInsertSchema(waitlist, {
  id: (s) => s,
  fullName: (s) => s.min(1),
  email: (s) => s.email(),
  status: (s) =>
    s.refine((v) => ["pending", "contacted", "rejected", "converted"].includes(v), {
      message: "Invalid status",
    }),
});

export const selectWaitlistSchema = createSelectSchema(waitlist);

export const updateWaitlistSchema = createUpdateSchema(waitlist, {
  fullName: (s) => s.min(1),
  email: z.email(),
  status: (s) =>
    s.refine((v) => ["pending", "contacted", "rejected", "converted"].includes(v), {
      message: "Invalid status",
    }),
});

export type WaitlistEntry = z.infer<typeof selectWaitlistSchema>;
