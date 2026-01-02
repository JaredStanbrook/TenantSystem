// worker/routes/tenant/expense.tsx
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc } from "drizzle-orm";
import { html } from "hono/html"; // Import html helper

import {
  invoicePayment,
  markPaidSchema,
  extensionRequestSchema,
} from "@server/schema/invoicePayment.schema";
import { invoice } from "@server/schema/invoice.schema";
import { AppEnv } from "@server/types";
import { requireUser } from "@server/middleware/guard.middleware";
import { htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import {
  ExpensePage,
  MarkPaidModal,
  RequestExtensionModal,
} from "@views/expenses/ExpenseComponents";

export const expenseRoute = new Hono<AppEnv>();

expenseRoute.use("*", requireUser);

// --- HELPER: Fetch Expenses ---
const getExpenseList = async (db: any, userId: string) => {
  return await db
    .select({
      payment: invoicePayment,
      invoice: invoice,
    })
    .from(invoicePayment)
    .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
    .where(eq(invoicePayment.userId, userId))
    .orderBy(desc(invoice.dueDate));
};

// 1. GET /expense
expenseRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;
  const expenses = await getExpenseList(db, user.id);

  return htmxResponse(c, "My Expenses", ExpensePage(expenses));
});

// 2. GET /expense/:id/pay (Modal)
expenseRoute.get("/:id/pay", async (c) => {
  const id = Number(c.req.param("id"));
  const db = c.var.db;
  const user = c.var.auth.user!;

  const [record] = await db
    .select()
    .from(invoicePayment)
    .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

  if (!record) return c.text("Not found", 404);
  if (record.status === "paid") return c.text("Already paid", 400);

  // Return just the modal HTML
  return c.html(MarkPaidModal(record.id, record.amountOwed));
});

// 3. POST /expense/:id/pay (Action)
expenseRoute.post("/:id/pay", zValidator("form", markPaidSchema), async (c) => {
  const id = Number(c.req.param("id"));
  const { reference } = c.req.valid("form");
  const db = c.var.db;
  const user = c.var.auth.user!;

  const [record] = await db
    .select()
    .from(invoicePayment)
    .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

  if (!record) return c.text("Unauthorized", 403);

  await db
    .update(invoicePayment)
    .set({
      tenantMarkedPaidAt: new Date(),
      paymentReference: reference,
    })
    .where(eq(invoicePayment.id, id));

  // --- FIX: Handle Modal Closing ---
  if (c.req.header("HX-Request")) {
    // 1. Fetch fresh data
    const expenses = await getExpenseList(db, user.id);

    // 2. Render new list AND clear modal container via OOB
    return c.html(html`
      ${ExpensePage(expenses)}
      <div id="modal-container" hx-swap-oob="innerHTML"></div>
      ${htmxToast(c, "Payment flagged. Waiting for approval.", { type: "success" })}
    `);
  }

  // Fallback for non-JS
  return c.redirect("/expense");
});

// 4. GET /expense/:id/extend (Modal)
expenseRoute.get("/:id/extend", async (c) => {
  const id = Number(c.req.param("id"));
  const db = c.var.db;
  const user = c.var.auth.user!;

  const [record] = await db
    .select({ payment: invoicePayment, invoice: invoice })
    .from(invoicePayment)
    .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
    .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

  if (!record) return c.text("Not found", 404);

  const daysOverdue = (Date.now() - record.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOverdue > 14) {
    // Return error toast directly if invoked via HTMX
    return c.text("Severely overdue", 400);
  }

  return c.html(RequestExtensionModal(record.payment.id, record.invoice.dueDate));
});

// 5. POST /expense/:id/extend (Action)
expenseRoute.post("/:id/extend", zValidator("form", extensionRequestSchema), async (c) => {
  const id = Number(c.req.param("id"));
  const { requestedDate, reason } = c.req.valid("form");
  const db = c.var.db;
  const user = c.var.auth.user!;

  const [record] = await db
    .select()
    .from(invoicePayment)
    .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

  if (!record) return c.text("Unauthorized", 403);

  await db
    .update(invoicePayment)
    .set({
      extensionStatus: "pending",
      extensionRequestedDate: requestedDate,
      extensionReason: reason,
    })
    .where(eq(invoicePayment.id, id));

  // --- FIX: Handle Modal Closing ---
  if (c.req.header("HX-Request")) {
    const expenses = await getExpenseList(db, user.id);
    return c.html(html`
      ${ExpensePage(expenses)}
      <div id="modal-container" hx-swap-oob="innerHTML"></div>
      ${htmxToast(c, "Extension requested.", { type: "success" })}
    `);
  }

  return c.redirect("/expense");
});
