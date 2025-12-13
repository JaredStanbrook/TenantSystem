import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { property, formPropertySchema } from "@server/schema/property.schema";
import { eq, desc } from "drizzle-orm";
import { PropertyTable, PropertyForm } from "@views/properties/PropertyComponents";
import { htmxResponse, htmxToast, htmxPushUrl } from "@server/lib/htmx-helpers";
import type { AppEnv } from "@server/types";
import app from "@server/app";

export const propertyRoute = new Hono<AppEnv>();

// 1. GET /admin/properties -> Render List
propertyRoute.get("/", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;

  const properties = await db
    .select()
    .from(property)
    .where(eq(property.landlordId, userId))
    .orderBy(desc(property.createdAt));
  const fragment = PropertyTable({ properties });
  return htmxResponse(c, "My Properties", fragment);
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

    await db.insert(property).values({
      ...data,
      landlordId: userId,
    });

    // On success, render the updated table
    const properties = await db
      .select()
      .from(property)
      .where(eq(property.landlordId, userId))
      .orderBy(desc(property.createdAt));

    htmxToast(c, "Property Created", {
      description: `${data.addressLine1} has been added successfully.`,
      type: "success",
    });
    htmxPushUrl(c, "/admin/properties");
    return htmxResponse(c, "Properties", PropertyTable({ properties }));
  }
);

// 4. GET /admin/properties/:id/edit -> Render Edit Form
propertyRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  const [prop] = await db.select().from(property).where(eq(property.id, id));
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
    })
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
        })
      );
    }
  }),
  async (c) => {
    const db = c.var.db;
    const id = Number(c.req.param("id"));
    const data = c.req.valid("form");
    const userId = c.var.auth.user!.id;

    // Verify ownership
    const [existing] = await db.select().from(property).where(eq(property.id, id));
    if (!existing || existing.landlordId !== userId) return c.text("Unauthorized", 401);

    await db
      .update(property)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(property.id, id));

    // Return the updated table
    const properties = await db
      .select()
      .from(property)
      .where(eq(property.landlordId, userId))
      .orderBy(desc(property.createdAt));

    htmxToast(c, "Property Updated", { type: "success" });
    htmxPushUrl(c, "/admin/properties");

    return htmxResponse(c, "Properties", PropertyTable({ properties }));
  }
);

// 6. DELETE /admin/properties/:id -> Handle Delete
propertyRoute.delete("/:id", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  const [existing] = await db.select().from(property).where(eq(property.id, id));

  if (!existing || existing.landlordId !== userId) return c.text("Unauthorized", 401);

  await db.delete(property).where(eq(property.id, id));

  htmxToast(c, "Property Deleted", { type: "info" });
  return c.body(null);
});

export default app;
