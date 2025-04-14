import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { dbMiddleware, luciaMiddleware, userMiddleware } from "../db";

import {
  expense as expenseTable,
  insertExpenseSchema,
  selectExpenseSchema,
} from "../db/schema/expense";

import { property as propertyTable } from "../db/schema/property";

import { user as userTable } from "../db/schema/user";
import { eq, desc, sum, and } from "drizzle-orm";

import { createExpenseSchema } from "../sharedTypes";
import { userProperty as userPropertyTable } from "../db/schema/userProperty";

export const expenseRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .use("*", luciaMiddleware)
  .use("*", userMiddleware)
  .get("/", async (c) => {
    const db = c.var.db;

    const expense = await db
      .select({
        id: expenseTable.id,
        email: userTable.email,
        title: expenseTable.title,
        amount: expenseTable.amount,
        date: expenseTable.expenseDate,
        createdAt: expenseTable.createdAt,
      })
      .from(expenseTable)
      .innerJoin(userTable, eq(expenseTable.userId, userTable.id)) // Join user table
      //.where(eq(expenseTable.userId, user.id))
      .orderBy(desc(expenseTable.createdAt))
      .limit(100);

    return c.json({ expense });
  })
  .post("/", zValidator("json", createExpenseSchema), async (c) => {
    const expense = await c.req.valid("json");
    const user = c.var.user!;

    try {
      const property = await c.var.db
        .select({ id: userPropertyTable.propertyId })
        .from(userPropertyTable)
        .where(eq(userPropertyTable.userId, user.id))
        .limit(1);
      const validatedExpense = insertExpenseSchema.parse({
        ...expense,
        userId: user.id,
      });
      const parsedExpense = {
        ...validatedExpense,
        amount: parseFloat(validatedExpense.amount),
        propertyId: property[0].id,
      };

      const result = await c.var.db
        .insert(expenseTable)
        .values(parsedExpense)
        .returning()
        .then((res) => res[0]);

      c.status(201);
      return c.json(result);
    } catch (error: unknown) {
      console.error(error);

      if (error instanceof Error && error.message.includes("NOT NULL")) {
        return c.json({ message: "You don't live at a property!", code: "NO_PROPERTY" }, 400);
      }

      return c.json({ message: "Something went wrong", code: "SERVER_ERROR" }, 400);
    }
  })
  .get("/total-owed", async (c) => {
    const user = c.var.user!;
    const result = await c.var.db
      .select({ total: sum(expenseTable.amount) })
      .from(expenseTable)
      .where(eq(expenseTable.userId, user.id))
      .limit(1)
      .then((res) => res[0]);
    return c.json(result);
  })
  .get("/:id{[0-9]+}", async (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const user = c.var.user!;

    const expense = await c.var.db
      .select()
      .from(expenseTable)
      .where(and(eq(expenseTable.userId, user.id), eq(expenseTable.id, id)))
      .then((res) => res[0]);

    if (!expense) {
      return c.notFound();
    }

    return c.json({ expense });
  })
  .delete("/:id{[0-9]+}", async (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const user = c.var.user!;

    const expense = await c.var.db
      .delete(expenseTable)
      .where(and(eq(expenseTable.userId, user.id), eq(expenseTable.id, id)))
      .returning()
      .then((res) => res[0]);

    if (!expense) {
      return c.notFound();
    }

    return c.json({ expense: expense });
  });
