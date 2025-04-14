import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

import { expenseRoute } from "./routes/expense";
import { billRoute } from "./routes/bill";
import { authRoute } from "./routes/auth";
import { propertyRoute } from "./routes/property";
import { HTTPException } from "hono/http-exception";

const app = new Hono<{ Bindings: Env }>()
  .use("*", logger())
  .use(
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      credentials: true,
    })
  )
  .basePath("/api")
  .route("/auth", authRoute)
  .route("/expenses", expenseRoute)
  .route("/bills", billRoute)
  .route("/properties", propertyRoute)
  .get("/*", async (c) => {
    const object = await c.env.R2.get(c.req.path.slice(1));
    if (object != null) {
      c.status(201);
      return c.body(object?.body);
    } else {
      return c.env.ASSETS.fetch(c.req.raw);
    }
  });

app.onError((err) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  } else {
    return new Response("Internal Server Error", { status: 500 });
  }
});

app.notFound((c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export type AppType = typeof app;
export default app;
