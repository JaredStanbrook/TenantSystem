import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { html } from "hono/html";
import { htmxResponse, htmxToast, flashToast } from "@server/lib/htmx-helpers";
import { requireUser } from "@server/middleware/guard.middleware";
import {
  BILL_RECORD_TYPES,
  type BillingRecordType,
} from "@server/schema/billing.shared";
import { BillingService, getEffectiveDueDate } from "@server/services/billing.service";
import type { AppEnv } from "@server/types";
import {
  ExpensePage,
  MarkPaidModal,
  RequestExtensionModal,
} from "@views/expenses/ExpenseComponents";

export const expenseRoute = new Hono<AppEnv>();

expenseRoute.use("*", requireUser);

const markPaidSchema = z.object({
  reference: z.string().trim().max(255).optional(),
});

const extensionRequestSchema = z.object({
  requestedDate: z.coerce.date(),
  reason: z.string().trim().max(1000).optional(),
});

const recordParamSchema = z.object({
  recordType: z.enum(BILL_RECORD_TYPES),
  id: z.coerce.number().int().positive(),
});

const getExpenseList = async (db: AppEnv["Variables"]["db"], userId: string) =>
  BillingService.listForTenant(db, userId);

const getOwnedRecord = async (
  c: any,
  recordType: BillingRecordType,
  id: number,
) => {
  const user = c.var.auth.user!;
  return BillingService.getForTenant(c.var.db, user.id, recordType, id);
};

expenseRoute.get("/", async (c) => {
  const user = c.var.auth.user!;
  const expenses = await getExpenseList(c.var.db, user.id);
  return htmxResponse(c, "My Expenses", ExpensePage(expenses));
});

expenseRoute.get(
  "/:recordType/:id/pay",
  zValidator("param", recordParamSchema),
  async (c) => {
    const { recordType, id } = c.req.valid("param");
    const record = await getOwnedRecord(c, recordType, id);

    if (!record) return c.text("Not found", 404);
    if (record.status === "paid") return c.text("Already paid", 400);

    return c.html(MarkPaidModal(record.recordType, record.id, record.totalAmount));
  },
);

expenseRoute.post(
  "/:recordType/:id/pay",
  zValidator("param", recordParamSchema),
  zValidator("form", markPaidSchema),
  async (c) => {
    const { recordType, id } = c.req.valid("param");
    const { reference } = c.req.valid("form");
    const user = c.var.auth.user!;

    try {
      const record = await getOwnedRecord(c, recordType, id);
      if (!record) {
        flashToast(c, "Payment not found", { type: "error" });
        return c.text("Unauthorized", 403);
      }

      if (record.tenantMarkedPaidAt) {
        flashToast(c, "Payment already marked as paid", { type: "info" });
        return c.redirect("/expense");
      }

      await BillingService.markTenantPaid(c.var.db, recordType, id, reference);

      if (c.req.header("HX-Request")) {
        const expenses = await getExpenseList(c.var.db, user.id);
        return c.html(html`
          ${ExpensePage(expenses)}
          <div id="modal-container" hx-swap-oob="innerHTML"></div>
          ${htmxToast(c, "Payment flagged. Waiting for landlord approval.", { type: "success" })}
        `);
      }

      flashToast(c, "Payment flagged. Waiting for landlord approval.", { type: "success" });
      return c.redirect("/expense");
    } catch (error) {
      console.error("Failed to mark payment as paid:", error);
      flashToast(c, "Failed to mark payment as paid", { type: "error" });
      return c.redirect("/expense");
    }
  },
);

expenseRoute.get(
  "/:recordType/:id/extend",
  zValidator("param", recordParamSchema),
  async (c) => {
    const { recordType, id } = c.req.valid("param");
    const record = await getOwnedRecord(c, recordType, id);

    if (!record) return c.text("Not found", 404);

    const daysOverdue =
      (Date.now() - getEffectiveDueDate(record).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOverdue > 14) {
      return c.text("Severely overdue", 400);
    }

    return c.html(RequestExtensionModal(record.recordType, record.id, record.dueDate));
  },
);

expenseRoute.post(
  "/:recordType/:id/extend",
  zValidator("param", recordParamSchema),
  zValidator("form", extensionRequestSchema),
  async (c) => {
    const { recordType, id } = c.req.valid("param");
    const { requestedDate, reason } = c.req.valid("form");
    const user = c.var.auth.user!;

    try {
      const record = await getOwnedRecord(c, recordType, id);
      if (!record) {
        flashToast(c, "Payment not found", { type: "error" });
        return c.text("Unauthorized", 403);
      }

      if (record.extensionStatus === "pending") {
        flashToast(c, "Extension request already pending", { type: "info" });
        return c.redirect("/expense");
      }

      if (record.extensionStatus === "approved") {
        flashToast(c, "Extension already approved", { type: "info" });
        return c.redirect("/expense");
      }

      await BillingService.requestExtension(c.var.db, recordType, id, requestedDate, reason);

      if (c.req.header("HX-Request")) {
        const expenses = await getExpenseList(c.var.db, user.id);
        return c.html(html`
          ${ExpensePage(expenses)}
          <div id="modal-container" hx-swap-oob="innerHTML"></div>
          ${htmxToast(c, "Extension requested. Awaiting landlord review.", { type: "success" })}
        `);
      }

      flashToast(c, "Extension requested. Awaiting landlord review.", { type: "success" });
      return c.redirect("/expense");
    } catch (error) {
      console.error("Failed to request extension:", error);
      flashToast(c, "Failed to request extension", { type: "error" });
      return c.redirect("/expense");
    }
  },
);

expenseRoute.post(
  "/:recordType/:id/cancel-extension",
  zValidator("param", recordParamSchema),
  async (c) => {
    const { recordType, id } = c.req.valid("param");
    const user = c.var.auth.user!;

    try {
      const record = await getOwnedRecord(c, recordType, id);
      if (!record) {
        flashToast(c, "Payment not found", { type: "error" });
        return c.text("Unauthorized", 403);
      }

      if (record.extensionStatus !== "pending") {
        flashToast(c, "No pending extension to cancel", { type: "info" });
        return c.redirect("/expense");
      }

      await BillingService.cancelExtensionRequest(c.var.db, recordType, id);

      if (c.req.header("HX-Request")) {
        const expenses = await getExpenseList(c.var.db, user.id);
        return c.html(html`
          ${ExpensePage(expenses)}
          <div id="modal-container" hx-swap-oob="innerHTML"></div>
          ${htmxToast(c, "Extension request cancelled", { type: "success" })}
        `);
      }

      flashToast(c, "Extension request cancelled", { type: "success" });
      return c.redirect("/expense");
    } catch (error) {
      console.error("Failed to cancel extension:", error);
      flashToast(c, "Failed to cancel extension", { type: "error" });
      return c.redirect("/expense");
    }
  },
);
