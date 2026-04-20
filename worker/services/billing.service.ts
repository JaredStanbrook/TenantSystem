import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
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
import { bill } from "@server/schema/bill.schema";
import {
  BILL_RECORD_TYPES,
  type BillType,
  type BillingRecordType,
  type BillingStatus,
  type ExtensionStatus,
} from "@server/schema/billing.shared";
import { bond } from "@server/schema/bond.schema";
import { property } from "@server/schema/property.schema";
import { rent } from "@server/schema/rent.schema";
import { room } from "@server/schema/room.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import type { AppEnv } from "@server/types";

type DrizzleDB = AppEnv["Variables"]["db"];
type AuthUser = NonNullable<AppEnv["Variables"]["auth"]["user"]>;
type Frequency = "weekly" | "fortnightly" | "monthly";
type BillingBaseRow = {
  id: number;
  sequenceNumber: number;
  propertyId: number;
  userId: string;
  roomId: number | null;
  description: string | null;
  totalAmount: number;
  amountPaid: number;
  status: BillingStatus;
  dueDate: Date;
  issuedDate: Date;
  createdAt: Date;
  paidAt: Date | null;
  tenantMarkedPaidAt: Date | null;
  paymentReference: string | null;
  extensionStatus: ExtensionStatus;
  extensionRequestedDate: Date | null;
  extensionReason: string | null;
  dueDateExtensionDays: number;
  adminNote: string | null;
  archivedStatus?: BillingStatus | null;
};

export type BillingListItem = BillingBaseRow & {
  recordType: BillingRecordType;
  displayNumber: string;
  propertyName: string;
  propertyLabel: string;
  tenantName: string;
  tenantEmail: string;
  roomName?: string | null;
  category: string;
  startDate?: Date | null;
  endDate?: Date | null;
};

type GenerateTenantRentResult = {
  generated: number;
  skipped: number;
  coveredThrough: Date | null;
  errors: string[];
};

type BillingRecordJoin = {
  record: BillingBaseRow & { startDate?: Date | null; endDate?: Date | null; billType?: BillType };
  property: typeof property.$inferSelect;
  user: typeof users.$inferSelect;
  room: typeof room.$inferSelect | null;
  recordType: BillingRecordType;
};

const prefixByType: Record<BillingRecordType, string> = {
  rent: "R",
  bond: "B",
  bill: "BL",
};

const tableByType = {
  rent,
  bond,
  bill,
} as const;

export function getDisplayNumber(recordType: BillingRecordType, sequenceNumber: number) {
  return `${prefixByType[recordType]}-${sequenceNumber}`;
}

export function getEffectiveDueDate(record: BillingBaseRow) {
  return new Date(record.dueDate.getTime() + (record.dueDateExtensionDays || 0) * 24 * 60 * 60 * 1000);
}

function calculateStatus(record: BillingBaseRow): BillingStatus {
  if (record.status === "void") return "void";
  if (record.amountPaid >= record.totalAmount && record.totalAmount > 0) return "paid";
  if (record.amountPaid > 0) return "partial";
  if (new Date() > getEffectiveDueDate(record)) return "overdue";
  return "open";
}

function propertyLabel(prop: typeof property.$inferSelect) {
  return (
    prop.nickname ||
    [prop.addressLine1, prop.city, prop.state, prop.postcode].filter(Boolean).join(", ")
  );
}

function toListItem(joined: BillingRecordJoin): BillingListItem {
  return {
    ...joined.record,
    recordType: joined.recordType,
    displayNumber: getDisplayNumber(joined.recordType, joined.record.sequenceNumber),
    propertyName: joined.property.nickname || joined.property.addressLine1,
    propertyLabel: propertyLabel(joined.property),
    tenantName: joined.user.displayName || joined.user.email || "Tenant",
    tenantEmail: joined.user.email || "",
    roomName: joined.room?.name || null,
    category:
      joined.recordType === "bill"
        ? joined.record.billType || "bill"
        : joined.recordType,
    startDate: joined.record.startDate ?? null,
    endDate: joined.record.endDate ?? null,
  };
}

