// worker/services/invoice.service.ts
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInCalendarWeeks,
  startOfDay,
  nextDay,
  isSameDay,
  getDay,
  format,
} from "date-fns";

import { eq, and, sql, ne } from "drizzle-orm";
import { invoice, INVOICE_STATUSES } from "../schema/invoice.schema";
import { invoicePayment } from "../schema/invoicePayment.schema";
import { AppEnv } from "../types";
import { tenancy } from "@server/schema/tenancy.schema";

// --- Types ---
type DrizzleDB = AppEnv["Variables"]["db"];
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday to Saturday

export interface CreateInvoiceWithPaymentParams {
  invoiceData: {
    propertyId: number;
    type: string;
    description: string;
    totalAmount: number;
    dueDate: Date | number;
    status?: string;
    idempotencyKey?: string;
  };
  payments: Array<{
    userId: string;
    amountOwed: number;
    status?: string;
  }>;
}

export interface BondInvoiceParams {
  propertyId: number;
  tenancyId: number;
  userId: string;
  bondAmount: number;
  dueDate: Date | number;
}

export interface RentInvoiceParams {
  propertyId: number;
  tenancyId: number;
  userId: string;
  rentAction: {
    start: Date;
    end: Date;
    amountCents: number;
    idempotencyKey: string;
  };
  roomName?: string;
}

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
   * Create invoice with associated payments in batch
   * Returns the created invoice IDs or throws with idempotency info
   */
  async createInvoicesWithPayments(
    db: DrizzleDB,
    invoices: CreateInvoiceWithPaymentParams[],
  ): Promise<{ invoiceIds: number[]; success: boolean; message?: string }> {
    const createdInvoiceIds: number[] = [];

    const cleanupInvoices = async () => {
      if (createdInvoiceIds.length > 0) {
        try {
          await db.delete(invoice).where(
            sql`${invoice.id} IN (${sql.join(
              createdInvoiceIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          );
        } catch (cleanupErr) {
          console.error("Failed to cleanup invoices:", cleanupErr);
        }
      }
    };

    try {
      // Validate all invoices first
      for (const inv of invoices) {
        this.validateIntegrity(inv.invoiceData.totalAmount, inv.payments);
      }

      // STEP 1: Create all invoices in batch
      const invoiceValues = invoices.map((inv) => ({
        ...inv.invoiceData,
        status: inv.invoiceData.status || "open",
      }));

      const createdInvoices = await db.insert(invoice).values(invoiceValues).returning();

      createdInvoiceIds.push(...createdInvoices.map((inv) => inv.id));

      // STEP 2: Create all payments linked to invoices
      const allPayments = invoices.flatMap((inv, index) =>
        inv.payments.map((payment) => ({
          invoiceId: createdInvoices[index].id,
          userId: payment.userId,
          amountOwed: payment.amountOwed,
          status: payment.status || "pending",
        })),
      );

      if (allPayments.length > 0) {
        await db.insert(invoicePayment).values(allPayments);
      }

      return {
        invoiceIds: createdInvoiceIds,
        success: true,
      };
    } catch (error: any) {
      console.error("Failed to create invoices/payments:", error);

      // Manual rollback - cleanup any created invoices
      await cleanupInvoices();

      // Check for idempotency constraint violation
      if (error.message?.includes("UNIQUE constraint") || error.message?.includes("idempotency")) {
        return {
          invoiceIds: [],
          success: false,
          message: "IDEMPOTENCY_VIOLATION",
        };
      }

      throw error;
    }
  },

  /**
   * Helper: Create a bond invoice
   */
  async createBondInvoice(
    db: DrizzleDB,
    params: BondInvoiceParams,
  ): Promise<{ invoiceIds: number[]; success: boolean; message?: string }> {
    return this.createInvoicesWithPayments(db, [
      {
        invoiceData: {
          propertyId: params.propertyId,
          type: "other",
          description: "Bond Payment",
          totalAmount: params.bondAmount,
          dueDate: params.dueDate,
          status: "open",
          idempotencyKey: `bond-${params.tenancyId}`,
        },
        payments: [
          {
            userId: params.userId,
            amountOwed: params.bondAmount,
            status: "pending",
          },
        ],
      },
    ]);
  },

  /**
   * Helper: Create a rent invoice
   */
  async createRentInvoice(
    db: DrizzleDB,
    params: RentInvoiceParams,
  ): Promise<{ invoiceIds: number[]; success: boolean; message?: string }> {
    const description = params.roomName
      ? `Rent - ${params.roomName} (${params.rentAction.start.toLocaleDateString()} - ${params.rentAction.end.toLocaleDateString()})`
      : `Rent (${params.rentAction.start.toLocaleDateString()} - ${params.rentAction.end.toLocaleDateString()})`;

    return this.createInvoicesWithPayments(db, [
      {
        invoiceData: {
          propertyId: params.propertyId,
          type: "rent",
          description,
          totalAmount: params.rentAction.amountCents,
          dueDate: params.rentAction.start,
          status: "open",
          idempotencyKey: params.rentAction.idempotencyKey,
        },
        payments: [
          {
            userId: params.userId,
            amountOwed: params.rentAction.amountCents,
            status: "pending",
          },
        ],
      },
    ]);
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
    const activePayments = payments.filter((p) => p.status !== "void");

    // 3. Determine Status
    let newStatus: (typeof INVOICE_STATUSES)[number] = "open";

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
      const now = new Date();
      const isOverdue = payments.some((p) => {
        if (p.status === "paid") return false;

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
   */
  async refreshOverdueStatuses(db: DrizzleDB, propertyIds: number[]) {
    const openInvoices = await db
      .select({
        id: invoice.id,
        dueDate: invoice.dueDate,
      })
      .from(invoice)
      .where(and(ne(invoice.status, "paid"), ne(invoice.status, "void")));

    const now = new Date();
    for (const inv of openInvoices) {
      if (now > inv.dueDate) {
        await this.reconcileStatus(db, inv.id);
      }
    }
  },

  async processRentRun(db: DrizzleDB, tenancyId: number) {
    const data = await db.query.tenancy.findFirst({
      where: eq(tenancy.id, tenancyId),
      with: { property: true },
    });

    if (!data) throw new Error("Tenancy not found");
    if (!data.property) throw new Error("Property not found for tenancy");

    const action = await this.calculateNextRent(data.property, data);

    if (!action) return;

    const description = `Rent (${format(action.start, "dd/MM/yyyy")} - ${format(action.end, "dd/MM/yyyy")})`;

    try {
      await db.batch([
        db.insert(invoice).values({
          propertyId: data.property.id,
          type: "rent",
          description: description,
          totalAmount: action.amountCents,
          dueDate: action.start,
          status: "open",
          idempotencyKey: action.idempotencyKey,
        }),

        db
          .update(tenancy)
          .set({
            billedThroughDate: action.end,
            updatedAt: new Date(),
          })
          .where(eq(tenancy.id, tenancyId)),
      ]);

      console.log(`Generated invoice for Tenancy ${tenancyId} [${action.idempotencyKey}]`);
    } catch (e: any) {
      if (e.message && e.message.includes("UNIQUE constraint failed")) {
        console.log(
          `Skipping duplicate invoice for Tenancy ${tenancyId}: ${action.idempotencyKey}`,
        );
        return;
      }
      throw e;
    }
  },

  async calculateNextRent(
    prop: {
      rentAmount: number;
      rentFrequency: "weekly" | "fortnightly" | "monthly";
      billingAnchorDay: number;
      createdAt: Date;
    },
    ten: {
      id: number;
      billedThroughDate: Date;
      status: string;
    },
  ) {
    if (!["active", "move_in_ready", "pending_agreement", "bond_pending"].includes(ten.status)) {
      return null;
    }

    const today = startOfDay(new Date());
    const periodStart = startOfDay(ten.billedThroughDate);

    if (differenceInDays(periodStart, today) > 60) return null;

    let periodEnd: Date;
    let description = "";
    const anchorDay = prop.billingAnchorDay as DayOfWeek;

    if (prop.rentFrequency === "weekly") {
      const currentDay = getDay(periodStart);

      if (currentDay === anchorDay) {
        periodEnd = addDays(periodStart, 7);
      } else {
        periodEnd = nextDay(periodStart, anchorDay);
      }
    } else if (prop.rentFrequency === "fortnightly") {
      const targetDate =
        getDay(periodStart) === anchorDay ? periodStart : nextDay(periodStart, anchorDay);

      const weeksFromCreation = differenceInCalendarWeeks(targetDate, prop.createdAt);
      const isWeekA = weeksFromCreation % 2 === 0;

      periodEnd = addDays(targetDate, 14);

      if (!isSameDay(targetDate, periodStart)) {
        periodEnd = targetDate;
      }
    } else {
      periodEnd = addMonths(periodStart, 1);
    }

    const daysInPeriod = differenceInDays(periodEnd, periodStart);

    let amountCents = 0;
    if (prop.rentFrequency === "monthly") {
      if (daysInPeriod >= 28 && daysInPeriod <= 31) {
        amountCents = prop.rentAmount;
      } else {
        const dailyRate = Math.floor((prop.rentAmount * 12) / 365);
        amountCents = dailyRate * daysInPeriod;
      }
    } else {
      const weeklyRate = prop.rentFrequency === "weekly" ? prop.rentAmount : prop.rentAmount / 2;
      const dailyRate = Math.floor((weeklyRate * 52) / 365);

      if (daysInPeriod === 7 && prop.rentFrequency === "weekly") amountCents = prop.rentAmount;
      else if (daysInPeriod === 14 && prop.rentFrequency === "fortnightly")
        amountCents = prop.rentAmount;
      else amountCents = dailyRate * daysInPeriod;
    }

    return {
      start: periodStart,
      end: periodEnd,
      amountCents,
      idempotencyKey: `rent-${ten.id}-${periodEnd.toISOString().split("T")[0]}`,
    };
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
