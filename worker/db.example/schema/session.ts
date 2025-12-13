import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { user } from "./user.ts";

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

// Schema for inserting a session
export const insertSessionSchema = createInsertSchema(session, {
  id: (schema) => schema.min(1),
  userId: (schema) => schema.min(1),
  expiresAt: (schema) =>
    schema.refine((val) => Number.isInteger(val) && val > Date.now(), {
      message: "Expiry must be a valid future timestamp",
    }),
});

// Schema for selecting a session
export const selectSessionSchema = createSelectSchema(session);

// Schema for updating a session — all fields optional
export const updateSessionSchema = createUpdateSchema(session, {
  userId: (schema) => schema.min(1),
  expiresAt: (schema) =>
    schema.refine((val) => Number.isInteger(val) && val > Date.now(), {
      message: "Expiry must be a valid future timestamp",
    }),
});

// Public type for Session API responses
export type Session = Pick<z.infer<typeof selectSessionSchema>, "id" | "userId" | "expiresAt">;
