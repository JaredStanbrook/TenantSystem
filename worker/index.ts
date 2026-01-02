import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { AppEnv } from "./types";

import routes from "./app";

// Middleware Imports
import { configMiddleware } from "./middleware/config.middleware";
import { dbMiddleware } from "./middleware/db.middleware";
import { authMiddleware } from "./middleware/auth.middleware";

const backends: Record<string, string> = {
  sheoak: "https://sheoak.stanbrook.me",
};

const worker = new Hono<AppEnv>();

// ---------------------------------------------------------
// GLOBAL MIDDLEWARE
// ---------------------------------------------------------
worker.use("*", logger());
worker.use(
  cors({
    origin: (origin) => {
      // Allow local development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return origin;
      }
      // Allow production domain (from your wrangler config)
      if (origin.endsWith("stanbrook.me")) {
        return origin;
      }
      // Block others (or return your main domain as a fallback)
      return "https://home.stanbrook.me";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    exposeHeaders: ["HX-Trigger", "HX-Redirect", "HX-Push-Url"],
    credentials: true,
  })
);

// Apply DB & Config globally so SSR pages can use them too
worker.use("*", configMiddleware);
worker.use("*", dbMiddleware);
worker.use("*", authMiddleware);

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------
// Mounts your existing API at /api/...
// (Since app.ts has .basePath('/api'), we mount it at '/')
worker.route("/", routes);

// ---------------------------------------------------------
// PROXY & ASSETS
// ---------------------------------------------------------
worker.all("/:house/*", async (c) => {
  const house = c.req.param("house");
  const backend = backends[house];

  if (!backend) {
    return c.html("Where are you going?", 404);
    //return c.env.ASSETS.fetch(c.req.raw);
  }

  const targetPath = c.req.path.replace(`/${house}`, "");
  const query = c.req.url.split(c.req.path)[1] || "";

  if (targetPath.includes("/socket.io")) {
    return fetch(`${backend}/${house}${targetPath}${query}`, c.req.raw);
  }

  return fetch(`${backend}${targetPath}`, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body:
      c.req.method !== "GET" && c.req.method !== "HEAD"
        ? await c.req.raw.clone().blob()
        : undefined,
  });
});

worker.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Fallback for static assets (Vite client build)
worker.notFound((c) => {
  return c.html("Where are you going?"); //c.env.ASSETS.fetch(c.req.raw);
});

export default worker;
