import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateId, Scrypt } from "lucia";

import { eq, desc, sum, and } from "drizzle-orm";
import { dbMiddleware, luciaMiddleware, userMiddleware } from "../db";

import { user as userTable, insertUserSchema, selectUserSchema } from "../db/schema/user";
import {
  property as propertyTable,
  insertPropertySchema,
  selectPropertySchema,
} from "../db/schema/property";
import {
  userProperty as userPropertyTable,
  insertUserPropertySchema,
  selectUserPropertySchema,
} from "../db/schema/userProperty";
import { updateTenantInfoSchema } from "../sharedTypes";

export const authRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .use("*", luciaMiddleware)
  .use("*", userMiddleware)
  .get("/", async (c) => {
    const db = c.var.db;

    const users = await db
      .select()
      .from(userTable)
      .leftJoin(userPropertyTable, eq(userTable.id, userPropertyTable.userId))
      .leftJoin(propertyTable, eq(userPropertyTable.propertyId, propertyTable.id))
      .orderBy(desc(userTable.firstName))
      .limit(100);

    return c.json({ users });
  })
  .put("/:userId", zValidator("json", updateTenantInfoSchema), async (c) => {
    const user = c.var.user!;
    const tenantUserId = c.req.param("userId");
    const { weeklyRent, arrivalDate, departureDate, active } = c.req.valid("json");

    // Ensure the current user is a landlord
    if (user.role !== "landlord") {
      return c.json(
        { message: "Only landlords can update tenant information", code: "UNAUTHORIZED" },
        403
      );
    }

    try {
      const link = await c.var.db
        .select({ propertyId: userPropertyTable.propertyId })
        .from(userPropertyTable)
        .where(eq(userPropertyTable.userId, tenantUserId))
        .limit(1)
        .then((res) => res[0]);

      if (!link) {
        return c.json(
          {
            message: "Tenant does not exist or is not linked to any property",
            code: "TENANT_NOT_LINKED",
          },
          404
        );
      }
      // Verify the property belongs to the landlord
      const property = await c.var.db
        .select()
        .from(propertyTable)
        .where(and(eq(propertyTable.id, link.propertyId), eq(propertyTable.landlordId, user.id)))
        .limit(1)
        .then((res) => res[0]);

      if (!property) {
        return c.json(
          { message: "Property not found or not owned by you", code: "PROPERTY_NOT_FOUND" },
          404
        );
      }

      // Update the tenant information
      const updated = await c.var.db
        .update(userPropertyTable)
        .set({
          weeklyRent,
          arrivalDate,
          departureDate,
          active: active !== undefined ? active : true,
        })
        .where(
          and(
            eq(userPropertyTable.userId, tenantUserId),
            eq(userPropertyTable.propertyId, link.propertyId)
          )
        )
        .returning()
        .then((res) => res[0]);

      console.log("Tenant information updated:", updated);

      return c.json({
        message: "Tenant information updated successfully",
        tenant: updated,
      });
    } catch (error: unknown) {
      console.error(error);
      return c.json({ message: "Something went wrong", code: "SERVER_ERROR" }, 500);
    }
  });
