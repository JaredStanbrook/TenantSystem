import { eq, and, lte, sql } from "drizzle-orm";
import { AppEnv } from "../types";
import { recurringInvoice, recurringInvoiceSplit } from "../schema/recurring.schema";
import { invoice } from "../schema/invoice.schema";
import { invoicePayment } from "../schema/invoicePayment.schema";

type DrizzleDB = AppEnv["Variables"]["db"];

export const RecurringService = {
  /**
   * Calculates the next run date based on frequency
   */
  calculateNextDate(current: Date, frequency: string): Date {
    const d = new Date(current);
    switch (frequency) {
      case "weekly":
        d.setDate(d.getDate() + 7);
        break;
      case "fortnightly":
        d.setDate(d.getDate() + 14);
        break;
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
      case "yearly":
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d;
  },

  /**
   * CRON ENTRY POINT: Checks for due schedules and generates invoices.
   * Call this from your worker's `scheduled()` handler.
   */
  async processDueInvoices(db: DrizzleDB) {
    const now = new Date();

    // 1. Find active schedules that need to run
    const dueSchedules = await db
      .select()
      .from(recurringInvoice)
      .where(and(eq(recurringInvoice.active, true), lte(recurringInvoice.nextRunDate, now)));

    const results = { generated: 0, errors: 0 };

    for (const schedule of dueSchedules) {
      // Check End Date
      if (schedule.endDate && schedule.endDate < now) {
        await db
          .update(recurringInvoice)
          .set({ active: false })
          .where(eq(recurringInvoice.id, schedule.id));
        continue;
      }

      try {
        await db.transaction(async (tx) => {
          // A. Create the Invoice
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + schedule.dueDaysOffset);

          const [newInv] = await tx
            .insert(invoice)
            .values({
              propertyId: schedule.propertyId,
              recurringInvoiceId: schedule.id,
              type: schedule.type as any,
              description: schedule.description || `Recurring: ${schedule.type}`,
              totalAmount: schedule.totalAmount,
              status: "open",
              dueDate: dueDate,
              issuedDate: now,
            })
            .returning();

          // B. Get Splits & Create Payments
          const splits = await tx
            .select()
            .from(recurringInvoiceSplit)
            .where(eq(recurringInvoiceSplit.recurringInvoiceId, schedule.id));

          if (splits.length > 0) {
            await tx.insert(invoicePayment).values(
              splits.map((s) => ({
                invoiceId: newInv.id,
                userId: s.userId,
                amountOwed: s.amountOwed,
                status: "pending",
              })),
            );
          }

          // C. Advance the Schedule
          const nextDate = RecurringService.calculateNextDate(
            schedule.nextRunDate,
            schedule.frequency,
          );

          await tx
            .update(recurringInvoice)
            .set({ nextRunDate: nextDate })
            .where(eq(recurringInvoice.id, schedule.id));
        });

        results.generated++;
      } catch (e) {
        console.error(`Failed to process schedule ${schedule.id}`, e);
        results.errors++;
      }
    }

    return results;
  },

  /**
   * Helper to create a new Recurring Definition from the UI
   */
  async createDefinition(
    db: DrizzleDB,
    data: {
      propertyId: number;
      type: string;
      description?: string;
      totalAmount: number;
      frequency: "weekly" | "fortnightly" | "monthly" | "yearly";
      startDate: Date;
      endDate?: Date;
    },
    splits: { userId: string; amountCents: number }[],
  ) {
    const nextRun = RecurringService.calculateNextDate(data.startDate, data.frequency);

    const [def] = await db
      .insert(recurringInvoice)
      .values({
        propertyId: data.propertyId,
        type: data.type,
        description: data.description,
        totalAmount: data.totalAmount,
        frequency: data.frequency,
        active: true,
        nextRunDate: nextRun, // The first *automated* run is one cycle after the start
        endDate: data.endDate,
      })
      .returning();

    if (splits.length > 0) {
      await db.insert(recurringInvoiceSplit).values(
        splits.map((s) => ({
          recurringInvoiceId: def.id,
          userId: s.userId,
          amountOwed: s.amountCents,
        })),
      );
    }

    return def;
  },
  /**
   * UPDATE an existing Recurring Profile
   */
  async updateDefinition(
    db: DrizzleDB,
    id: number,
    data: {
      propertyId: number;
      type: string;
      description?: string;
      totalAmount: number;
      frequency: "weekly" | "fortnightly" | "monthly" | "yearly";
      nextRunDate: Date; // Allow user to manually adjust the next trigger
      endDate?: Date;
      active: boolean;
    },
    splits: { userId: string; amountCents: number }[],
  ) {
    return await db.transaction(async (tx) => {
      // 1. Update Main Record
      await tx
        .update(recurringInvoice)
        .set({
          propertyId: data.propertyId,
          type: data.type,
          description: data.description,
          totalAmount: data.totalAmount,
          frequency: data.frequency,
          nextRunDate: data.nextRunDate,
          endDate: data.endDate,
          active: data.active,
        })
        .where(eq(recurringInvoice.id, id));

      // 2. Refresh Splits (Delete & Re-insert)
      // This is safe because these splits are just a "template" for future invoices
      await tx
        .delete(recurringInvoiceSplit)
        .where(eq(recurringInvoiceSplit.recurringInvoiceId, id));

      if (splits.length > 0) {
        await tx.insert(recurringInvoiceSplit).values(
          splits.map((s) => ({
            recurringInvoiceId: id,
            userId: s.userId,
            amountOwed: s.amountCents,
          })),
        );
      }
    });
  },

  /**
   * TOGGLE Active Status
   */
  async toggle(db: DrizzleDB, id: number, active: boolean) {
    await db.update(recurringInvoice).set({ active }).where(eq(recurringInvoice.id, id));
  },
};
