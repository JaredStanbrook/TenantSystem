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
import { htmxResponse, htmxToast, flashToast } from "@server/lib/htmx-helpers";
import { InvoiceService } from "@server/services/invoice.service";
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

  try {
    // Verify ownership
    const [record] = await db
      .select()
      .from(invoicePayment)
      .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

    if (!record) {
      flashToast(c, "Payment not found", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Check if already marked as paid
    if (record.tenantMarkedPaidAt) {
      flashToast(c, "Payment already marked as paid", { type: "info" });
      return c.redirect("/expense");
    }

    // Update payment record
    await db
      .update(invoicePayment)
      .set({
        tenantMarkedPaidAt: new Date(),
        paymentReference: reference || null,
      })
      .where(eq(invoicePayment.id, id));

    // Reconcile invoice status (important for updating overdue/partial statuses)
    await InvoiceService.reconcileStatus(db, record.invoiceId);

    // Handle HTMX request
    if (c.req.header("HX-Request")) {
      const expenses = await getExpenseList(db, user.id);
      return c.html(html`
        ${ExpensePage(expenses)}
        <div id="modal-container" hx-swap-oob="innerHTML"></div>
        ${htmxToast(c, "Payment flagged. Waiting for landlord approval.", { type: "success" })}
      `);
    }

    // Fallback for non-JS
    flashToast(c, "Payment flagged. Waiting for landlord approval.", { type: "success" });
    return c.redirect("/expense");
  } catch (error: any) {
    console.error("Failed to mark payment as paid:", error);
    flashToast(c, "Failed to mark payment as paid", { type: "error" });
    return c.redirect("/expense");
  }
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

  try {
    // Verify ownership
    const [record] = await db
      .select()
      .from(invoicePayment)
      .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

    if (!record) {
      flashToast(c, "Payment not found", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Check if already has a pending extension
    if (record.extensionStatus === "pending") {
      flashToast(c, "Extension request already pending", { type: "info" });
      return c.redirect("/expense");
    }

    // Check if extension was already approved
    if (record.extensionStatus === "approved") {
      flashToast(c, "Extension already approved", { type: "info" });
      return c.redirect("/expense");
    }

    // Update payment record with extension request
    await db
      .update(invoicePayment)
      .set({
        extensionStatus: "pending",
        extensionRequestedDate: requestedDate,
        extensionReason: reason || null,
      })
      .where(eq(invoicePayment.id, id));

    // Note: We don't reconcile status here as the extension is just a request
    // Status reconciliation happens when landlord approves/rejects

    // Handle HTMX request
    if (c.req.header("HX-Request")) {
      const expenses = await getExpenseList(db, user.id);
      return c.html(html`
        ${ExpensePage(expenses)}
        <div id="modal-container" hx-swap-oob="innerHTML"></div>
        ${htmxToast(c, "Extension requested. Awaiting landlord review.", { type: "success" })}
      `);
    }

    // Fallback for non-JS
    flashToast(c, "Extension requested. Awaiting landlord review.", { type: "success" });
    return c.redirect("/expense");
  } catch (error: any) {
    console.error("Failed to request extension:", error);
    flashToast(c, "Failed to request extension", { type: "error" });
    return c.redirect("/expense");
  }
});
expenseRoute.post("/:id/cancel-extension", async (c) => {
  const id = Number(c.req.param("id"));
  const db = c.var.db;
  const user = c.var.auth.user!;

  try {
    // Verify ownership
    const [record] = await db
      .select()
      .from(invoicePayment)
      .where(and(eq(invoicePayment.id, id), eq(invoicePayment.userId, user.id)));

    if (!record) {
      flashToast(c, "Payment not found", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Check if there's a pending extension to cancel
    if (record.extensionStatus !== "pending") {
      flashToast(c, "No pending extension to cancel", { type: "info" });
      return c.redirect("/expense");
    }

    // Reset extension fields
    await db
      .update(invoicePayment)
      .set({
        extensionStatus: "none",
        extensionRequestedDate: null,
        extensionReason: null,
      })
      .where(eq(invoicePayment.id, id));

    // Handle HTMX request
    if (c.req.header("HX-Request")) {
      const expenses = await getExpenseList(db, user.id);
      return c.html(html`
        ${ExpensePage(expenses)}
        <div id="modal-container" hx-swap-oob="innerHTML"></div>
        ${htmxToast(c, "Extension request cancelled", { type: "success" })}
      `);
    }

    // Fallback for non-JS
    flashToast(c, "Extension request cancelled", { type: "success" });
    return c.redirect("/expense");
  } catch (error: any) {
    console.error("Failed to cancel extension:", error);
    flashToast(c, "Failed to cancel extension", { type: "error" });
    return c.redirect("/expense");
  }
});
