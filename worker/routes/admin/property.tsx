import { Hono } from "hono";
import { html } from "hono/html";
import { getCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { property, formPropertySchema } from "@server/schema/property.schema";
import { room, RoomStatus } from "@server/schema/room.schema";
import { invoice } from "@server/schema/invoice.schema";
import { sharedExpense } from "@server/schema/sharedExpense.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import {
  PropertyTable,
  PropertyForm,
  PropertyRow,
} from "@views/properties/PropertyComponents";
import { RoomTable } from "@views/properties/RoomComponents";
import { htmxResponse, htmxToast, htmxPushUrl } from "@server/lib/htmx-helpers";
import type { AppEnv } from "@server/types";
import { PropertySelector } from "@views/components/NavBar";
import { SelectionDialog } from "@server/views/components/SelectionDialog";
import { ConfirmationDialog } from "@views/components/ConfirmationDialog";
import { currencyConvertor } from "@server/lib/utils";
import { addDays, addMonths } from "date-fns";

export const propertyRoute = new Hono<AppEnv>();

// 1. GET /admin/properties -> Render List
propertyRoute.get("/", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;
  const showAll = c.req.query("showAll") === "true";

  const properties = await db
    .select()
    .from(property)
    .where(
      showAll
        ? eq(property.landlordId, userId)
        : and(eq(property.landlordId, userId), isNull(property.deletedAt)),
    )
    .orderBy(desc(property.createdAt));
  htmxPushUrl(c, c.req.url);
  const fragment = PropertyTable({ properties, showAll });
  return htmxResponse(c, "My Properties", fragment);
});
propertyRoute.get("/:propId/rooms", async (c) => {
  const db = c.var.db;
  const propId = Number(c.req.param("propId"));
  const userId = c.var.auth.user!.id;

  // Verify Property Ownership
  const [prop] = await db
    .select()
    .from(property)
    .where(
      and(
        eq(property.id, propId),
        eq(property.landlordId, userId),
        isNull(property.deletedAt),
      ),
    );

  if (!prop) return c.text("Unauthorized or Not Found", 404);

  // Fetch Rooms
  const rooms = await db
    .select()
    .from(room)
    .where(and(eq(room.propertyId, propId), isNull(room.deletedAt)));

  return htmxResponse(
    c,
    `${prop.nickname || "Property"} Rooms`,
    RoomTable({
      rooms,
      propertyName: prop.nickname || prop.addressLine1,
    }),
  );
});

// 2. GET /admin/properties/create -> Render Create Form
propertyRoute.get("/create", (c) => {
  const fragment = PropertyForm({
    action: "/admin/properties",
  });

  return htmxResponse(c, "Create Property", fragment);
});

// 3. POST /admin/properties -> Handle Create
propertyRoute.post(
  "/",
  zValidator("form", formPropertySchema, async (result, c) => {
    if (!result.success) {
      // Re-render form with errors
      const fieldErrors = result.error.flatten().fieldErrors;
      const rawBody = await c.req.parseBody();
      console.log("Validation errors:", fieldErrors);
      htmxToast(c, "Validation Failed", {
        description: "Please check the form for errors.",
        type: "error",
      });
      const fragment = PropertyForm({
        action: "/admin/properties",
        prop: rawBody,
        errors: fieldErrors,
      });
      return htmxResponse(c, "Add Property", fragment);
    }
  }),
  async (c) => {
    const db = c.var.db;
    const data = c.req.valid("form");
    const userId = c.var.auth.user!.id;
    data.rentAmount = currencyConvertor(data.rentAmount.toString());
    // Calculate nextBillingDate based on rentFrequency
    let nextBillingDate: Date;
    const now = new Date();

    switch (data.rentFrequency) {
      case "weekly":
        nextBillingDate = addDays(now, 7);
        break;
      case "fortnightly":
        nextBillingDate = addDays(now, 14);
        break;
      case "monthly":
        nextBillingDate = addMonths(now, 1);
        break;
      default:
        nextBillingDate = now;
    }

    const [newProp] = await db
      .insert(property)
      .values({
        ...data,
        landlordId: userId,
        nextBillingDate,
      })
      .returning({ id: property.id });

    if (data.bedrooms > 0) {
      const roomsToCreate: Array<{
        propertyId: number;
        name: string;
        status: RoomStatus;
        baseRentAmount: number;
      }> = [];
      for (let i = 1; i <= data.bedrooms; i++) {
        roomsToCreate.push({
          propertyId: newProp.id,
          name: `Room ${i}`, // Default name
          status: "vacant_ready", // Default status
          baseRentAmount: Math.floor(data.rentAmount / data.bedrooms), // Rough split logic (optional)
        });
      }

      // Bulk insert
      await db.insert(room).values(roomsToCreate);
    }

    // On success, render the updated table
    const properties = await db
      .select()
      .from(property)
      .where(and(eq(property.landlordId, userId), isNull(property.deletedAt)))
      .orderBy(desc(property.createdAt));

    const selectedPropertyId = getCookie(c, "selected_property_id");

    htmxToast(c, "Property Created", {
      description: `${data.addressLine1} has been added successfully.`,
      type: "success",
    });
    htmxPushUrl(c, "/admin/properties");
    return c.html(html`
      ${PropertyTable({ properties })}
      <div hx-swap-oob="outerHTML:#nav-property-selector">
        ${PropertySelector({
          properties,
          currentPropertyId: selectedPropertyId
            ? Number(selectedPropertyId)
            : undefined,
        })}
      </div>
    `);
  },
);

