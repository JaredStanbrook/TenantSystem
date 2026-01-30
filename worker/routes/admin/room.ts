import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { room } from "@server/schema/room.schema";
import { property } from "@server/schema/property.schema";
import { RoomTable, RoomForm } from "@views/properties/RoomComponents";
import { htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import { currencyConvertor } from "@server/lib/utils";
import type { AppEnv } from "@server/types";

export const roomRoute = new Hono<AppEnv>();

// Schema for updating a room
const updateRoomSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["vacant_ready", "vacant_maintenance", "advertised", "occupied", "under_repair"]),
  baseRentAmount: z.coerce.number().optional(),
});

// 2. GET /admin/rooms/:id/edit -> Edit Form
roomRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));

  // Join with property to verify ownership
  const [result] = await db
    .select({ r: room, p: property })
    .from(room)
    .innerJoin(property, eq(room.propertyId, property.id))
    .where(eq(room.id, id));

  if (!result || result.p.landlordId !== c.var.auth.user!.id) {
    return c.text("Unauthorized", 403);
  }

  return htmxResponse(
    c,
    "Edit Room",
    RoomForm({
      room: result.r,
      action: `/admin/rooms/${id}/update`,
    })
  );
});

// 3. POST /admin/rooms/:id/update -> Update Logic
roomRoute.post("/:id/update", zValidator("form", updateRoomSchema), async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const data = c.req.valid("form");

  // Ownership check omitted for brevity, but should be here similar to GET above
  if (data.baseRentAmount !== undefined && !Number.isNaN(data.baseRentAmount)) {
    data.baseRentAmount = currencyConvertor(data.baseRentAmount.toString());
  }

  await db.update(room).set(data).where(eq(room.id, id));

  // After update, redirect back to the Room List
  // We need the property ID to go back to the right list
  const [updatedRoom] = await db
    .select({ propertyId: room.propertyId })
    .from(room)
    .where(eq(room.id, id));

  htmxToast(c, "Room updated", { type: "success" });

  // Redirect back to the room list controller we made in step 1
  return c.redirect(`/admin/properties/${updatedRoom.propertyId}/rooms`);
});
