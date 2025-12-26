import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { globalRenderer } from "./middleware/renderer.middleware.tsx";
import { ProfilePage } from "./views/pages/Profile";
import { JoinPage } from "./views/pages/Join.tsx";

import { apiAuth } from "./routes/api/auth";
/*
import { apiExpense } from "./routes/api/expense";
import { apiBill } from "./routes/api/bill";
import { apiProperty } from "./routes/api/property";
import { apiUserProperty } from "./routes/api/userProperty";
import { apiWaitlist } from "./routes/api/waitlist";
*/
import { webAuth } from "./routes/web/auth";
/*
import { webExpense } from "./routes/web/expense";
import { webBill } from "./routes/web/bill";
import { webProperty } from "./routes/web/property";
import { webUserProperty } from "./routes/web/userProperty";
import { webBaitlist } from "./routes/web/waitlist";
*/

import type { AppEnv } from "./types";
import { propertyRoute } from "./routes/admin/property.tsx";
import { SafeUser } from "./schema/auth.schema.ts";
import { invoiceRoute } from "./routes/admin/invoice.tsx";
import { tenancyRoute } from "./routes/admin/tenancy.tsx";
import { flashToast } from "./lib/htmx-helpers.ts";
import { roomRoute } from "./routes/admin/room.ts";

const admin = new Hono<AppEnv>();
admin.route("/properties", propertyRoute);
admin.route("/invoices", invoiceRoute);
admin.route("/tenancies", tenancyRoute);
admin.route("/rooms", roomRoute);

const app = new Hono<AppEnv>()
  .use("*", globalRenderer)

  .route("/admin", admin)
  .route("/", webAuth)
  .get("/join", (c) => {
    return c.render(<JoinPage />, {
      title: "Join",
    });
  })
  .get("/profile", (c) => {
    const { auth } = c.var;

    const props = {
      user: auth.user as SafeUser,
      config: c.var.authConfig,
    };
    return c.render(<ProfilePage {...props} />, {
      title: "Profile",
    });
  })
  .post(
    "/session/property",
    zValidator("form", z.object({ propertyId: z.string() })),
    async (c) => {
      const { propertyId } = c.req.valid("form");

      if (propertyId === "all") {
        // Logic for "View All" - remove the filter
        deleteCookie(c, "selected_property_id");
      } else {
        // Set the specific property ID in a secure cookie
        setCookie(c, "selected_property_id", propertyId, {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30, // 30 days
          sameSite: "Lax",
        });
      }

      c.header("HX-Refresh", "true");
      return c.body(null);
    }
  )
  /*
  .route("/bills", billRoute)
  .route("/user-properties", userPropertyRoute)
  .route("/waitlist", waitlistRoute)
  */
  .basePath("/api")
  .route("/auth", apiAuth);
/*
  .route("/expenses", apiExpense)
  .route("/bills", billRoute)
  .route("/properties", propertyRoute)
  .route("/user-properties", userPropertyRoute)
  .route("/waitlist", waitlistRoute);
  */
export type AppType = typeof app;
export default app;
