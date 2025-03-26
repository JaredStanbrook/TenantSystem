import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateId, Scrypt } from "lucia";

import { eq, desc, sum, and } from "drizzle-orm";
import { dbMiddleware, luciaMiddleware } from "../db";

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

import { createUserSchema, authUserSchema } from "../sharedTypes";
import { ErrorBoundary } from "hono/jsx";

export const authRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .use("*", luciaMiddleware)
  .get("/", async (c) => {
    const db = c.var.db;

    const user = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
      })
      .from(userTable)
      .orderBy(desc(userTable.firstName))
      .limit(100);

    return c.json({ user });
  })
  .get("/me", async (c) => {
    try {
      const db = c.var.db;
      const userId = c.var.user!.id;

      // Fetch user details
      const user = await db
        .select({
          email: userTable.email,
          firstName: userTable.firstName,
          lastName: userTable.lastName,
          role: userTable.role,
        })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      if (!user.length) {
        return c.json({ error: "User not found" }, 404);
      }

      // Fetch properties where the user is a landlord
      const landlordProperties = await db
        .select({
          id: propertyTable.id,
          address: propertyTable.address,
        })
        .from(propertyTable)
        .where(eq(propertyTable.landlordId, userId));

      // Fetch properties where the user is a tenant
      const tenantProperties = await db
        .select({
          id: propertyTable.id,
          address: propertyTable.address,
        })
        .from(propertyTable)
        .innerJoin(userPropertyTable, eq(propertyTable.id, userPropertyTable.propertyId))
        .where(eq(userPropertyTable.userId, userId));

      // Parse user details
      const parsedUser = authUserSchema.parse(user[0]);

      return c.json({
        ...parsedUser,
        landlordProperties,
        tenantProperties,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: "Invalid data", details: error.errors }, 401);
      } else {
        return c.json({ error: "Something went wrong" }, 500);
      }
    }
  })
  .post("/signup", zValidator("json", createUserSchema), async (c) => {
    const { email, password, firstName, lastName, role, address } = c.req.valid("json");
    const lucia = c.var.lucia!;

    const hashedPassword = await new Scrypt().hash(password);
    const userId = generateId(15);

    try {
      const validatedUser = insertUserSchema.parse({
        id: userId,
        email: email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      });
      await c.var.db
        .insert(userTable)
        .values(validatedUser)
        .returning()
        .then((res) => res[0]);

      if (role == "tenant") {
        // Find an existing property with the given address
        const [property] = await c.var.db
          .select({ id: propertyTable.id })
          .from(propertyTable)
          .where(eq(propertyTable.address, address))
          .limit(1);

        if (!property) {
          return c.json({ message: "Property not found", code: "PROPERTY_NOT_FOUND" }, 400);
        }

        // Link user to the property in user_property table
        await c.var.db.insert(userPropertyTable).values({
          userId,
          propertyId: property.id,
        });

        console.log("New user created and linked to existing property", validatedUser, property);
      } else {
        console.log("New user created!", validatedUser);
      }
      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      c.header("Set-Cookie", sessionCookie.serialize(), {
        append: true,
      });

      return c.redirect("/");
    } catch (error: unknown) {
      console.error(error);

      if (error instanceof Error && error.message.includes("UNIQUE")) {
        return c.json({ message: "User already exists", code: "USER_EXISTS" }, 400);
      }

      return c.json({ message: "Something went wrong", code: "SERVER_ERROR" }, 400);
    }
  })
  .post(
    "/login",
    zValidator(
      "form",
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    ),
    async (c) => {
      const { email, password } = c.req.valid("form");
      const lucia = c.var.lucia!;

      const user = await c.var.db.select().from(userTable).where(eq(userTable.email, email)).get();

      if (!user) {
        return c.body("Invalid email or password", 400);
      }
      const validPassword = await new Scrypt().verify(user.password, password);
      if (!validPassword) {
        return c.body("Invalid email or password", 400);
      }

      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      c.header("Set-Cookie", sessionCookie.serialize(), {
        append: true,
      });
      return c.redirect("/");
    }
  )
  .post("/logout", async (c) => {
    const lucia = c.var.lucia!;

    const session = c.var.session;
    if (session) {
      await lucia.invalidateSession(session.id);
    }
    const sessionCookie = lucia.createBlankSessionCookie();
    c.header("Set-Cookie", sessionCookie.serialize(), {
      append: true,
    });
    return c.redirect("/");
  })
  .delete("/:id{[a-zA-Z0-9]+}", async (c) => {
    const id = c.req.param("id");
    const user = c.var.user!;

    if (id === user.id) {
      return c.json({ error: "You cannot delete your own account" }, { status: 403 });
    }

    const deletedUser = await c.var.db
      .delete(userTable)
      .where(eq(userTable.id, id))
      .returning()
      .then((res) => res[0]);

    if (!deletedUser) {
      return c.notFound();
    }
    return c.json({ user: deletedUser });
  })
  .all("/*", async (c) => {
    // Handle unmatched routes with proper response
    return c.json({ error: "Route not found" }, 404);
  });
