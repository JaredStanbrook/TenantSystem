import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, and, ne, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { TenancyService } from "@server/services/tenancy.service";
import { ConfirmationDialog } from "@views/components/ConfirmationDialog";
import { TenancyStatusManager } from "@views/tenancies/TenancyComponents";
import {
  createTenancyFormSchema,
  updateTenancyFormSchema,
  tenancy,
} from "@server/schema/tenancy.schema";
import { property } from "@server/schema/property.schema";
import { room } from "@server/schema/room.schema"; // Import Room
import { users } from "@server/schema/auth.schema";
import { TenancyTable, TenancyForm } from "@views/tenancies/TenancyComponents";
import { TENANCY_STATUS_VALUES } from "@server/schema/tenancy.schema";
import { htmxResponse, htmxToast, htmxRedirect, flashToast } from "@server/lib/htmx-helpers";
import type { AppEnv } from "@server/types";
import { getCookie } from "hono/cookie";
import { html } from "hono/html"; // For the OOB/Partial helpers
import { SelectionDialog } from "@server/views/components/SelectionDialog";
import { currencyConvertor } from "@server/lib/utils";

export const tenancyRoute = new Hono<AppEnv>();

const statusUpdateSchema = z.object({
  status: z.enum(TENANCY_STATUS_VALUES),
  force: z.coerce.boolean().optional(),
});

// --- 1. GET /admin/tenancies (List with Room Info) ---
tenancyRoute.get("/test", async (c) => {
  const db = c.var.db;

  const results = await db
    .select({
      tenancy: tenancy,
      user: users,
      property: property,
      room: room, // Join Room Data
    })
    .from(tenancy)
    .innerJoin(users, eq(tenancy.userId, users.id))
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .leftJoin(room, eq(tenancy.roomId, room.id))
    .orderBy(desc(tenancy.startDate));

  return c.json(results);
});

tenancyRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;

  const selectedPropCookie = getCookie(c, "selected_property_id");
  const globalPropertyId = selectedPropCookie ? Number(selectedPropCookie) : null;
  const showAll = c.req.query("showAll") === "true";

  // 1. Build Query
  const whereClause = and(
    eq(property.landlordId, user.id),
    globalPropertyId ? eq(tenancy.propertyId, globalPropertyId) : undefined,
    showAll ? undefined : ne(tenancy.status, "closed"),
  );

  const results = await db
    .select({
      tenancy: tenancy,
      user: users,
      property: property,
      room: room, // Join Room Data
    })
    .from(tenancy)
    .innerJoin(users, eq(tenancy.userId, users.id))
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .leftJoin(room, eq(tenancy.roomId, room.id)) // Optional because some legacy tenancies might not have rooms
    .where(whereClause)
    .orderBy(desc(tenancy.startDate));

  // Flatten for view
  const tenancies = results.map((r) => ({
    ...r.tenancy,
    user: r.user,
    property: r.property,
    room: r.room, // Pass room to the table
  }));
  return htmxResponse(c, "Tenancies", TenancyTable({ tenancies, showAll }));
});

// --- 2. GET /admin/tenancies/create ---
tenancyRoute.get("/create", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;
  const selectedPropCookie = getCookie(c, "selected_property_id");

  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  if (myProperties.length === 0) {
    htmxToast(c, "No Properties Found", {
      description: "You must create a property before adding tenancys.",
      type: "error",
    });
    return c.body(null, 400);
  }

  // Pre-fetch rooms if a property is already selected via cookie
  let availableRooms: any[] = [];
  if (selectedPropCookie) {
    availableRooms = await db
      .select()
      .from(room)
      .where(
        and(
          eq(room.propertyId, Number(selectedPropCookie)),
          or(eq(room.status, "vacant_ready"), eq(room.status, "advertised")),
        ),
      );
  }

  return htmxResponse(
    c,
    "Add Tenancy",
    TenancyForm({
      properties: myProperties,
      action: "/admin/tenancies",
    }),
    // TODO rooms: availableRooms, We would pass available rooms to the form
    // but we load them dynamically to avoid confusion
  );
});

// --- 3. GET /admin/tenancies/rooms-select (HTMX Helper) ---
// Used by the Create Form to fetch rooms when Property dropdown changes
tenancyRoute.get("/rooms-select", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));

  if (!propertyId) return c.html(html`<option value="">Select a property first</option>`);

  const availableRooms = await db
    .select()
    .from(room)
    .where(
      and(
        eq(room.propertyId, propertyId),
        // Only show rooms that can actually take a tenancy
        inArray(room.status, ["vacant_ready", "vacant_maintenance", "advertised"]),
      ),
    );

  if (availableRooms.length === 0) {
    return c.html(html`<option value="">No vacant rooms available</option>`);
  }

  return c.html(html`
    <option value="">Select a Room...</option>
    ${availableRooms.map(
      (r) => html`<option value="${r.id}">${r.name} (${r.status.replace("_", " ")})</option>`,
    )}
  `);
});

