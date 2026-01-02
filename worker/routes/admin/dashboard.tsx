import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { eq, and, count, sql, desc, gte } from "drizzle-orm";
import type { AppEnv } from "../../types";
import { property } from "../../schema/property.schema";
import { room } from "../../schema/room.schema";
import { tenancy } from "../../schema/tenancy.schema";
import { Dashboard } from "../../views/admin/Dashboard";
import { invoice } from "../../schema/invoice.schema";

export const dashboardRoute = new Hono<AppEnv>();

dashboardRoute.get("/", async (c) => {
  const db = c.var.db;
  const cookieId = getCookie(c, "selected_property_id");

  // 1. Handle No Property Selected
  if (!cookieId) {
    return c.render(<Dashboard property={null} metrics={null} />, { title: "Dashboard" });
  }

  const propertyId = Number(cookieId);

  // 2. Fetch Property Details
  const [prop] = await db.select().from(property).where(eq(property.id, propertyId)).limit(1);

  if (!prop) {
    // Cookie might be stale
    return c.render(<Dashboard property={null} metrics={null} />, { title: "Dashboard" });
  }

  // 3. Fetch Metrics in Parallel
  const [roomStats, activeTenancies, maintenanceStats, invoiceStats] = await Promise.all([
    // A: Room Stats (Total & Occupied)
    db
      .select({
        total: count(),
        occupied: sql<number>`sum(case when ${room.status} = 'occupied' then 1 else 0 end)`,
      })
      .from(room)
      .where(eq(room.propertyId, propertyId)),

    // B: Active Tenancies Count
    db
      .select({ count: count() })
      .from(tenancy)
      .where(and(eq(tenancy.propertyId, propertyId), eq(tenancy.status, "active"))),

    // C: Maintenance Count (Vacant Maintenance + Under Repair)
    db
      .select({ count: count() })
      .from(room)
      .where(
        and(
          eq(room.propertyId, propertyId),
          sql`${room.status} IN ('vacant_maintenance', 'under_repair')`
        )
      ),

    // D: Invoice Stats (Sum totalAmount by Type)
    db
      .select({
        type: invoice.type,
        total: sql<number>`sum(${invoice.totalAmount})`, // Sum in cents
      })
      .from(invoice)
      .where(eq(invoice.propertyId, propertyId))
      .groupBy(invoice.type)
      .orderBy(desc(sql`sum(${invoice.totalAmount})`)),
  ]);

  // 4. Process Data
  const totalRooms = roomStats[0]?.total || 0;
  const occupiedRooms = roomStats[0]?.occupied || 0;
  const maintenanceRooms = maintenanceStats[0]?.count || 0;
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms - maintenanceRooms);

  const metrics = {
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
  };

  return c.render(<Dashboard property={prop} metrics={metrics} />, {
    title: `${prop.nickname || "Property"} Dashboard`,
  });
});
