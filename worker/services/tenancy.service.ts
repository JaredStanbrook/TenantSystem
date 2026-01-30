// server/services/tenancy.service.ts

import { eq } from "drizzle-orm";
import { tenancy, type Tenancy } from "@server/schema/tenancy.schema";
import { property } from "@server/schema/property.schema";
import { room } from "@server/schema/room.schema";
import type { Variables } from "@server/types";

import { TENANCY_STATUS_VALUES } from "@server/schema/tenancy.schema";

export type TenancyStatus = (typeof TENANCY_STATUS_VALUES)[number];

// map[CurrentStatus] => AllowedNextStatuses[]
export const VALID_TRANSITIONS: Record<TenancyStatus, TenancyStatus[]> = {
  pending_agreement: ["bond_pending", "closed"],
  bond_pending: ["move_in_ready", "pending_agreement", "closed"],
  move_in_ready: ["active", "bond_pending", "closed"],
  active: ["notice_period", "evicted", "closed"],
  notice_period: ["ended_pending_bond", "active"],
  ended_pending_bond: ["closed", "active"],
  closed: [], // Terminal
  evicted: ["closed", "ended_pending_bond"],
};

export function canTransition(current: TenancyStatus, next: TenancyStatus): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getDerivedRoomStatus(tenancyStatus: TenancyStatus) {
  switch (tenancyStatus) {
    case "active":
    case "notice_period":
      return "occupied";
    case "closed":
    case "evicted":
    case "ended_pending_bond":
      return "vacant_ready";
    default:
      return null;
  }
}

export class TenancyService {
  constructor(private db: Variables["db"]) {}
  /**
   * Fetches a single tenancy by ID
   */
  async getById(tenancyId: number): Promise<Tenancy> {
    const [record] = await this.db.select().from(tenancy).where(eq(tenancy.id, tenancyId));

    if (!record) {
      throw new Error("Tenancy not found");
    }

    return record;
  }
  /**
   * Updates the status of a tenancy with validation and side effects.
   */
  async updateStatus(
    tenancyId: number,
    newStatus: TenancyStatus,
    actorId: string,
    force: boolean = false, // Add force parameter
  ): Promise<Tenancy> {
    const [record] = await this.db
      .select({ t: tenancy, p: property })
      .from(tenancy)
      .innerJoin(property, eq(tenancy.propertyId, property.id))
      .where(eq(tenancy.id, tenancyId));

    if (!record) throw new Error("Tenancy not found");
    if (record.p.landlordId !== actorId) throw new Error("Unauthorized");

    const currentStatus = record.t.status as TenancyStatus;

    // 2. Validate Transition (Bypass if forced)
    if (!force && !canTransition(currentStatus, newStatus)) {
      // Throw a specific error string so the controller can detect it
      throw new Error("INVALID_TRANSITION");
    }

    // 3. Sequential Updates (D1 execution)

    // A. Update Tenancy first
    await this.db
      .update(tenancy)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        endDate: ["closed", "evicted"].includes(newStatus) ? new Date() : undefined,
      })
      .where(eq(tenancy.id, tenancyId));

    // B. Handle Room Side Effects
    if (record.t.roomId) {
      const nextRoomStatus = getDerivedRoomStatus(newStatus);
      if (nextRoomStatus) {
        await this.db
          .update(room)
          .set({ status: nextRoomStatus })
          .where(eq(room.id, record.t.roomId));
      }
    }

    // C. Return fresh record
    const [updated] = await this.db.select().from(tenancy).where(eq(tenancy.id, tenancyId));

    return updated;
  }
}
