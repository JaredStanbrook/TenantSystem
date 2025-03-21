import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

import { expenseRoute } from "./routes/expense";
import { billRoute } from "./routes/bill";
import { authRoute } from "./routes/auth";

const app = new Hono<{ Bindings: Env }>()
  .use("*", logger())
  .use(
    cors({
      origin: "*",
      allowHeaders: ["Authorization", "Content-Type"],
    })
  )
  .basePath("/api")
  .route("/auth", authRoute)
  .route("/expense", expenseRoute)
  .route("/bill", billRoute)
  .get("/*", async (c) => {
    const object = await c.env.R2.get(c.req.path.slice(1));
    if (object != null) {
      c.status(201);
      return c.body(object?.body);
    } else {
      return c.env.ASSETS.fetch(c.req.raw);
    }
  });
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});
app.notFound((c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export type AppType = typeof app;
export default app;
