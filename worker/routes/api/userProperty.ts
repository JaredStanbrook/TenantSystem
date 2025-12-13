import { Hono } from "hono";
import { dbMiddleware, luciaMiddleware, userMiddleware } from "../db";
import { userProperty } from "../db/schema/userProperty";

export const userPropertyRoute = new Hono<{ Bindings: Env }>()
  .use("*", dbMiddleware)
  .get("/", async (c) => {
    const userProperties = await c.var.db.select().from(userProperty);
    return c.json({ userProperties });
  });
