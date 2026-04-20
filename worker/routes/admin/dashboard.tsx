import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { AppEnv } from "../../types";
import { property } from "../../schema/property.schema";
import { room } from "../../schema/room.schema";
import { tenancy } from "../../schema/tenancy.schema";
import { BillingService, getEffectiveDueDate } from "../../services/billing.service";
import { Dashboard, type DashboardMetrics } from "../../views/admin/Dashboard";
import { htmxResponse } from "../../lib/htmx-helpers";

export const dashboardRoute = new Hono<AppEnv>();

dashboardRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;
  const isAdmin = user.roles.includes("admin");
  const cookieId = getCookie(c, "selected_property_id");

  if (!cookieId) {
    return htmxResponse(c, "Dashboard", <Dashboard property={null} metrics={null} />);
  }

  const propertyId = Number(cookieId);
  const [prop] = await db
    .select()
    .from(property)
    .where(
      and(
        eq(property.id, propertyId),
        isAdmin ? undefined : eq(property.landlordId, user.id),
        isNull(property.deletedAt),
      ),
    )
    .limit(1);

  if (!prop) {
    return htmxResponse(c, "Dashboard", <Dashboard property={null} metrics={null} />);
  }

  const windowDays =
    prop.rentFrequency === "weekly" ? 7 : prop.rentFrequency === "fortnightly" ? 14 : 31;
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const [roomStats, activeTenancies, maintenanceStats, billingRows] = await Promise.all([
    db
      .select({
        total: count(),
        occupied: sql<number>`sum(case when ${room.status} = 'occupied' then 1 else 0 end)`,
      })
      .from(room)
      .where(eq(room.propertyId, propertyId)),
    db
      .select({ count: count() })
      .from(tenancy)
      .where(and(eq(tenancy.propertyId, propertyId), eq(tenancy.status, "active"))),
    db
      .select({ count: count() })
      .from(room)
      .where(
        and(
          eq(room.propertyId, propertyId),
          sql`${room.status} IN ('vacant_maintenance', 'under_repair')`,
        ),
      ),
    BillingService.billingSummaryForProperty(db, propertyId),
  ]);

  const totalRooms = roomStats[0]?.total || 0;
  const occupiedRooms = roomStats[0]?.occupied || 0;
  const maintenanceRooms = maintenanceStats[0]?.count || 0;
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms - maintenanceRooms);

  const invoiceDistributionMap = new Map<string, number>();
  let grossRentalIncome = 0;
  let overdueAmount = 0;
  let pendingAmount = 0;
  let dueNextAmount = 0;

  for (const row of billingRows) {
    const bucket = row.recordType === "bill" ? `bill:${row.category}` : row.recordType;
    invoiceDistributionMap.set(bucket, (invoiceDistributionMap.get(bucket) || 0) + row.totalAmount);

    if (row.recordType === "rent" && row.status !== "void") {
      grossRentalIncome += row.amountPaid || 0;
    }

    if (row.status === "paid" || row.status === "void") continue;

    const effectiveDueDate = getEffectiveDueDate(row);
    if (effectiveDueDate < now) {
      overdueAmount += row.totalAmount - row.amountPaid;
      continue;
    }

    pendingAmount += row.totalAmount - row.amountPaid;
    if (effectiveDueDate <= windowEnd) {
      dueNextAmount += row.totalAmount - row.amountPaid;
    }
  }

  const recentInvoices = [...billingRows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const dueNextInvoices = billingRows
    .filter((row) => {
      if (row.status === "paid" || row.status === "void") return false;
      const effectiveDueDate = getEffectiveDueDate(row);
      return effectiveDueDate >= now && effectiveDueDate <= windowEnd;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 6);

  const metrics: DashboardMetrics = {
    totalRooms,
    occupiedRooms,
    vacantRooms,
    maintenanceRooms,
    activeTenants: activeTenancies[0]?.count || 0,
    occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
    invoiceDistribution: Array.from(invoiceDistributionMap.entries()).map(([type, amount]) => ({
      type,
      amount,
    })),
    recentInvoices,
    dueNextInvoices,
    dueWindowDays: windowDays,
    financials: {
      grossRentalIncome,
      overdueAmount,
      pendingAmount,
      dueNextAmount,
    },
  };

  return htmxResponse(c, `${prop.nickname || "Property"} Dashboard`, (
    <Dashboard property={prop} metrics={metrics} />
  ));
});
