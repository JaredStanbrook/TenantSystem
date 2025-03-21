import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users.ts";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

// Schema for inserting a user - can be used to validate API requests
export const insertSessionSchema = createInsertSchema(sessions);

// Schema for selecting a user - can be used to validate API responses
export const selectSessionSchema = createSelectSchema(sessions);
