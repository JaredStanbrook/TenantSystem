// worker/services/invoice.service.ts
import {
  addDays,
  addMonths,
  differenceInDays,
  startOfDay,
  format,
  isAfter,
  isBefore,
} from "date-fns";

import { eq, and, sql, ne } from "drizzle-orm";
import { invoice, INVOICE_STATUSES, InvoiceStatus, InvoiceType } from "../schema/invoice.schema";
import { invoicePayment } from "../schema/invoicePayment.schema";
import { property } from "../schema/property.schema";
import { room } from "../schema/room.schema";
import { users } from "../schema/auth.schema";
import { AppEnv } from "../types";
import { tenancy } from "@server/schema/tenancy.schema";

// --- Types ---
type DrizzleDB = AppEnv["Variables"]["db"];

export interface CreateInvoiceWithPaymentParams {
  invoiceData: {
    propertyId: number;
    type: string;
    description: string;
    totalAmount: number;
    dueDate: Date | number;
    status: InvoiceStatus;
    idempotencyKey?: string;
  };
  payments: Array<{
    userId: string;
    amountOwed: number;
    status: InvoiceStatus;
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
      for (const inv of invoices) {
        console.log(inv);
        this.validateIntegrity(inv.invoiceData.totalAmount, inv.payments);
      }

      const invoiceValues = invoices.map((inv) => ({
        ...inv.invoiceData,
        status: (inv.invoiceData.status || "open") as InvoiceStatus,
        type: inv.invoiceData.type as InvoiceType,
        dueDate:
          inv.invoiceData.dueDate instanceof Date
            ? inv.invoiceData.dueDate
            : new Date(inv.invoiceData.dueDate),
      }));

      const createdInvoices = await db.insert(invoice).values(invoiceValues).returning();
      createdInvoiceIds.push(...createdInvoices.map((inv) => inv.id));

      const allPayments = invoices.flatMap((inv, index) =>
        inv.payments.map((payment) => ({
          invoiceId: createdInvoices[index].id,
          userId: payment.userId,
          amountOwed: payment.amountOwed,
          status: (payment.status || "pending") as InvoiceStatus,
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
      await cleanupInvoices();

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
            status: "pending" as InvoiceStatus,
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
   * RECONCILE STATUS - Authoritative State Machine
   */
  async reconcileStatus(db: DrizzleDB, invoiceId: number) {
    const payments = await db
      .select()
      .from(invoicePayment)
      .where(eq(invoicePayment.invoiceId, invoiceId));

    const [inv] = await db.select().from(invoice).where(eq(invoice.id, invoiceId));
    if (!inv) return;

    const totalAmount = inv.totalAmount;
    const totalPaid = payments.reduce((acc, p) => acc + p.amountPaid, 0);

    let newStatus: (typeof INVOICE_STATUSES)[number] = "open";

    if (totalPaid >= totalAmount && totalAmount > 0) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partial";
    } else {
      const now = new Date();
      const isOverdue = payments.some((p) => {
        if (p.status === "paid") return false;
        const extensionMs = (p.dueDateExtensionDays || 0) * 24 * 60 * 60 * 1000;
        const effectiveDueDate = new Date(inv.dueDate.getTime() + extensionMs);
        return now > effectiveDueDate;
      });

      if (isOverdue) newStatus = "overdue";
    }

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

  /**
   * Generate rent invoices for ALL tenancies in a property up to nextBillingDate
   * Works BACKWARDS from nextBillingDate to generate all missing invoices
   * Creates ONE invoice per billing cycle (grouped by end date) with prorated payments
   */
  async generateRentInvoicesForProperty(
    db: DrizzleDB,
    propertyId: number,
  ): Promise<{
    generated: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      generated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get property with nextBillingDate
    const [prop] = await db.select().from(property).where(eq(property.id, propertyId));
    if (!prop) {
      results.errors.push("Property not found");
      return results;
    }

    console.log("Property:", prop.nickname, "Next billing:", prop.nextBillingDate);

    const nextBillingDate = startOfDay(prop.nextBillingDate);
    const today = startOfDay(new Date());

    console.log("Next billing date:", nextBillingDate);
    console.log("Today:", today);

    // Get all active tenancies for this property with their rooms and users
    const tenancies = await db
      .select({
        tenancy: tenancy,
        room: room,
        user: users,
      })
      .from(tenancy)
      .leftJoin(room, eq(tenancy.roomId, room.id))
      .leftJoin(users, eq(tenancy.userId, users.id))
      .where(
        and(
          eq(tenancy.propertyId, propertyId),
          sql`${tenancy.status} IN ('active', 'move_in_ready', 'pending_agreement', 'bond_pending')`,
        ),
      );

    console.log(`Found ${tenancies.length} tenancies`);

    if (tenancies.length === 0) {
      results.errors.push("No active tenancies found");
      return results;
    }

    try {
      // Get all existing rent invoices for this property
      const existingInvoices = await db
        .select({
          idempotencyKey: invoice.idempotencyKey,
        })
        .from(invoice)
        .where(and(eq(invoice.propertyId, propertyId), eq(invoice.type, "rent")));

      const existingKeys = new Set(existingInvoices.map((inv) => inv.idempotencyKey));
      console.log(`Found ${existingKeys.size} existing invoices`);

      // Calculate all billing cycles working BACKWARDS from nextBillingDate
      const billingCycles: Array<{
        endDate: Date;
        startDate: Date;
      }> = [];

      let currentEnd = nextBillingDate;
      const maxCycles = 100; // Safety limit
      let cycleCount = 0;

      // Work backwards to build all billing cycles
      // Stop when we go before the earliest tenancy move-in date
      const earliestMoveIn = tenancies.reduce(
        (earliest, t) => {
          const moveIn = startOfDay(t.tenancy.startDate);
          return !earliest || isBefore(moveIn, earliest) ? moveIn : earliest;
        },
        null as Date | null,
      );

      if (!earliestMoveIn) {
        results.errors.push("No valid move-in dates found");
        return results;
      }

      console.log("Earliest move-in date:", format(earliestMoveIn, "dd/MM/yyyy"));

      while (cycleCount < maxCycles) {
        let cycleStart: Date;

        // Calculate the start of this billing cycle based on frequency
        if (prop.rentFrequency === "weekly") {
          cycleStart = addDays(currentEnd, -7);
        } else if (prop.rentFrequency === "fortnightly") {
          cycleStart = addDays(currentEnd, -14);
        } else {
          cycleStart = addMonths(currentEnd, -1);
        }

        // Stop if this cycle starts before the earliest move-in date
        if (isBefore(cycleStart, earliestMoveIn)) {
          console.log(
            `Cycle starts before earliest move-in, stopping at ${format(cycleStart, "dd/MM/yyyy")}`,
          );
          break;
        }

        billingCycles.unshift({
          startDate: cycleStart,
          endDate: currentEnd,
        });

        currentEnd = cycleStart;
        cycleCount++;
      }

      console.log(`Generated ${billingCycles.length} billing cycles`);

      // For each billing cycle, determine which tenancies need to be billed
      for (const cycle of billingCycles) {
        const endDateKey = cycle.endDate.toISOString().split("T")[0];
        const idempotencyKey = `rent-property-${propertyId}-${endDateKey}`;

        console.log(
          `Processing cycle: ${format(cycle.startDate, "dd/MM/yyyy")} -> ${format(cycle.endDate, "dd/MM/yyyy")}`,
        );

        // Check if invoice already exists
        if (existingKeys.has(idempotencyKey)) {
          console.log(`  Invoice already exists: ${idempotencyKey}`);
          results.skipped++;
          continue;
        }

        // Build payments for tenancies that need billing for this cycle
        const payments: Array<{
          userId: string;
          amountOwed: number;
          status: InvoiceStatus;
          tenancyId: number;
        }> = [];

        let totalAmount = 0;
        let earliestTenancyStart: Date | null = null;

        for (const record of tenancies) {
          if (!record.room || !record.user) continue;

          const moveInDate = startOfDay(record.tenancy.moveInDate);
          const billedThrough = startOfDay(record.tenancy.billedThroughDate);

          // Skip if tenancy hasn't moved in yet by end of this cycle
          if (isAfter(moveInDate, cycle.endDate)) {
            console.log(`  Tenancy ${record.tenancy.id} hasn't moved in yet`);
            continue;
          }

          // Skip if tenancy is already billed through this cycle
          if (!isBefore(billedThrough, cycle.endDate)) {
            console.log(
              `  Tenancy ${record.tenancy.id} already billed through ${format(billedThrough, "dd/MM/yyyy")}`,
            );
            continue;
          }

          // Determine the actual billing period for this tenancy
          // It starts at the LATER of: cycle start or their last billedThroughDate
          let tenancyPeriodStart: Date;

          if (isBefore(billedThrough, cycle.startDate)) {
            // They're behind - bill from cycle start (or move-in if later)
            tenancyPeriodStart = isAfter(moveInDate, cycle.startDate)
              ? moveInDate
              : cycle.startDate;
          } else {
            // They're partially billed - bill from where they left off
            tenancyPeriodStart = billedThrough;
          }

          // If tenancy starts after cycle ends, skip
          if (!isBefore(tenancyPeriodStart, cycle.endDate)) {
            console.log(
              `  Tenancy ${record.tenancy.id} period start (${format(tenancyPeriodStart, "dd/MM/yyyy")}) is not before cycle end`,
            );
            continue;
          }

          const daysInPeriod = differenceInDays(cycle.endDate, tenancyPeriodStart);

          if (daysInPeriod <= 0) {
            console.log(`  Tenancy ${record.tenancy.id} has no days in this period`);
            continue;
          }

          console.log(
            `  Tenancy ${record.tenancy.id}: ${format(tenancyPeriodStart, "dd/MM/yyyy")} -> ${format(cycle.endDate, "dd/MM/yyyy")} (${daysInPeriod} days)`,
          );

          // Calculate prorated amount
          let amountCents = 0;

          if (prop.rentFrequency === "monthly") {
            if (daysInPeriod >= 28 && daysInPeriod <= 31) {
              amountCents = record.room.baseRentAmount;
            } else {
              const dailyRate = Math.floor((record.room.baseRentAmount * 12) / 365);
              amountCents = dailyRate * daysInPeriod;
            }
          } else {
            const weeklyRate =
              prop.rentFrequency === "weekly"
                ? record.room.baseRentAmount
                : record.room.baseRentAmount / 2;
            const dailyRate = Math.floor((weeklyRate * 52) / 365);

            if (daysInPeriod === 7 && prop.rentFrequency === "weekly") {
              amountCents = record.room.baseRentAmount;
            } else if (daysInPeriod === 14 && prop.rentFrequency === "fortnightly") {
              amountCents = record.room.baseRentAmount;
            } else {
              amountCents = dailyRate * daysInPeriod;
            }
          }

          console.log(
            `  Amount for tenancy ${record.tenancy.id}: $${(amountCents / 100).toFixed(2)}`,
          );

          payments.push({
            userId: record.user.id,
            amountOwed: amountCents,
            status: "pending",
            tenancyId: record.tenancy.id,
          });

          totalAmount += amountCents;

          // Track earliest start for invoice due date
          if (!earliestTenancyStart || isBefore(tenancyPeriodStart, earliestTenancyStart)) {
            earliestTenancyStart = tenancyPeriodStart;
          }
        }

        if (payments.length === 0) {
          console.log(`  No payments needed for this cycle`);
          continue;
        }

        console.log(
          `  Creating invoice with ${payments.length} payments, total: $${(totalAmount / 100).toFixed(2)}`,
        );

        // Create invoice for this billing cycle
        const result = await this.createInvoicesWithPayments(db, [
          {
            invoiceData: {
              propertyId: propertyId,
              type: "rent",
              description: `Rent - ${prop.nickname || "Property"} (${format(cycle.startDate, "dd/MM/yyyy")} - ${format(cycle.endDate, "dd/MM/yyyy")})`,
              totalAmount: totalAmount,
              dueDate: earliestTenancyStart || cycle.startDate,
              status: "open",
              idempotencyKey,
            },
            payments: payments.map((p) => ({
              userId: p.userId,
              amountOwed: p.amountOwed,
              status: p.status,
            })),
          },
        ]);

        if (result.success) {
          console.log(`  Successfully created invoice`);

          // Update billedThroughDate for all tenancies that were billed
          for (const payment of payments) {
            await db
              .update(tenancy)
              .set({
                billedThroughDate: cycle.endDate,
                updatedAt: new Date(),
              })
              .where(eq(tenancy.id, payment.tenancyId));
          }

          results.generated++;
          existingKeys.add(idempotencyKey);
        } else if (result.message === "IDEMPOTENCY_VIOLATION") {
          console.log(`  Idempotency violation`);
          results.skipped++;
          existingKeys.add(idempotencyKey);
        } else {
          console.error(`  Failed to create invoice`);
          results.errors.push(
            `Failed to create invoice for cycle ending ${format(cycle.endDate, "dd/MM/yyyy")}`,
          );
        }
      }
    } catch (error: any) {
      console.error("Error in generateRentInvoicesForProperty:", error);
      results.errors.push(`Error processing property ${propertyId}: ${error.message}`);
    }

    // Only advance nextBillingDate if we've reached or passed it
    if (!isBefore(today, nextBillingDate)) {
      await this.advanceNextBillingDate(db, propertyId, nextBillingDate, prop.rentFrequency);
    }

    return results;
  },
  /**
   * Calculate the next rent period for a tenancy
   * Returns the period from billedThroughDate up to (but not beyond) nextBillingDate
   */
  calculateNextRentPeriod(
    frequency: "weekly" | "fortnightly" | "monthly",
    billedThroughDate: Date,
    nextBillingDate: Date,
    roomRentAmount: number,
  ): { start: Date; end: Date; amountCents: number } | null {
    const periodStart = startOfDay(billedThroughDate);
    let periodEnd: Date;

    // Calculate the standard period end
    if (frequency === "weekly") {
      periodEnd = addDays(periodStart, 7);
    } else if (frequency === "fortnightly") {
      periodEnd = addDays(periodStart, 14);
    } else {
      periodEnd = addMonths(periodStart, 1);
    }

    // Don't exceed nextBillingDate
    if (isAfter(periodEnd, nextBillingDate)) {
      periodEnd = nextBillingDate;
    }

    const daysInPeriod = differenceInDays(periodEnd, periodStart);

    if (daysInPeriod <= 0) return null;

    // Calculate pro-rated amount based on room rent
    let amountCents = 0;

    if (frequency === "monthly") {
      if (daysInPeriod >= 28 && daysInPeriod <= 31) {
        amountCents = roomRentAmount;
      } else {
        const dailyRate = Math.floor((roomRentAmount * 12) / 365);
        amountCents = dailyRate * daysInPeriod;
      }
    } else {
      const weeklyRate = frequency === "weekly" ? roomRentAmount : roomRentAmount / 2;
      const dailyRate = Math.floor((weeklyRate * 52) / 365);

      if (daysInPeriod === 7 && frequency === "weekly") {
        amountCents = roomRentAmount;
      } else if (daysInPeriod === 14 && frequency === "fortnightly") {
        amountCents = roomRentAmount;
      } else {
        amountCents = dailyRate * daysInPeriod;
      }
    }

    return {
      start: periodStart,
      end: periodEnd,
      amountCents,
    };
  },

  /**
   * Advance property's nextBillingDate by one period
   * Only called when current date >= nextBillingDate
   */
  async advanceNextBillingDate(
    db: DrizzleDB,
    propertyId: number,
    currentNextBillingDate: Date,
    frequency: "weekly" | "fortnightly" | "monthly",
  ) {
    let newNextBillingDate: Date;

    if (frequency === "weekly") {
      newNextBillingDate = addDays(currentNextBillingDate, 7);
    } else if (frequency === "fortnightly") {
      newNextBillingDate = addDays(currentNextBillingDate, 14);
    } else {
      newNextBillingDate = addMonths(currentNextBillingDate, 1);
    }

    await db
      .update(property)
      .set({
        nextBillingDate: newNextBillingDate,
        updatedAt: new Date(),
      })
      .where(eq(property.id, propertyId));

    console.log(
      `Advanced nextBillingDate for property ${propertyId} to ${format(newNextBillingDate, "dd/MM/yyyy")}`,
    );

    return newNextBillingDate;
  },

  /**
   * Legacy single-tenancy rent run (kept for backwards compatibility)
   */
  async processRentRun(db: DrizzleDB, tenancyId: number) {
    const data = await db.query.tenancy.findFirst({
      where: eq(tenancy.id, tenancyId),
      with: {
        property: true,
        room: true,
        user: true,
      },
    });

    if (!data) throw new Error("Tenancy not found");
    if (!data.property) throw new Error("Property not found");
    if (!data.room) throw new Error("Room not found");
    if (!data.user) throw new Error("User not found");

    const nextBillingDate = startOfDay(data.property.nextBillingDate);
    const billedThrough = startOfDay(data.billedThroughDate);

    // Only generate if we haven't reached nextBillingDate yet
    if (!isBefore(billedThrough, nextBillingDate)) {
      console.log(
        `Tenancy ${tenancyId} already billed through ${format(billedThrough, "dd/MM/yyyy")}`,
      );
      return;
    }

    const rentAction = this.calculateNextRentPeriod(
      data.property.rentFrequency,
      billedThrough,
      nextBillingDate,
      data.room.rentAmount,
    );

    if (!rentAction) return;

    const description = `Rent - ${data.room.name} (${format(rentAction.start, "dd/MM/yyyy")} - ${format(rentAction.end, "dd/MM/yyyy")})`;

    try {
      await db.batch([
        db.insert(invoice).values({
          propertyId: data.property.id,
          type: "rent",
          description: description,
          totalAmount: rentAction.amountCents,
          dueDate: rentAction.start,
          status: "open",
          idempotencyKey: `rent-${tenancyId}-${rentAction.end.toISOString().split("T")[0]}`,
        }),

        db
          .update(tenancy)
          .set({
            billedThroughDate: rentAction.end,
            updatedAt: new Date(),
          })
          .where(eq(tenancy.id, tenancyId)),
      ]);

      console.log(`Generated invoice for Tenancy ${tenancyId}`);
    } catch (e: any) {
      if (e.message && e.message.includes("UNIQUE constraint failed")) {
        console.log(`Skipping duplicate invoice for Tenancy ${tenancyId}`);
        return;
      }
      throw e;
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
