import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { dbMiddleware, luciaMiddleware } from "../db";

import {
  property as propertyTable,
  insertPropertySchema,
  selectPropertySchema,
} from "../db/schema/property";
import { createPropertySchema } from "../sharedTypes";

import { user as userTable } from "../db/schema/user";
import { userProperty as userPropertyTable } from "../db/schema/userProperty";
import { eq, desc, sum, and } from "drizzle-orm";

export const propertyRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .use("*", luciaMiddleware)
  .get("/", async (c) => {
    const user = c.var.user!;
    const db = c.var.db;

    const properties = await db
      .select({
        id: propertyTable.id,
        address: propertyTable.address,
      })
      .from(propertyTable)
      .where(eq(propertyTable.landlordId, user.id));

    return c.json({ properties });
  })
  .get("/:id/tenants", async (c) => {
    const user = c.var.user!;
    const db = c.var.db;
    const propertyId = parseInt(c.req.param("id"));

    // Check if the user is the landlord of the property
    const property = await db
      .select()
      .from(propertyTable)
      .where(eq(propertyTable.id, propertyId))
      .limit(1);

    if (!property.length || property[0].landlordId !== user.id) {
      return c.json({ error: "Unauthorized or property not found" }, 403);
    }

    // Fetch tenants for the property
    const tenants = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
        phone: userTable.phone,
      })
      .from(userPropertyTable)
      .innerJoin(userTable, eq(userPropertyTable.userId, userTable.id))
      .where(eq(userPropertyTable.propertyId, propertyId));

    return c.json({ tenants });
  })
  .post("/", zValidator("json", createPropertySchema), async (c) => {
    const property = await c.req.valid("json");
    const user = c.var.user!;

    try {
      const validatedProperty = insertPropertySchema.parse({
        ...property,
        landlordId: user.id,
      });

      const result = await c.var.db
        .insert(propertyTable)
        .values(validatedProperty)
        .returning()
        .then((res) => res[0]);

      c.status(201);
      return c.json(result);
    } catch (error: unknown) {
      console.error(error);

      if (error instanceof Error && error.message.includes("UNIQUE")) {
        return c.json({ message: "Property already exists", code: "PROPERTY_EXISTS" }, 400);
      }

      return c.json({ message: "Something went wrong", code: "SERVER_ERROR" }, 400);
    }
  })
  .delete("/:id{[0-9]+}", async (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const user = c.var.user!;

    const expense = await c.var.db
      .delete(propertyTable)
      .where(and(eq(propertyTable.landlordId, user.id), eq(propertyTable.id, id)))
      .returning()
      .then((res) => res[0]);

    if (!expense) {
      return c.notFound();
    }

    return c.json({ expense: expense });
  });
