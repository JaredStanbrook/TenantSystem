import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { dbMiddleware, luciaMiddleware } from "../db";

import { bills as billTable, insertBillSchema, selectBillSchema } from "../db/schema/bills";
import { users as userTable } from "../db/schema/users";
import { eq, desc, sum, and } from "drizzle-orm";

import { createBillSchema } from "../sharedTypes";

export const billRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .use("*", luciaMiddleware)
  .get("/", async (c) => {
    const user = c.var.user!;
    const db = c.var.db;

    const bill = await db
      .select({
        id: billTable.id,
        email: userTable.email,
        title: billTable.title,
        amount: billTable.amount,
        date: billTable.dateDue,
        createdAt: billTable.createdAt,
      })
      .from(billTable)
      .innerJoin(userTable, eq(billTable, userTable.id)) // Join user table
      //.where(eq(billTable.userId, user.id))
      .orderBy(desc(billTable.createdAt))
      .limit(100);

    return c.json({ bill });
  })
  .post("/", zValidator("json", createBillSchema), async (c) => {
    const bill = await c.req.valid("json");
    const user = c.var.user!;

    const validatedBill = insertBillSchema.parse({
      ...bill,
      userId: user.id,
    });
    const parsedBill = {
      ...validatedBill,
      amount: parseFloat(validatedBill.amount), // Ensure amount is a number
    };

    const result = await c.var.db
      .insert(billTable)
      .values(parsedBill)
      .returning()
      .then((res) => res[0]);

    c.status(201);
    return c.json(result);
  });
/*
  .get("/total-owed", async (c) => {
    const user = c.var.user!;
    const result = await c.var.db
      .select({ total: sum(billTable.amount) })
      .from(billTable)
      .where(eq(billTable.userId, user.id))
      .limit(1)
      .then((res) => res[0]);
    return c.json(result);
  })
  .get("/:id{[0-9]+}", async (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const user = c.var.user!;

    const bill = await c.var.db
      .select()
      .from(billTable)
      .where(and(eq(billTable.userId, user.id), eq(billTable.id, id)))
      .then((res) => res[0]);

    if (!bill) {
      return c.notFound();
    }

    return c.json({ bill });
  })
  .delete("/:id{[0-9]+}", async (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const user = c.var.user!;

    const bill = await c.var.db
      .delete(billTable)
      .where(and(eq(billTable.userId, user.id), eq(billTable.id, id)))
      .returning()
      .then((res) => res[0]);

    if (!bill) {
      return c.notFound();
    }

    return c.json({ bill: bill });
  });
  */