async function fetchRentRows(
  db: DrizzleDB,
  whereClause?: any,
): Promise<BillingRecordJoin[]> {
  const rows = await db
    .select({
      record: rent,
      property,
      user: users,
      room,
    })
    .from(rent)
    .innerJoin(property, eq(rent.propertyId, property.id))
    .innerJoin(users, eq(rent.userId, users.id))
    .leftJoin(room, eq(rent.roomId, room.id))
    .where(whereClause);

  return rows.map((row) => ({ ...row, recordType: "rent" as const }));
}

async function fetchBondRows(
  db: DrizzleDB,
  whereClause?: any,
): Promise<BillingRecordJoin[]> {
  const rows = await db
    .select({
      record: bond,
      property,
      user: users,
      room,
    })
    .from(bond)
    .innerJoin(property, eq(bond.propertyId, property.id))
    .innerJoin(users, eq(bond.userId, users.id))
    .leftJoin(room, eq(bond.roomId, room.id))
    .where(whereClause);

  return rows.map((row) => ({ ...row, recordType: "bond" as const }));
}

async function fetchBillRows(
  db: DrizzleDB,
  whereClause?: any,
): Promise<BillingRecordJoin[]> {
  const rows = await db
    .select({
      record: bill,
      property,
      user: users,
      room,
    })
    .from(bill)
    .innerJoin(property, eq(bill.propertyId, property.id))
    .innerJoin(users, eq(bill.userId, users.id))
    .leftJoin(room, eq(bill.roomId, room.id))
    .where(whereClause);

  return rows.map((row) => ({ ...row, recordType: "bill" as const }));
}

async function fetchAllRows(db: DrizzleDB, whereBuilder: (type: BillingRecordType) => any) {
  const [rents, bonds, bills] = await Promise.all([
    fetchRentRows(db, whereBuilder("rent")),
    fetchBondRows(db, whereBuilder("bond")),
    fetchBillRows(db, whereBuilder("bill")),
  ]);
  return [...rents, ...bonds, ...bills];
}

function scopeCondition(recordType: BillingRecordType, ownerId: string, isAdmin: boolean) {
  const table = tableByType[recordType];
  return and(
    isAdmin ? undefined : eq(property.landlordId, ownerId),
    eq(table.propertyId, property.id),
    isNull(property.deletedAt),
  );
}

function sameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function isFullRentCycle(
  frequency: Frequency,
  startDate: Date,
  endDate: Date,
) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  if (frequency === "weekly") return differenceInDays(end, start) === 7;
  if (frequency === "fortnightly") return differenceInDays(end, start) === 14;
  return sameDay(addMonths(start, 1), end);
}

function addBillingCycle(date: Date, frequency: Frequency) {
  if (frequency === "weekly") return addDays(date, 7);
  if (frequency === "fortnightly") return addDays(date, 14);
  return addMonths(date, 1);
}

async function getNextSequenceNumber(
  db: DrizzleDB,
  recordType: BillingRecordType,
  userId: string,
) {
  const table = tableByType[recordType];
  const [row] = await db
    .select({
      maxSequenceNumber: sql<number>`coalesce(max(${table.sequenceNumber}), 0)`,
    })
    .from(table)
    .where(eq(table.userId, userId));

  return (row?.maxSequenceNumber ?? 0) + 1;
}

