// worker/schema/room.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { property } from "./property.schema";

export const ROOM_STATUS_VALUES = [
  "vacant_ready",
  "vacant_maintenance",
  "advertised",
  "prospective",
  "occupied",
  "notice_given",
  "under_repair",
] as const;

export const room = sqliteTable("room", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id, { onDelete: "cascade" }),

  name: text("name").notNull(), // e.g., "Room A", "Master Suite"
  description: text("description"),

  // Physical State of the Room
  status: text("status", {
    enum: ROOM_STATUS_VALUES,
  })
    .default("vacant_ready")
    .notNull(),

  baseRentAmount: integer("base_rent_amount").notNull(), // Default rent for this specific room
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const insertRoomSchema = createInsertSchema(room);
export const selectRoomSchema = createSelectSchema(room);
export type RoomStatus = (typeof ROOM_STATUS_VALUES)[number];

// Safe Room for Public/Tenant views
export const safeRoomSchema = selectRoomSchema.pick({
  id: true,
  name: true,
  status: true,
  propertyId: true,
});
export type SafeRoom = z.infer<typeof safeRoomSchema>;
