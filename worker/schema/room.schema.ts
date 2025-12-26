// worker/schema/room.schema.ts
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { property } from "./property.schema";

export const room = sqliteTable("room", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => property.id),

  name: text("name").notNull(), // e.g., "Room A", "Master Suite"
  description: text("description"),

  // Physical State of the Room
  status: text("status", {
    enum: [
      "vacant_ready",
      "vacant_maintenance",
      "advertised",
      "prospective",
      "occupied",
      "notice_given",
      "under_repair",
    ],
  })
    .default("vacant_ready")
    .notNull(),

  baseRentAmount: integer("base_rent_amount"), // Default rent for this specific room
});

export const insertRoomSchema = createInsertSchema(room);
export const selectRoomSchema = createSelectSchema(room);

// Safe Room for Public/Tenant views
export const safeRoomSchema = selectRoomSchema.pick({
  id: true,
  name: true,
  status: true,
  propertyId: true,
});
export type SafeRoom = z.infer<typeof safeRoomSchema>;
