import { Hono } from "hono";
import { globalRenderer } from "./middleware/renderer.middleware.tsx";
import { ProfilePage } from "./views/pages/Profile";

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

const admin = new Hono<AppEnv>();
admin.route("/properties", propertyRoute);

const app = new Hono<AppEnv>()
  .use("*", globalRenderer)
  .route("/admin", admin)
  .route("/admin/invoices", invoiceRoute)
  .route("/", webAuth)
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
  /*
  .route("/expenses", expenseRoute)
  .route("/bills", billRoute)
  .route("/properties", propertyRoute)
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