// 4. GET /admin/properties/:id/edit -> Render Edit Form
propertyRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, id), isNull(property.deletedAt)));
  if (!prop || prop.landlordId !== userId) {
    htmxToast(c, "Unauthorized Access", { type: "error" });
    return c.text("Unauthorized", 401);
  }

  return htmxResponse(
    c,
    `Edit ${prop.nickname || "Property"}`,
    PropertyForm({
      prop,
      action: `/admin/properties/${id}/update`,
    }),
  );
});

// 5. POST /admin/properties/:id/update -> Handle Update
// Note: Using POST here because HTML forms don't support PUT natively,
// and hx-put works but sometimes POST is easier for zValidator form handling.
propertyRoute.post(
  "/:id/update",
  zValidator("form", formPropertySchema, async (result, c) => {
    if (!result.success) {
      const id = c.req.param("id");
      const fieldErrors = result.error.flatten().fieldErrors;
      const rawBody = await c.req.parseBody();
      htmxToast(c, "Update Failed", { type: "error" });

      return htmxResponse(
        c,
        "Edit Property",
        PropertyForm({
          prop: { ...rawBody, id: Number(id) },
          action: `/admin/properties/${id}/update`,
          errors: fieldErrors,
        }),
      );
    }
  }),
  async (c) => {
    const db = c.var.db;
    const id = Number(c.req.param("id"));
    const data = c.req.valid("form");
    const userId = c.var.auth.user!.id;

    const currentRooms = await db
      .select()
      .from(room)
      .where(eq(room.propertyId, id));

    const existing = await db
      .select()
      .from(property)
      .where(and(eq(property.id, id), isNull(property.deletedAt)))
      .then((res) => res[0]);

    if (!existing || existing.landlordId !== userId)
      return c.text("Unauthorized", 401);

    const currentCount = currentRooms.length;
    const targetCount = data.bedrooms;

    // --- INTERCEPTION LOGIC ---
    if (targetCount !== currentCount && !data.rentStrategy) {
      // 1. Calculate variables for the message logic
      const isAdding = targetCount > currentCount;
      const diff = Math.abs(targetCount - currentCount);
      const actionText = isAdding ? "adding" : "removing";

      return c.html(html`
        ${PropertyForm({
          prop: { ...data, id },
          action: `/admin/properties/${id}/update`,
        })}
        ${SelectionDialog({
          title: "Rent Adjustment Required",
          message: `You are ${actionText} <strong>${diff} room(s)</strong>. How should this affect the rent?`,

          choices: [
            {
              label: `Keep Property Rent at $${data.rentAmount}`,
              value: "distribute_property_rent",
              description: `Rescale ${isAdding ? "all" : "remaining"} room prices proportionally.`,
              icon: "scale",
              target: "#main-content",
            },
            {
              label: "Preserve Individual Room Rates",
              value: "preserve_room_rates",
              description:
                "Keep existing room prices. Property rent updates automatically.",
              icon: "lock",
              target: "#main-content",
            },
          ],

          submitConfig: {
            url: `/admin/properties/${id}/update`,
            method: "post",
            selectionKey: "rentStrategy",
            payload: data,
            // You can leave target undefined here since we override it above
            // Or set a default: target: "#main-content"
          },
        })}
      `);
    }

    // --- CALCULATION & BATCHING ---
    const batchOperations = [];
    let finalPropertyRent = currencyConvertor(data.rentAmount.toString());

    // Determine the base rent for new rooms (default 0 for manual strategies)
    let newRoomBaseRent = 0;

    // 1. Identify rooms to keep vs remove
    let roomsToKeep = [...currentRooms];
    let roomsToRemove: typeof currentRooms = [];

    if (targetCount < currentCount) {
      const sorted = currentRooms.sort((a, b) => b.id - a.id);
      const diff = currentCount - targetCount;
      roomsToRemove = sorted.slice(0, diff);
      roomsToKeep = sorted.slice(diff);
    }

    // 2. Handle Financial Strategy
    if (data.rentStrategy === "preserve_room_rates") {
      // STRATEGY A: Sum of Kept Rooms = New Property Price
      // New rooms (if any) start at 0
      const sumKept = roomsToKeep.reduce(
        (sum, r) => sum + (r.baseRentAmount || 0),
        0,
      );
      finalPropertyRent = sumKept;
      newRoomBaseRent = 0;
    } else if (data.rentStrategy === "distribute_property_rent") {
      // STRATEGY B: Even Split.
      // Total Rent / Total Bedrooms = Price Per Room
      if (targetCount > 0) {
        newRoomBaseRent = Math.floor(finalPropertyRent / targetCount);
      }

      // Update ALL kept rooms to be even
      for (const r of roomsToKeep) {
        batchOperations.push(
          db
            .update(room)
            .set({ baseRentAmount: newRoomBaseRent })
            .where(eq(room.id, r.id)),
        );
      }
    }

    // 3. Construct Batch
    // Property Update
    batchOperations.push(
      db
        .update(property)
        .set({ ...data, rentAmount: finalPropertyRent, updatedAt: new Date() })
        .where(eq(property.id, id)),
    );

    // Add Rooms
    if (targetCount > currentCount) {
      const diff = targetCount - currentCount;
      for (let i = 0; i < diff; i++) {
        batchOperations.push(
          db.insert(room).values({
            propertyId: id,
            name: `Room ${currentCount + i + 1}`,
            status: "vacant_ready",
            baseRentAmount: newRoomBaseRent, // Uses 0 for preserve, or the even split for distribute
          }),
        );
      }
    }

    // Remove Rooms
    for (const r of roomsToRemove) {
      if (r.status !== "vacant_ready") {
        htmxToast(c, `Cannot remove ${r.name}: Status is ${r.status}`, {
          type: "error",
        });
        return c.status(400);
      }
      batchOperations.push(db.delete(room).where(eq(room.id, r.id)));
    }

    // Execute
    await db.batch(batchOperations as any);

    // 4. Return UI
    const properties = await db
      .select()
      .from(property)
      .where(and(eq(property.landlordId, userId), isNull(property.deletedAt)))
      .orderBy(desc(property.createdAt));

    const selectedPropertyId = getCookie(c, "selected_property_id");
    htmxToast(c, "Property and Rooms synced", { type: "success" });
    htmxPushUrl(c, "/admin/properties");

    return c.html(html`
      ${PropertyTable({ properties })}

      <div hx-swap-oob="outerHTML:#nav-property-selector">
        ${PropertySelector({
          properties,
          currentPropertyId: selectedPropertyId
            ? Number(selectedPropertyId)
            : undefined,
        })}
      </div>

      <div hx-swap-oob="innerHTML:#modal-container"></div>
    `);
  },
);

