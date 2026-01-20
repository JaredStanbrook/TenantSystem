// worker/services/invoice.service.ts
import { eq, and, sql, ne } from "drizzle-orm";
import { invoice, INVOICE_STATUS_VALUES } from "../schema/invoice.schema";
import { invoicePayment } from "../schema/invoicePayment.schema";
import { AppEnv } from "../types";

// --- Types ---
type DrizzleDB = AppEnv["Variables"]["db"];

export const InvoiceService = {
  /**
   * Enforces the Accounting Invariant: Sum(splits) === Total Amount
   */
  validateIntegrity(totalAmountCents: number, splits: { amountOwed: number }[]) {
    const sumSplits = splits.reduce((acc, s) => acc + s.amountOwed, 0);

    // Allow a 0 total invoice (e.g. record keeping), but splits must match
    if (sumSplits !== totalAmountCents) {
      throw new Error(
        `Accounting Mismatch: Total is ${(totalAmountCents / 100).toFixed(2)}, ` +
          `but splits sum to ${(sumSplits / 100).toFixed(2)}`,
      );
    }
    return true;
  },

  /**
   * RECONCILE STATUS
   * This is the Authoritative State Machine.
   * calling this updates the Invoice Status based on its Payments.
   */
  async reconcileStatus(db: DrizzleDB, invoiceId: number) {
    // 1. Fetch current state of payments
    const payments = await db
      .select()
      .from(invoicePayment)
      .where(eq(invoicePayment.invoiceId, invoiceId));

    const [inv] = await db.select().from(invoice).where(eq(invoice.id, invoiceId));

    if (!inv) return;

    // 2. Derive Aggregates
    const totalAmount = inv.totalAmount;
    const totalPaid = payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const activePayments = payments.filter((p) => p.status !== "void"); // If we had a void status for payments

    // 3. Determine Status
    let newStatus: (typeof INVOICE_STATUS_VALUES)[number] = "open";

    // A. PAID: Fully settled
    if (totalPaid >= totalAmount && totalAmount > 0) {
      newStatus = "paid";
    }
    // B. PARTIAL: Some money collected
    else if (totalPaid > 0) {
      newStatus = "partial";
    }
    // C. OVERDUE: Check extensions
    else {
      // Check if ANY active tenant is overdue
      const now = new Date();
      const isOverdue = payments.some((p) => {
        if (p.status === "paid") return false;

        // Effective Due Date = Invoice Due Date + Extension Days
        const extensionMs = (p.dueDateExtensionDays || 0) * 24 * 60 * 60 * 1000;
        const effectiveDueDate = new Date(inv.dueDate.getTime() + extensionMs);

        return now > effectiveDueDate;
      });

      if (isOverdue) newStatus = "overdue";
    }

    // 4. Update DB if changed
    if (inv.status !== newStatus) {
      await db.update(invoice).set({ status: newStatus }).where(eq(invoice.id, invoiceId));
    }
  },

  /**
   * Lazy Overdue Check
   * Run this on GET lists to ensure "Overdue" status is fresh relative to wall-clock time.
   */
  async refreshOverdueStatuses(db: DrizzleDB, propertyIds: number[]) {
    // This is a naive implementation. In a huge system, use a Worker.
    // For < 1000 open invoices, this is fine.

    const openInvoices = await db
      .select({
        id: invoice.id,
        dueDate: invoice.dueDate,
      })
      .from(invoice)
      .where(
        and(
          ne(invoice.status, "paid"),
          ne(invoice.status, "void"),
          // In real implementation, filter by propertyIds if provided
        ),
      );

    // We only need to check invoices that MIGHT be overdue now
    const now = new Date();
    for (const inv of openInvoices) {
      // Optimization: Only reconcile if the base date is passed
      if (now > inv.dueDate) {
        await this.reconcileStatus(db, inv.id);
      }
    }
  },

  /**
   * Helper to parse form inputs safely
   */
  parseSplits(ids: string | string[], amounts: string | string[], extensions: string | string[]) {
    const idArray = [].concat(ids as any).filter(Boolean);
    const amountArray = [].concat(amounts as any);
    const extArray = [].concat(extensions as any);

    return idArray.map((userId, i) => ({
      userId: userId as string,
      amountCents: Math.round(parseFloat((amountArray[i] || "0") as string) * 100),
      extensionDays: parseInt((extArray[i] || "0") as string) || 0,
    }));
  },
};
