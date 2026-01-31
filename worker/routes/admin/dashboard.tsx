import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { eq, and, count, sql, desc, or, lt, gte, isNull } from "drizzle-orm";
import type { AppEnv } from "../../types";
import { property } from "../../schema/property.schema";
import { room } from "../../schema/room.schema";
import { tenancy } from "../../schema/tenancy.schema";
import { invoice, Invoice } from "../../schema/invoice.schema"; // Ensure Invoice type is exported
import { Dashboard, DashboardMetrics } from "../../views/admin/Dashboard";
import { htmxResponse } from "../../lib/htmx-helpers";

export const dashboardRoute = new Hono<AppEnv>();

dashboardRoute.get("/", async (c) => {
  const db = c.var.db;
  const cookieId = getCookie(c, "selected_property_id");

  // 1. Handle No Property Selected
  if (!cookieId) {
    const fragment = <Dashboard property={null} metrics={null} />;
    return htmxResponse(c, "Dashboard", fragment);
  }

  const propertyId = Number(cookieId);

  // 2. Fetch Property Details
  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), isNull(property.deletedAt)))
    .limit(1);

  if (!prop) {
    const fragment = <Dashboard property={null} metrics={null} />;
    return htmxResponse(c, "Dashboard", fragment);
  }

  const now = new Date();
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const windowDays =
    prop.rentFrequency === "weekly" ? 7 : prop.rentFrequency === "fortnightly" ? 14 : 31;
  const windowEndEpoch = Math.floor((now.getTime() + windowDays * 24 * 60 * 60 * 1000) / 1000);

  // 3. Fetch Metrics in Parallel
  const [
    roomStats,
    activeTenancies,
    maintenanceStats,
    invoiceStats,
    recentInvoices,
    financialHealth,
    dueNextInvoices,
  ] = await Promise.all([
    // A: Room Stats
    db
      .select({
        total: count(),
        occupied: sql<number>`sum(case when ${room.status} = 'occupied' then 1 else 0 end)`,
      })
      .from(room)
      .where(eq(room.propertyId, propertyId)),

    // B: Active Tenancies
    db
      .select({ count: count() })
      .from(tenancy)
      .where(and(eq(tenancy.propertyId, propertyId), eq(tenancy.status, "active"))),

    // C: Maintenance
    db
      .select({ count: count() })
      .from(room)
      .where(
        and(
          eq(room.propertyId, propertyId),
          sql`${room.status} IN ('vacant_maintenance', 'under_repair')`
        )
      ),

    // D: Invoice Distribution (Type Breakdown)
    db
      .select({
        type: invoice.type,
        total: sql<number>`sum(${invoice.totalAmount})`,
      })
      .from(invoice)
      .where(eq(invoice.propertyId, propertyId))
      .groupBy(invoice.type)
      .orderBy(desc(sql`sum(${invoice.totalAmount})`)),

    // E: Recent Invoices (The "Frequently Changing" Data)
    db
      .select()
      .from(invoice)
      .where(eq(invoice.propertyId, propertyId))
      .orderBy(desc(invoice.createdAt))
      .limit(5),

    // F: Financial Health (Overdue vs Pending) + Next cycle
    db
      .select({
        overdue: sql<number>`sum(case when ${invoice.status} = 'overdue' OR (${invoice.status} IN ('open','partial') AND ${invoice.dueDate} < ${nowEpoch}) then ${invoice.totalAmount} else 0 end)`,
        pending: sql<number>`sum(case when ${invoice.status} IN ('open','partial') AND ${invoice.dueDate} >= ${nowEpoch} then ${invoice.totalAmount} else 0 end)`,
        dueNext: sql<number>`sum(case when ${invoice.status} IN ('open','partial') AND ${invoice.dueDate} >= ${nowEpoch} AND ${invoice.dueDate} <= ${windowEndEpoch} then ${invoice.totalAmount} else 0 end)`,
      })
      .from(invoice)
      .where(eq(invoice.propertyId, propertyId)),

    // G: Invoices due next cycle window
    db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.propertyId, propertyId),
          sql`${invoice.status} IN ('open','partial')`,
          sql`${invoice.dueDate} >= ${nowEpoch}`,
          sql`${invoice.dueDate} <= ${windowEndEpoch}`,
        ),
      )
      .orderBy(desc(invoice.dueDate))
      .limit(6),
  ]);

  // 4. Process Data
  const totalRooms = roomStats[0]?.total || 0;
  const occupiedRooms = roomStats[0]?.occupied || 0;
  const maintenanceRooms = maintenanceStats[0]?.count || 0;
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms - maintenanceRooms);

  const metrics: DashboardMetrics = {
    totalRooms,
    occupiedRooms,
    vacantRooms,
    maintenanceRooms,
    activeTenants: activeTenancies[0]?.count || 0,
    occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
    invoiceDistribution: invoiceStats.map((s) => ({
      type: s.type,
      amount: Number(s.total) || 0,
    })),
    recentInvoices: recentInvoices as Invoice[],
    financials: {
      overdueAmount: Number(financialHealth[0]?.overdue) || 0,
      pendingAmount: Number(financialHealth[0]?.pending) || 0,
      dueNextAmount: Number(financialHealth[0]?.dueNext) || 0,
    },
    dueNextInvoices: dueNextInvoices as Invoice[],
    dueWindowDays: windowDays,
  };

  const fragment = <Dashboard property={prop} metrics={metrics} />;
  return htmxResponse(c, `${prop.nickname || "Property"} Dashboard`, fragment);
});