// --- 4. POST /admin/tenancies (Create with D1 Batch) ---
tenancyRoute.post("/", zValidator("form", createTenancyFormSchema), async (c) => {
  const db = c.var.db;
  const data = c.req.valid("form");
  const landlordId = c.var.auth.user!.id;

  // Helper to re-render form with errors
  const renderError = async (message: string, field?: "email" | "roomId") => {
    const myProperties = await db
      .select()
      .from(property)
      .where(eq(property.landlordId, landlordId));

    // Re-fetch rooms if property was selected
    const currentRooms = await db
      .select()
      .from(room)
      .where(
        and(
          eq(room.propertyId, data.propertyId),
          or(eq(room.status, "vacant_ready"), eq(room.status, "advertised")),
        ),
      );

    htmxToast(c, message, { type: "error" });
    return htmxResponse(
      c,
      "Add Tenancy",
      TenancyForm({
        properties: myProperties,
        rooms: currentRooms,
        action: "/admin/tenancies",
        emailValue: data.email,
        errors: field ? { [field]: [message] } : undefined,
      }),
    );
  };

  try {
    // 1. Validation Phase (Reads)

    // A. Verify Property Ownership
    const [prop] = await db
      .select()
      .from(property)
      .where(and(eq(property.id, data.propertyId), eq(property.landlordId, landlordId)));

    if (!prop) return c.text("Unauthorized property", 403);

    // B. Find Target User
    const [targetUser] = await db.select().from(users).where(eq(users.email, data.email));
    if (!targetUser) return renderError("User not found.", "email");

    // B1. Check if user already has an active tenancy for this property
    const [existingTenancy] = await db
      .select()
      .from(tenancy)
      .where(and(eq(tenancy.userId, targetUser.id), ne(tenancy.status, "closed")));

    if (existingTenancy) {
      return renderError(`This user already has an active tenancy.`, "email");
    }

    // C. Validate Room Availability (Backend Check)
    if (data.roomId) {
      const [targetRoom] = await db
        .select()
        .from(room)
        .where(and(eq(room.id, data.roomId), eq(room.propertyId, data.propertyId)));

      if (!targetRoom) {
        return renderError("Room does not exist on this property.", "roomId");
      }

      const validStatuses = ["vacant_ready", "advertised", "vacant_maintenance"];
      if (!validStatuses.includes(targetRoom.status)) {
        return renderError(
          `Room is currently ${targetRoom.status.replace("_", " ")} and cannot receive a tenant.`,
          "roomId",
        );
      }
    }
    const [newTenancy] = await db
      .insert(tenancy)
      .values({
        propertyId: data.propertyId,
        roomId: data.roomId,
        startDate: data.startDate,
        billedThroughDate: data.startDate, // Initial cursor as discussed
        endDate: data.endDate,
        bondAmount: currencyConvertor(data.bondAmount!.toString()),
        userId: targetUser.id,
        status: "pending_agreement",
      })
      .returning({ id: tenancy.id }); // Extract only what you need

    // 2. Update Room Status (Conditional)
    if (data.roomId) {
      await db.update(room).set({ status: "prospective" }).where(eq(room.id, data.roomId));
    }

    //TODO: After insert tenant ask if they like to automatically generate bond invoice and initial rent invoice to catch up to property.billingAnchorDay
    return c.html(html`
      ${TenancyForm({
        action: "/admin/tenancies",
      })}
      ${SelectionDialog({
        title: "Tenancy Created Successfully",
        message: `The tenant has been added. Would you like to generate the initial invoices now?`,

        choices: [
          {
            label: "Generate Bond & Rent Catch-up",
            value: "all",
            description:
              "Create a bond invoice and calculate pro-rata rent to align with the property cycle.",
            icon: "file-plus", // Assuming you have an icon system
            target: "#main-content", // Where to swap the result
          },
          {
            label: "Rent Catch-up Only",
            value: "rent_only",
            description: "Skip bond for now, but align rent cycle.",
            icon: "calendar-check",
            target: "#main-content",
          },
          {
            label: "Bond Only",
            value: "bond_only",
            description: "Create bond invoice only.",
            icon: "shield-lock",
            target: "#main-content",
          },
          {
            label: "Skip Invoice Generation",
            value: "skip",
            description: "I will create invoices manually later.",
            icon: "x-circle",
            target: "#main-content",
          },
        ],

        submitConfig: {
          url: `/admin/invoices/tenancy/${newTenancy.id}/generate`,
          method: "post",
          selectionKey: "strategy", // The name of the form field containing the value
          payload: {}, // No extra payload needed, ID is in URL
        },
      })}
    `);
    // return htmxRedirect(c, "/admin/tenancies");
  } catch (error: any) {
    console.error("Tenancy creation failed:", error);
    return renderError("An unexpected error occurred. Please try again.");
  }
});

