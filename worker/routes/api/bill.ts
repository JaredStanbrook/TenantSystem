import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { dbMiddleware, luciaMiddleware, userMiddleware } from "../db";

import { bill as billTable, insertBillSchema, selectBillSchema } from "../db/schema/bill";
import { userBill as userBillTable } from "../db/schema/userBill";
import { eq, desc, sum, and, isNull, lt, asc } from "drizzle-orm";

import { createBillSchema } from "../sharedTypes";

export const billRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .use("*", luciaMiddleware)
  .use("*", userMiddleware)
  .get("/", async (c) => {
    const db = c.var.db;
    const user = c.var.user!;

    let bills;

    if (user.role === "landlord") {
      bills = await db
        .select()
        .from(billTable)
        .where(eq(billTable.landlordId, user.id))
        .orderBy(desc(billTable.createdAt))
        .limit(100);
    } else {
      bills = await db
        .select()
        .from(userBillTable)
        .innerJoin(billTable, eq(userBillTable.billId, billTable.id))
        .where(eq(userBillTable.userId, user.id))
        .orderBy(desc(billTable.createdAt))
        .limit(100);
    }

    return c.json({ bills });
  })
  .get("/tenants", async (c) => {
    const db = c.var.db;
    const user = c.var.user!;

    // Tenant: get all bills linked via userBill
    const joined = await db
      .select()
      .from(userBillTable)
      .innerJoin(billTable, eq(userBillTable.billId, billTable.id))
      .where(eq(userBillTable.userId, user.id))
      .orderBy(desc(billTable.createdAt))
      .limit(100);

    // Extract just the bill info from the join
    const bills = joined.map((row) => row.bill);

    return c.json({ bills });
  })
  .post("/", zValidator("json", createBillSchema), async (c) => {
    const user = c.var.user!;
    const db = c.var.db;

    if (user.role !== "landlord") {
      return c.json({ error: "Only landlords can create bills" }, 403);
    }

    const bill = await c.req.valid("json");

    const validatedBill = insertBillSchema.parse({
      ...bill,
      landlordId: user.id,
    });

    const newBill = await db
      .insert(billTable)
      .values({
        ...validatedBill,
        amount: parseFloat(validatedBill.amount),
      })
      .returning()
      .then((res) => res[0]);

    // Insert user_bill entries for all assigned tenant IDs
    if (Array.isArray(bill.tenantIds)) {
      const entries = bill.tenantIds.map((tenantId: string) => ({
        userId: tenantId,
        billId: newBill.id,
      }));

      await db.insert(userBillTable).values(entries);
    }

    c.status(201);
    return c.json(newBill);
  })
  .get("/total-owed", async (c) => {
    const user = c.var.user!;
    const db = c.var.db;

    if (user.role !== "tenant") return c.json({ total: 0 });

    const total = await db
      .select({ total: sum(billTable.amount) })
      .from(userBillTable)
      .innerJoin(billTable, eq(userBillTable.billId, billTable.id))
      .where(eq(userBillTable.userId, user.id))
      .then((res) => res[0]?.total ?? 0);

    return c.json({ total });
  })
  .get("/overdue-bills", async (c) => {
    const user = c.var.user!;
    const db = c.var.db;

    // Only tenants can have overdue bills
    if (user.role !== "tenant") return c.json({ bills: [] });

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const overdueBills = await db
      .select({
        id: billTable.id,
        type: billTable.type,
        title: billTable.title,
        amount: billTable.amount,
        dateDue: billTable.dueDate,
        description: billTable.description,
      })
      .from(userBillTable)
      .innerJoin(billTable, eq(userBillTable.billId, billTable.id))
      .where(
        and(
          eq(userBillTable.userId, user.id),
          lt(billTable.dueDate, today) // Only bills where due date has passed
        )
      )
      .orderBy(asc(billTable.dueDate)); // Oldest overdue first

    return c.json({ bills: overdueBills });
  })
  .get("/:id{[0-9]+}", async (c) => {
    const user = c.var.user!;
    const id = Number.parseInt(c.req.param("id"));

    let bill;

    if (user.role === "landlord") {
      bill = await c.var.db
        .select()
        .from(billTable)
        .where(and(eq(billTable.id, id), eq(billTable.landlordId, user.id)))
        .then((res) => res[0]);
    } else {
      bill = await c.var.db
        .select()
        .from(userBillTable)
        .innerJoin(billTable, eq(userBillTable.billId, billTable.id))
        .where(and(eq(userBillTable.userId, user.id), eq(userBillTable.billId, id)))
        .then((res) => res[0]?.bill);
    }

    if (!bill) return c.notFound();

    return c.json({ bill });
  })
  .delete("/:id{[0-9]+}", async (c) => {
    const user = c.var.user!;
    const id = Number.parseInt(c.req.param("id"));

    if (user.role !== "landlord") return c.json({ error: "Only landlords can delete bills" }, 403);

    const deleted = await c.var.db
      .delete(billTable)
      .where(and(eq(billTable.id, id), eq(billTable.landlordId, user.id)))
      .returning()
      .then((res) => res[0]);

    if (!deleted) return c.notFound();

    return c.json({ bill: deleted });
  });
