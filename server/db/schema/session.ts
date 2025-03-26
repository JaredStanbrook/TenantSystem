import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./user.ts";

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

// Schema for inserting a session - can be used to validate API requests
export const insertSessionSchema = createInsertSchema(session);

// Schema for selecting a session - can be used to validate API responses
export const selectSessionSchema = createSelectSchema(session);
