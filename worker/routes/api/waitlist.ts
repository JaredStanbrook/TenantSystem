import { Hono } from "hono";
import { dbMiddleware, luciaMiddleware, userMiddleware } from "../db";
import { waitlist as waitlistTable } from "../db/schema/waitlist";
import { sql } from "drizzle-orm";

export const waitlistRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .get("/", async (c) => {
    const waitlistEntries = await c.var.db
      .select({
        id: waitlistTable.id,
        propertyId: waitlistTable.propertyId,
        fullName: waitlistTable.fullName,
        email: waitlistTable.email,
        phone: waitlistTable.phone,
        dateOfBirth: waitlistTable.dateOfBirth,
        employment: waitlistTable.employment,
        references: waitlistTable.references,
        about: waitlistTable.about,
        pets: waitlistTable.pets,
        status: waitlistTable.status,
        source: waitlistTable.source,
        notes: waitlistTable.notes,
        createdAt: sql`datetime(${waitlistTable.createdAt}, 'localtime')`.as("createdAt"),
        updatedAt: sql`datetime(${waitlistTable.updatedAt}, 'localtime')`.as("updatedAt"),
      })
      .from(waitlistTable)
      .all();

    return c.json({ waitlistEntries });
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    console.log("Received waitlist entry:", body);
    const newEntry = await c.var.db
      .insert(waitlistTable)
      .values(body)
      .returning()
      .then((res) => res[0]);
    c.status(201);
    return c.json(newEntry);
  });