// 6. DELETE /admin/properties/:id -> Handle Delete
propertyRoute.delete("/:id", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;
  const body = await c.req.parseBody();
  const forceQuery = c.req.query("force");
  const archiveConfirmQuery = c.req.query("archiveConfirm");
  const showAllQuery = c.req.query("showAll");
  const force = body.force === "true" || forceQuery === "true";
  const archiveConfirm =
    body.archiveConfirm === "true" || archiveConfirmQuery === "true";
  const showAll =
    body.showAll === "true" || showAllQuery === "true";
  console.log(force);
  const [existing] = await db
    .select()
    .from(property)
    .where(eq(property.id, id));

  if (!existing || existing.landlordId !== userId)
    return c.text("Unauthorized", 401);

  if (!existing.deletedAt && !archiveConfirm) {
    return c.html(
      html`
        ${PropertyRow({
          prop: existing,
          showAll,
        })}
        ${ConfirmationDialog({
          title: "Archive this property?",
          message:
            "Archiving will hide this property and archive related records. You can restore it later.",
          variant: "warning",
          retryConfig: {
            url: `/admin/properties/${id}?archiveConfirm=true${showAll ? "&showAll=true" : ""}`,
            method: "delete",
            target: `#row-${id}`,
            swap: "outerHTML swap:0.5s",
            payload: {
              archiveConfirm: true,
            },
          },
        })}
      `,
      409,
    );
  }

  if (existing.deletedAt && !force) {
    return c.html(
      html`
        ${PropertyRow({
          prop: existing,
          showAll: true,
        })}
        ${ConfirmationDialog({
          title: "Permanently delete property?",
          message:
            "This will permanently remove the property and all related records (rooms, tenancies, invoices, expenses). This action cannot be undone.",
          variant: "destructive",
          retryConfig: {
            url: `/admin/properties/${id}?force=true&showAll=true`,
            method: "delete",
            target: `#row-${id}`,
            swap: "outerHTML swap:0.5s",
            payload: {
              force: true,
              showAll: true,
            },
          },
        })}
      `,
      409,
    );
  }

  if (!existing.deletedAt) {
    const now = new Date();
    await db.batch([
      db
        .update(property)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(property.id, id)),
      db.update(room).set({ deletedAt: now }).where(eq(room.propertyId, id)),
      db
        .update(sharedExpense)
        .set({ deletedAt: now })
        .where(eq(sharedExpense.propertyId, id)),
      db
        .update(invoice)
        .set({
          archivedStatus: sql`coalesce(${invoice.archivedStatus}, ${invoice.status})`,
          status: "void",
        })
        .where(eq(invoice.propertyId, id)),
      db
        .update(tenancy)
        .set({
          archivedStatus: sql`coalesce(${tenancy.archivedStatus}, ${tenancy.status})`,
          status: "closed",
        })
        .where(eq(tenancy.propertyId, id)),
    ]);
  } else {
    await db.batch([
      db.delete(tenancy).where(eq(tenancy.propertyId, id)),
      db.delete(invoice).where(eq(invoice.propertyId, id)),
      db.delete(sharedExpense).where(eq(sharedExpense.propertyId, id)),
      db.delete(room).where(eq(room.propertyId, id)),
      db.delete(property).where(eq(property.id, id)),
    ]);
  }

  const properties = await db
    .select()
    .from(property)
    .where(and(eq(property.landlordId, userId), isNull(property.deletedAt)));
  const selectedPropertyId = getCookie(c, "selected_property_id");

  htmxToast(c, existing.deletedAt ? "Property Deleted" : "Property Archived", {
    type: "info",
  });
  return c.html(html`
    ${showAll && !existing.deletedAt
      ? PropertyRow({
          prop: { ...existing, deletedAt: new Date() },
          showAll: true,
        })
      : ""}
    <div hx-swap-oob="outerHTML:#nav-property-selector">
      ${PropertySelector({
        properties,
        currentPropertyId: selectedPropertyId
          ? Number(selectedPropertyId)
          : undefined,
      })}
    </div>
  `);
});

// 7. POST /admin/properties/:id/restore -> Restore Archived Property
propertyRoute.post("/:id/restore", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;
  const showAll = c.req.query("showAll") === "true";

  const [existing] = await db.select().from(property).where(eq(property.id, id));

  if (!existing || existing.landlordId !== userId) return c.text("Unauthorized", 401);

  await db.batch([
    db
      .update(property)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(property.id, id)),
    db.update(room).set({ deletedAt: null }).where(eq(room.propertyId, id)),
    db
      .update(sharedExpense)
      .set({ deletedAt: null })
      .where(eq(sharedExpense.propertyId, id)),
    db
      .update(invoice)
      .set({
        status: sql`coalesce(${invoice.archivedStatus}, ${invoice.status})`,
        archivedStatus: null,
      })
      .where(eq(invoice.propertyId, id)),
    db
      .update(tenancy)
      .set({
        status: sql`coalesce(${tenancy.archivedStatus}, ${tenancy.status})`,
        archivedStatus: null,
      })
      .where(eq(tenancy.propertyId, id)),
  ]);

  const properties = await db
    .select()
    .from(property)
    .where(and(eq(property.landlordId, userId), isNull(property.deletedAt)));
  const selectedPropertyId = getCookie(c, "selected_property_id");

  htmxToast(c, "Property Restored", { type: "success" });
  return c.html(html`
    ${PropertyRow({
      prop: { ...existing, deletedAt: null },
      showAll,
    })}

    <div hx-swap-oob="outerHTML:#nav-property-selector">
      ${PropertySelector({
        properties,
        currentPropertyId: selectedPropertyId ? Number(selectedPropertyId) : undefined,
      })}
    </div>
  `);
});