export const BillingService = {
  async recalculateStatus(
    db: DrizzleDB,
    recordType: BillingRecordType,
    id: number,
  ) {
    const table = tableByType[recordType];
    const [record] = await db.select().from(table).where(eq(table.id, id));
    if (!record) return null;
    const nextStatus = calculateStatus(record as BillingBaseRow);
    if (record.status !== nextStatus) {
      await db.update(table).set({ status: nextStatus }).where(eq(table.id, id));
    }
    return nextStatus;
  },

  async syncPropertyNextBillingDate(
    db: DrizzleDB,
    prop: Pick<typeof property.$inferSelect, "id" | "rentFrequency" | "nextBillingDate">,
    today = new Date(),
  ) {
    if (!prop.nextBillingDate) return null;

    const currentNextBillingDate = startOfDay(prop.nextBillingDate);
    const billingToday = startOfDay(today);

    if (isBefore(billingToday, currentNextBillingDate)) {
      return currentNextBillingDate;
    }

    let nextBillingDate = currentNextBillingDate;
    while (!isBefore(billingToday, nextBillingDate)) {
      nextBillingDate = addBillingCycle(nextBillingDate, prop.rentFrequency);
    }

    await db
      .update(property)
      .set({
        nextBillingDate,
        updatedAt: new Date(),
      })
      .where(eq(property.id, prop.id));

    return nextBillingDate;
  },

  async refreshStatusesForProperties(db: DrizzleDB, propertyIds: number[]) {
    for (const recordType of BILL_RECORD_TYPES) {
      const table = tableByType[recordType];
      const records = await db
        .select({ id: table.id })
        .from(table)
        .where(and(inArray(table.propertyId, propertyIds), ne(table.status, "paid"), ne(table.status, "void")));
      for (const record of records) {
        await this.recalculateStatus(db, recordType, record.id);
      }
    }
  },

  async listForAdmin(db: DrizzleDB, user: AuthUser) {
    const isAdmin = user.roles.includes("admin");
    const rows = await fetchAllRows(db, (recordType) => scopeCondition(recordType, user.id, isAdmin));
    return rows
      .map(toListItem)
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  },

  async listForTenant(db: DrizzleDB, userId: string) {
    const rows = await fetchAllRows(db, (recordType) => {
      const table = tableByType[recordType];
      return eq(table.userId, userId);
    });
    return rows
      .map(toListItem)
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  },

  async getForAdmin(
    db: DrizzleDB,
    user: AuthUser,
    recordType: BillingRecordType,
    id: number,
  ) {
    const isAdmin = user.roles.includes("admin");
    const table = tableByType[recordType];
    const loader =
      recordType === "rent" ? fetchRentRows : recordType === "bond" ? fetchBondRows : fetchBillRows;
    const [row] = await loader(
      db,
      and(eq(table.id, id), scopeCondition(recordType, user.id, isAdmin)),
    );
    return row ? toListItem(row) : null;
  },

  async getForTenant(
    db: DrizzleDB,
    userId: string,
    recordType: BillingRecordType,
    id: number,
  ) {
    const table = tableByType[recordType];
    const loader =
      recordType === "rent" ? fetchRentRows : recordType === "bond" ? fetchBondRows : fetchBillRows;
    const [row] = await loader(db, and(eq(table.id, id), eq(table.userId, userId)));
    return row ? toListItem(row) : null;
  },

  async getActiveTenantsForProperty(db: DrizzleDB, propertyId: number) {
    return db
      .select({
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        roomId: tenancy.roomId,
        roomName: room.name,
      })
      .from(tenancy)
      .innerJoin(users, eq(tenancy.userId, users.id))
      .leftJoin(room, eq(tenancy.roomId, room.id))
      .where(
        and(
          eq(tenancy.propertyId, propertyId),
          sql`${tenancy.status} IN ('active', 'move_in_ready', 'bond_pending', 'pending_agreement')`,
        ),
      );
  },

  async createManualRecord(
    db: DrizzleDB,
    input: {
      recordType: BillingRecordType;
      propertyId: number;
      userId: string;
      roomId?: number;
      description?: string;
      amountCents: number;
      dueDate: Date;
      billType?: BillType;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    if (input.recordType === "rent") {
      const sequenceNumber = await getNextSequenceNumber(db, "rent", input.userId);
      const [created] = await db
        .insert(rent)
        .values({
          sequenceNumber,
          propertyId: input.propertyId,
          userId: input.userId,
          roomId: input.roomId,
          description: input.description,
          totalAmount: input.amountCents,
          dueDate: input.dueDate,
          startDate: input.startDate!,
          endDate: input.endDate!,
          status: "open",
        })
        .returning({ id: rent.id });
      return created.id;
    }
    if (input.recordType === "bond") {
      const sequenceNumber = await getNextSequenceNumber(db, "bond", input.userId);
      const [created] = await db
        .insert(bond)
        .values({
          sequenceNumber,
          propertyId: input.propertyId,
          userId: input.userId,
          roomId: input.roomId,
          description: input.description || "Bond Payment",
          totalAmount: input.amountCents,
          dueDate: input.dueDate,
          status: "open",
        })
        .returning({ id: bond.id });
      return created.id;
    }
    const sequenceNumber = await getNextSequenceNumber(db, "bill", input.userId);
    const [created] = await db
      .insert(bill)
      .values({
        sequenceNumber,
        propertyId: input.propertyId,
        userId: input.userId,
        roomId: input.roomId,
        billType: input.billType || "other",
        description: input.description,
        totalAmount: input.amountCents,
        dueDate: input.dueDate,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "open",
      })
      .returning({ id: bill.id });
    return created.id;
  },

  async updateManualRecord(
    db: DrizzleDB,
    recordType: BillingRecordType,
    id: number,
    input: {
      propertyId: number;
      userId: string;
      roomId?: number;
      description?: string;
      amountCents: number;
      dueDate: Date;
      billType?: BillType;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    if (recordType === "rent") {
      await db
        .update(rent)
        .set({
          propertyId: input.propertyId,
          userId: input.userId,
          roomId: input.roomId,
          description: input.description,
          totalAmount: input.amountCents,
          dueDate: input.dueDate,
          startDate: input.startDate!,
          endDate: input.endDate!,
        })
        .where(eq(rent.id, id));
    } else if (recordType === "bond") {
      await db
        .update(bond)
        .set({
          propertyId: input.propertyId,
          userId: input.userId,
          roomId: input.roomId,
          description: input.description || "Bond Payment",
          totalAmount: input.amountCents,
          dueDate: input.dueDate,
        })
        .where(eq(bond.id, id));
    } else {
      await db
        .update(bill)
        .set({
          propertyId: input.propertyId,
          userId: input.userId,
          roomId: input.roomId,
          description: input.description,
          totalAmount: input.amountCents,
          dueDate: input.dueDate,
          startDate: input.startDate,
          endDate: input.endDate,
          billType: input.billType || "other",
        })
        .where(eq(bill.id, id));
    }
    await this.recalculateStatus(db, recordType, id);
  },

  async deleteRecord(db: DrizzleDB, recordType: BillingRecordType, id: number) {
    const table = tableByType[recordType];
    const [record] = await db.select().from(table).where(eq(table.id, id));
    if (!record) return;
    if ((record.amountPaid || 0) > 0) throw new Error("Cannot delete record with payments.");
    await db.delete(table).where(eq(table.id, id));
  },

  async approvePayment(db: DrizzleDB, recordType: BillingRecordType, id: number) {
    const table = tableByType[recordType];
    const [record] = await db.select().from(table).where(eq(table.id, id));
    if (!record) throw new Error("Record not found");
    await db
      .update(table)
      .set({
        amountPaid: record.totalAmount,
        paidAt: new Date(),
        status: "paid",
      })
      .where(eq(table.id, id));
  },

  async rejectPayment(db: DrizzleDB, recordType: BillingRecordType, id: number, reason?: string | null) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        tenantMarkedPaidAt: null,
        paymentReference: null,
        adminNote: reason || "Payment rejected by admin",
      })
      .where(eq(table.id, id));
    await this.recalculateStatus(db, recordType, id);
  },

  async approveExtension(db: DrizzleDB, recordType: BillingRecordType, id: number) {
    const table = tableByType[recordType];
    const [record] = await db.select().from(table).where(eq(table.id, id));
    if (!record || !record.extensionRequestedDate) throw new Error("No pending extension request");
    const extensionDays = Math.max(
      0,
      Math.ceil((record.extensionRequestedDate.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    await db
      .update(table)
      .set({
        extensionStatus: "approved",
        dueDateExtensionDays: extensionDays,
      })
      .where(eq(table.id, id));
    await this.recalculateStatus(db, recordType, id);
  },

  async rejectExtension(db: DrizzleDB, recordType: BillingRecordType, id: number, reason?: string | null) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        extensionStatus: "rejected",
        adminNote: reason || "Extension request rejected",
      })
      .where(eq(table.id, id));
    await this.recalculateStatus(db, recordType, id);
  },

  async grantExtension(db: DrizzleDB, recordType: BillingRecordType, id: number, extensionDays: number) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        extensionStatus: "approved",
        dueDateExtensionDays: extensionDays,
        adminNote: `Manual extension granted: ${extensionDays} days`,
      })
      .where(eq(table.id, id));
    await this.recalculateStatus(db, recordType, id);
  },

  async revokeExtension(db: DrizzleDB, recordType: BillingRecordType, id: number) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        extensionStatus: "none",
        extensionRequestedDate: null,
        extensionReason: null,
        dueDateExtensionDays: 0,
        adminNote: null,
      })
      .where(eq(table.id, id));
    await this.recalculateStatus(db, recordType, id);
  },

  async markTenantPaid(
    db: DrizzleDB,
    recordType: BillingRecordType,
    id: number,
    reference?: string,
  ) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        tenantMarkedPaidAt: new Date(),
        paymentReference: reference || null,
      })
      .where(eq(table.id, id));
  },

  async requestExtension(
    db: DrizzleDB,
    recordType: BillingRecordType,
    id: number,
    requestedDate: Date,
    reason?: string,
  ) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        extensionStatus: "pending",
        extensionRequestedDate: requestedDate,
        extensionReason: reason || null,
      })
      .where(eq(table.id, id));
  },

  async cancelExtensionRequest(db: DrizzleDB, recordType: BillingRecordType, id: number) {
    const table = tableByType[recordType];
    await db
      .update(table)
      .set({
        extensionStatus: "none",
        extensionRequestedDate: null,
        extensionReason: null,
      })
      .where(eq(table.id, id));
  },

  async createBondRecord(
    db: DrizzleDB,
    params: {
      propertyId: number;
      userId: string;
      roomId?: number | null;
      amountCents: number;
      dueDate: Date;
      description?: string;
      idempotencyKey?: string;
      status?: BillingStatus;
      amountPaid?: number;
      paidAt?: Date | null;
    },
  ) {
    const sequenceNumber = await getNextSequenceNumber(db, "bond", params.userId);
    const [created] = await db
      .insert(bond)
      .values({
        sequenceNumber,
        propertyId: params.propertyId,
        userId: params.userId,
        roomId: params.roomId ?? undefined,
        description: params.description || "Bond Payment",
        totalAmount: params.amountCents,
        amountPaid: params.amountPaid ?? 0,
        dueDate: params.dueDate,
        status: params.status || "open",
        idempotencyKey: params.idempotencyKey,
        paidAt: params.paidAt ?? undefined,
      })
      .returning({ id: bond.id });
    return created.id;
  },

  async createRentRecord(
    db: DrizzleDB,
    params: {
      propertyId: number;
      userId: string;
      roomId?: number | null;
      amountCents: number;
      dueDate: Date;
      startDate: Date;
      endDate: Date;
      description?: string;
      idempotencyKey?: string;
      status?: BillingStatus;
      amountPaid?: number;
      paidAt?: Date | null;
      issuedDate?: Date;
      createdAt?: Date;
    },
  ) {
    const sequenceNumber = await getNextSequenceNumber(db, "rent", params.userId);
    const [created] = await db
      .insert(rent)
      .values({
        sequenceNumber,
        propertyId: params.propertyId,
        userId: params.userId,
        roomId: params.roomId ?? undefined,
        description: params.description,
        totalAmount: params.amountCents,
        amountPaid: params.amountPaid ?? 0,
        dueDate: params.dueDate,
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status || "open",
        idempotencyKey: params.idempotencyKey,
        paidAt: params.paidAt ?? undefined,
        issuedDate: params.issuedDate,
        createdAt: params.createdAt,
      })
      .returning({ id: rent.id });
    return created.id;
  },

  calculateNextRentPeriod(
    frequency: Frequency,
    billedThroughDate: Date,
    nextBillingDate: Date,
    roomRentAmount: number,
  ) {
    const periodStart = startOfDay(billedThroughDate);
    let periodEnd: Date;

    if (frequency === "weekly") periodEnd = addDays(periodStart, 7);
    else if (frequency === "fortnightly") periodEnd = addDays(periodStart, 14);
    else periodEnd = addMonths(periodStart, 1);

    if (isAfter(periodEnd, nextBillingDate)) periodEnd = nextBillingDate;
    const daysInPeriod = differenceInDays(periodEnd, periodStart);
    if (daysInPeriod <= 0) return null;

    let amountCents = 0;
    if (frequency === "monthly") {
      if (daysInPeriod >= 28 && daysInPeriod <= 31) amountCents = roomRentAmount;
      else amountCents = Math.floor((roomRentAmount * 12) / 365) * daysInPeriod;
    } else {
      const weeklyRate = frequency === "weekly" ? roomRentAmount : roomRentAmount / 2;
      const dailyRate = Math.floor((weeklyRate * 52) / 365);
      if (daysInPeriod === 7 && frequency === "weekly") amountCents = roomRentAmount;
      else if (daysInPeriod === 14 && frequency === "fortnightly") amountCents = roomRentAmount;
      else amountCents = dailyRate * daysInPeriod;
    }

    return { start: periodStart, end: periodEnd, amountCents };
  },

  async generateRentRecordsForTenancy(
    db: DrizzleDB,
    tenancyId: number,
  ): Promise<GenerateTenantRentResult> {
    const result: GenerateTenantRentResult = {
      generated: 0,
      skipped: 0,
      coveredThrough: null,
      errors: [],
    };

    const [record] = await db
      .select({ tenancy, property, room, user: users })
      .from(tenancy)
      .innerJoin(property, eq(tenancy.propertyId, property.id))
      .leftJoin(room, eq(tenancy.roomId, room.id))
      .leftJoin(users, eq(tenancy.userId, users.id))
      .where(eq(tenancy.id, tenancyId));

    if (!record || !record.user) {
      result.errors.push("Tenancy not found.");
      return result;
    }

    if (!record.property.nextBillingDate) {
      result.errors.push("Property next billing date is not set.");
      return result;
    }

    const syncedNextBillingDate = await this.syncPropertyNextBillingDate(db, record.property);

    if (!["active", "move_in_ready", "pending_agreement", "bond_pending"].includes(record.tenancy.status)) {
      result.errors.push("Tenancy is not eligible for rent generation.");
      return result;
    }

    const existingRentRows = await db
      .select()
      .from(rent)
      .where(
        and(
          eq(rent.propertyId, record.tenancy.propertyId),
          eq(rent.userId, record.tenancy.userId),
        ),
      );

    const paidRows = existingRentRows
      .filter((row) => row.status === "paid" && row.endDate)
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

    const lowerBound = startOfDay(
      paidRows[0]?.endDate || record.tenancy.billedThroughDate,
    );
    const nextBillingDate = startOfDay(syncedNextBillingDate || record.property.nextBillingDate);

    if (lowerBound.getTime() >= nextBillingDate.getTime()) {
      result.coveredThrough = lowerBound;
      return result;
    }

    const effectiveRoomRent = record.room?.baseRentAmount || record.property.rentAmount;
    const tenancyLabel = record.room?.name || record.property.nickname || "Property";

    const expectedPeriods: Array<{ start: Date; end: Date; amountCents: number }> = [];
    let cursor = lowerBound;

    while (cursor.getTime() < nextBillingDate.getTime()) {
      const nextPeriod = this.calculateNextRentPeriod(
        record.property.rentFrequency,
        cursor,
        nextBillingDate,
        effectiveRoomRent,
      );

      if (!nextPeriod) break;
      expectedPeriods.push(nextPeriod);
      cursor = nextPeriod.end;
    }

    const coveredEnds = [lowerBound.getTime()];

    for (const period of expectedPeriods) {
      const existing = existingRentRows.find(
        (row) =>
          sameDay(row.startDate, period.start) &&
          sameDay(row.endDate, period.end),
      );

      if (existing) {
        result.skipped++;
        coveredEnds.push(startOfDay(existing.endDate).getTime());
        continue;
      }

      const isCatchUp = !isFullRentCycle(
        record.property.rentFrequency,
        period.start,
        period.end,
      );

      await this.createRentRecord(db, {
        propertyId: record.tenancy.propertyId,
        userId: record.tenancy.userId,
        roomId: record.tenancy.roomId,
        amountCents: period.amountCents,
        dueDate: period.end,
        startDate: period.start,
        endDate: period.end,
        description: `${isCatchUp ? "Rent Catch-up" : "Rent"} - ${tenancyLabel} (${format(period.start, "dd/MM/yyyy")} - ${format(period.end, "dd/MM/yyyy")})`,
        idempotencyKey: `rent-${record.tenancy.id}-${period.start.toISOString().split("T")[0]}-${period.end.toISOString().split("T")[0]}`,
      });

      result.generated++;
      coveredEnds.push(startOfDay(period.end).getTime());
    }

    const coveredThrough = new Date(Math.max(...coveredEnds));
    result.coveredThrough = coveredThrough;

    if (coveredThrough.getTime() > startOfDay(record.tenancy.billedThroughDate).getTime()) {
      await db
        .update(tenancy)
        .set({ billedThroughDate: coveredThrough, updatedAt: new Date() })
        .where(eq(tenancy.id, record.tenancy.id));
    }

    return result;
  },

  async generateRentRecordsForProperty(db: DrizzleDB, propertyId: number) {
    const results = { generated: 0, skipped: 0, errors: [] as string[] };
    const [prop] = await db.select().from(property).where(eq(property.id, propertyId));
    if (!prop || !prop.nextBillingDate) {
      results.errors.push("Property nextBillingDate is not set");
      return results;
    }

    await this.syncPropertyNextBillingDate(db, prop);

    const tenancies = await db
      .select({ tenancy, room, user: users })
      .from(tenancy)
      .leftJoin(room, eq(tenancy.roomId, room.id))
      .leftJoin(users, eq(tenancy.userId, users.id))
      .where(
        and(
          eq(tenancy.propertyId, propertyId),
          sql`${tenancy.status} IN ('active', 'move_in_ready', 'pending_agreement', 'bond_pending')`,
        ),
      );

    for (const record of tenancies) {
      if (!record.user) continue;
      const tenantResult = await this.generateRentRecordsForTenancy(db, record.tenancy.id);
      results.generated += tenantResult.generated;
      results.skipped += tenantResult.skipped;
      results.errors.push(...tenantResult.errors);
    }

    return results;
  },

  async billingSummaryForProperty(db: DrizzleDB, propertyId: number) {
    const rows = await fetchAllRows(db, (recordType) => {
      const table = tableByType[recordType];
      return eq(table.propertyId, propertyId);
    });
    return rows.map(toListItem);
  },
};