// --- 5. GET /admin/tenancies/:id/edit ---
tenancyRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const landlordId = c.var.auth.user!.id;

  const [record] = await db
    .select({ t: tenancy, u: users, p: property })
    .from(tenancy)
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .innerJoin(users, eq(tenancy.userId, users.id))
    .where(eq(tenancy.id, id));

  if (!record || record.p.landlordId !== landlordId) return c.text("Unauthorized", 403);

  const myProperties = await db.select().from(property).where(eq(property.landlordId, landlordId));

  // Fetch rooms for this property
  // We need the CURRENT room (even if occupied) + any VACANT rooms
  const propertyRooms = await db
    .select()
    .from(room)
    .where(eq(room.propertyId, record.t.propertyId));

  const validRooms = propertyRooms.filter(
    (r) =>
      r.id === record.t.roomId || // The tenancy's current room
      ["vacant_ready", "advertised"].includes(r.status), // Or empty rooms
  );
  console.log(record.t);

  return htmxResponse(
    c,
    "Edit Tenancy",
    TenancyForm({
      tenancy: record.t,
      emailValue: record.u.email,
      properties: myProperties,
      rooms: validRooms, // Pass filtered rooms
      action: `/admin/tenancies/${id}/update`,
    }),
  );
});

// --- 6. POST /admin/tenancies/:id/update ---
tenancyRoute.post("/:id/update", zValidator("form", updateTenancyFormSchema), async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const data = c.req.valid("form");
  const landlordId = c.var.auth.user!.id;

  // Verify ownership
  const [existing] = await db
    .select({ t: tenancy, p: property })
    .from(tenancy)
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .where(eq(tenancy.id, id));

  if (!existing || existing.p.landlordId !== landlordId) return c.text("Unauthorized", 403);

  // LOGIC: Did they switch rooms?
  // 1. If switching rooms, mark OLD room vacant
  if (existing.t.roomId && existing.t.roomId !== data.roomId) {
    await db.update(room).set({ status: "vacant_ready" }).where(eq(room.id, existing.t.roomId));
  }

  // 2. Mark NEW room occupied (if creating a link)
  if (data.roomId && data.roomId !== existing.t.roomId) {
    await db.update(room).set({ status: "occupied" }).where(eq(room.id, data.roomId));
  }

  // 3. Update Tenancy
  await db
    .update(tenancy)
    .set({
      propertyId: data.propertyId,
      roomId: data.roomId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(tenancy.id, id));

  flashToast(c, "Tenancy Updated", { type: "success" });
  return htmxRedirect(c, "/admin/tenancies");
});

// --- 7. PATCH /admin/tenancies/:id/status (Optimistic Status Update) ---
tenancyRoute.patch("/:id/status", zValidator("form", statusUpdateSchema), async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const { status, force } = c.req.valid("form");
  const userId = c.var.auth.user!.id;

  // Initialize Service
  const tenancyService = new TenancyService(db);

  try {
    const updated = await tenancyService.updateStatus(id, status, userId, !!force);
    htmxToast(c, "Status Updated", { type: "success" });
    return c.html(TenancyStatusManager({ tenancy: updated }));
  } catch (error: any) {
    const currentTenancy = await tenancyService.getById(id);

    // 1. Handle "Warning" Logic (The Soft Error)
    if (error.message === "INVALID_TRANSITION") {
      // We return the generic modal, configured to "retry" this exact request
      // but with force=true added to the payload.
      return c.html(
        html`
          ${TenancyStatusManager({
            tenancy: currentTenancy,
            helperText: "Action requires confirmation.",
          })}
          ${ConfirmationDialog({
            title: "Non-Standard Status Change",
            message: `Moving from ${currentTenancy.status} to ${status} is unusual. Are you sure you want to force this?`,
            variant: "destructive", // or "warning"
            retryConfig: {
              url: `/admin/tenancies/${id}/status`,
              method: "patch",
              target: `#tenancy-status-card-${id}`,
              swap: "outerHTML",
              // THE KEY PART: Existing data + force flag
              payload: {
                status,
                force: true,
              },
            },
          })}
        `,
        409,
      );
    }

    // 2. Handle Actual Errors
    htmxToast(c, error.message || "Error updating status", { type: "error" });

    // Reset UI to server state (undo optimistic UI if any)
    return c.html(TenancyStatusManager({ tenancy: currentTenancy }), 400);
  }
});
// --- 8. DELETE /admin/tenancies/:id ---
tenancyRoute.delete("/:id", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const landlordId = c.var.auth.user!.id;

  // Verify ownership
  const [existing] = await db
    .select({ t: tenancy, p: property })
    .from(tenancy)
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .where(eq(tenancy.id, id));

  if (!existing || existing.p.landlordId !== landlordId) return c.text("Unauthorized", 403);

  // Mark room as vacant if linked
  if (existing.t.roomId) {
    await db.update(room).set({ status: "vacant_ready" }).where(eq(room.id, existing.t.roomId));
  }

  // Delete tenancy
  await db.delete(tenancy).where(eq(tenancy.id, id));

  htmxToast(c, "Tenancy Deleted", { type: "success" });
  return c.html(""); // Return empty response for HTMX to replace the row
});
