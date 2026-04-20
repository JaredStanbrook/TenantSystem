import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import {
  addDays,
  addMonths,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { users } from "@server/schema/auth.schema";
import { property } from "@server/schema/property.schema";
import { room } from "@server/schema/room.schema";
import { tenancy, type Tenancy } from "@server/schema/tenancy.schema";
import { bond } from "@server/schema/bond.schema";
import { rent } from "@server/schema/rent.schema";
import { BillingService } from "@server/services/billing.service";
import type { AppEnv } from "@server/types";

type DrizzleDB = AppEnv["Variables"]["db"];
type Frequency = "weekly" | "fortnightly" | "monthly";
type TenancyStatus = Tenancy["status"];

export interface LegacyTenancyOnboardingParams {
  email: string;
  propertyId: number;
  roomId: number;
  leaseStartDate: Date;
  leaseEndDate?: Date;
  billedUpToDate: Date;
  previousRentAmountCents: number;
  previousFrequency: Frequency;
  bondAmountCents?: number;
  bondPaid: boolean;
  landlordId: string;
  isAdmin?: boolean;
}

type PlannedRentPeriod = {
  start: Date;
  end: Date;
  amountCents: number;
  isCatchUp: boolean;
};

const AVAILABLE_ROOM_STATUSES = ["vacant_ready", "vacant_maintenance", "advertised"] as const;

function subtractFrequency(date: Date, frequency: Frequency) {
  if (frequency === "weekly") return addDays(date, -7);
  if (frequency === "fortnightly") return addDays(date, -14);
  return addMonths(date, -1);
}

function calculateProratedAmount(
  fullAmountCents: number,
  cycleStart: Date,
  cycleEnd: Date,
  periodStart: Date,
  periodEnd: Date,
) {
  const cycleDays = differenceInDays(cycleEnd, cycleStart);
  const periodDays = differenceInDays(periodEnd, periodStart);

  if (cycleDays <= 0 || periodDays <= 0) return 0;

  return Math.round((fullAmountCents * periodDays) / cycleDays);
}

function buildLegacyRentPeriods(params: {
  leaseStartDate: Date;
  billedUpToDate: Date;
  previousFrequency: Frequency;
  previousRentAmountCents: number;
}) {
  const periodsNewestFirst: PlannedRentPeriod[] = [];
  let currentEnd = startOfDay(params.billedUpToDate);
  const leaseStartDate = startOfDay(params.leaseStartDate);

  while (isAfter(currentEnd, leaseStartDate)) {
    const cycleStart = subtractFrequency(currentEnd, params.previousFrequency);
    const periodStart = isBefore(cycleStart, leaseStartDate) ? leaseStartDate : cycleStart;
    const amountCents = calculateProratedAmount(
      params.previousRentAmountCents,
      cycleStart,
      currentEnd,
      periodStart,
      currentEnd,
    );

    if (amountCents > 0) {
      periodsNewestFirst.push({
        start: periodStart,
        end: currentEnd,
        amountCents,
        isCatchUp: false,
      });
    }

    currentEnd = cycleStart;
  }

  return periodsNewestFirst.reverse();
}

function buildUpcomingRentPeriods(params: {
  billedUpToDate: Date;
  leaseStartDate: Date;
  leaseEndDate?: Date;
  nextBillingDate: Date;
  propertyFrequency: Frequency;
  roomRentAmountCents: number;
}) {
  const periodsNewestFirst: PlannedRentPeriod[] = [];
  let currentEnd = startOfDay(params.nextBillingDate);
  const billedUpToDate = startOfDay(params.billedUpToDate);
  const leaseStartDate = startOfDay(params.leaseStartDate);
  const leaseEndDate = params.leaseEndDate ? startOfDay(params.leaseEndDate) : null;

  while (isAfter(currentEnd, billedUpToDate)) {
    const cycleStart = subtractFrequency(currentEnd, params.propertyFrequency);
    let periodStart = cycleStart;

    if (isAfter(billedUpToDate, periodStart)) periodStart = billedUpToDate;
    if (isAfter(leaseStartDate, periodStart)) periodStart = leaseStartDate;

    let periodEnd = currentEnd;
    if (leaseEndDate && isBefore(leaseEndDate, periodEnd)) {
      periodEnd = leaseEndDate;
    }

    const amountCents = calculateProratedAmount(
      params.roomRentAmountCents,
      cycleStart,
      currentEnd,
      periodStart,
      periodEnd,
    );

    if (amountCents > 0 && isBefore(periodStart, periodEnd)) {
      periodsNewestFirst.push({
        start: periodStart,
        end: periodEnd,
        amountCents,
        isCatchUp: isAfter(periodStart, cycleStart),
      });
    }

    currentEnd = cycleStart;
  }

  return periodsNewestFirst.reverse();
}

export const LegacyTenancyOnboardingService = {
  async previewRoomRent(
    db: DrizzleDB,
    landlordId: string,
    propertyId: number,
    roomId: number,
    isAdmin = false,
  ) {
    const [record] = await db
      .select({
        property: property,
        room: room,
      })
      .from(room)
      .innerJoin(property, eq(room.propertyId, property.id))
      .where(
        and(
          eq(room.id, roomId),
          eq(room.propertyId, propertyId),
          isAdmin ? undefined : eq(property.landlordId, landlordId),
          isNull(property.deletedAt),
          isNull(room.deletedAt),
        ),
      );

    return record ?? null;
  },

  async onboard(db: DrizzleDB, params: LegacyTenancyOnboardingParams) {
    const [targetUser] = await db.select().from(users).where(eq(users.email, params.email));
    if (!targetUser) throw new Error("User not found.");

    const [targetProperty] = await db
      .select()
      .from(property)
      .where(
        and(
          eq(property.id, params.propertyId),
          params.isAdmin ? undefined : eq(property.landlordId, params.landlordId),
          isNull(property.deletedAt),
        ),
      );
    if (!targetProperty) throw new Error("Unauthorized property.");

    const [targetRoom] = await db
      .select()
      .from(room)
      .where(and(eq(room.id, params.roomId), eq(room.propertyId, params.propertyId), isNull(room.deletedAt)));
    if (!targetRoom) throw new Error("Room does not exist on this property.");

    if (!AVAILABLE_ROOM_STATUSES.includes(targetRoom.status as (typeof AVAILABLE_ROOM_STATUSES)[number])) {
      throw new Error(`Room is currently ${targetRoom.status.replace("_", " ")} and cannot receive a tenant.`);
    }

    if (!targetProperty.nextBillingDate) throw new Error("Property next billing date is not set.");

    const [existingTenancy] = await db
      .select({ id: tenancy.id })
      .from(tenancy)
      .where(and(eq(tenancy.userId, targetUser.id), ne(tenancy.status, "closed")));
    if (existingTenancy) throw new Error("This user already has an active tenancy.");

    const leaseStartDate = startOfDay(params.leaseStartDate);
    const billedUpToDate = startOfDay(params.billedUpToDate);
    const leaseEndDate = params.leaseEndDate ? startOfDay(params.leaseEndDate) : undefined;
    const nextBillingDate = startOfDay(targetProperty.nextBillingDate);

    const legacyRentPeriods = buildLegacyRentPeriods({
      leaseStartDate,
      billedUpToDate,
      previousFrequency: params.previousFrequency,
      previousRentAmountCents: params.previousRentAmountCents,
    });
    const upcomingRentPeriods = buildUpcomingRentPeriods({
      billedUpToDate,
      leaseStartDate,
      leaseEndDate,
      nextBillingDate,
      propertyFrequency: targetProperty.rentFrequency,
      roomRentAmountCents: targetRoom.baseRentAmount,
    });

    const bondRequired = !!params.bondAmountCents && params.bondAmountCents > 0 && !params.bondPaid;
    const finalBilledThroughDate =
      upcomingRentPeriods.length > 0
        ? upcomingRentPeriods[upcomingRentPeriods.length - 1].end
        : billedUpToDate;
    const tenancyStatus: TenancyStatus = bondRequired ? "bond_pending" : "active";
    const roomLabel = targetRoom.name || "Room";

    let createdTenancyId: number | null = null;
    const createdRentIds: number[] = [];
    const createdBondIds: number[] = [];

    try {
      const [createdTenancy] = await db
        .insert(tenancy)
        .values({
          propertyId: params.propertyId,
          roomId: params.roomId,
          startDate: leaseStartDate,
          endDate: leaseEndDate,
          bondAmount: params.bondAmountCents,
          userId: targetUser.id,
          status: tenancyStatus,
          billedThroughDate: finalBilledThroughDate,
        })
        .returning({ id: tenancy.id });

      createdTenancyId = createdTenancy.id;

      for (const period of legacyRentPeriods) {
        const rentId = await BillingService.createRentRecord(db, {
          propertyId: params.propertyId,
          userId: targetUser.id,
          roomId: params.roomId,
          amountCents: period.amountCents,
          dueDate: period.end,
          startDate: period.start,
          endDate: period.end,
          description: `Imported Legacy Rent - ${roomLabel} (${format(period.start, "dd/MM/yyyy")} - ${format(period.end, "dd/MM/yyyy")})`,
          idempotencyKey: `legacy-rent-${createdTenancyId}-${period.start.toISOString()}`,
          status: "paid",
          amountPaid: period.amountCents,
          paidAt: period.end,
          issuedDate: period.end,
          createdAt: period.end,
        });
        createdRentIds.push(rentId);
      }

      for (const period of upcomingRentPeriods) {
        const rentId = await BillingService.createRentRecord(db, {
          propertyId: params.propertyId,
          userId: targetUser.id,
          roomId: params.roomId,
          amountCents: period.amountCents,
          dueDate: period.end,
          startDate: period.start,
          endDate: period.end,
          description: `${period.isCatchUp ? "Rent Catch-up" : "Imported Rent"} - ${roomLabel} (${format(period.start, "dd/MM/yyyy")} - ${format(period.end, "dd/MM/yyyy")})`,
          idempotencyKey: `legacy-open-rent-${createdTenancyId}-${period.start.toISOString()}`,
          status: "open",
        });
        createdRentIds.push(rentId);
      }

      if (bondRequired && params.bondAmountCents) {
        const bondId = await BillingService.createBondRecord(db, {
          propertyId: params.propertyId,
          userId: targetUser.id,
          roomId: params.roomId,
          amountCents: params.bondAmountCents,
          dueDate: leaseStartDate,
          description: "Bond Payment",
          idempotencyKey: `legacy-bond-${createdTenancyId}`,
          status: "open",
        });
        createdBondIds.push(bondId);
      }

      await db.update(room).set({ status: "occupied" }).where(eq(room.id, params.roomId));

      return {
        tenancyId: createdTenancyId,
        legacyInvoiceCount: legacyRentPeriods.length,
        upcomingInvoiceCount: upcomingRentPeriods.length,
        bondCreated: bondRequired,
        billedThroughDate: finalBilledThroughDate,
        status: tenancyStatus,
      };
    } catch (error) {
      if (createdRentIds.length > 0) {
        await db.delete(rent).where(inArray(rent.id, createdRentIds));
      }
      if (createdBondIds.length > 0) {
        await db.delete(bond).where(inArray(bond.id, createdBondIds));
      }
      if (createdTenancyId) {
        await db.delete(tenancy).where(eq(tenancy.id, createdTenancyId));
      }
      await db.update(room).set({ status: targetRoom.status }).where(eq(room.id, params.roomId));
      throw error;
    }
  },
};
