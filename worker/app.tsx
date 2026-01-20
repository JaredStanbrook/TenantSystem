import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { globalRenderer } from "./middleware/renderer.middleware.tsx";
import { ProfilePage } from "./views/pages/Profile";
import { JoinPage } from "./views/pages/Join.tsx";

import { apiAuth } from "./routes/api/auth";
import { webAuth } from "./routes/web/auth";
import { expenseRoute } from "./routes/tenant/expense.tsx";

import type { AppEnv } from "./types";
import { propertyRoute } from "./routes/admin/property.tsx";
import { SafeUser } from "./schema/auth.schema.ts";
import { invoiceRoute } from "./routes/admin/invoice.tsx";
import { tenancyRoute } from "./routes/admin/tenancy.tsx";
import { roomRoute } from "./routes/admin/room.ts";
import { dashboardRoute } from "./routes/admin/dashboard.tsx";
import { requireUser, requireRole } from "./middleware/guard.middleware.ts";

// ==========================================
// 1. ADMIN SUB-APP (Protected by RBAC)
// ==========================================
const admin = new Hono<AppEnv>();

// CRITICAL: Restrict this entire router to only 'admin' or 'landlord' roles.
// Tenants will be rejected (redirected or 403 based on your middleware logic).
admin.use("*", requireRole("admin", "landlord"));

admin.route("/", dashboardRoute);
admin.route("/properties", propertyRoute);
admin.route("/invoices", invoiceRoute);
admin.route("/tenancies", tenancyRoute);
admin.route("/rooms", roomRoute);

// ==========================================
// 2. MAIN APP
// ==========================================
const app = new Hono<AppEnv>()
  // Global renderer (HTMX layout wrapper)
  .use("*", globalRenderer)

  // Mount the protected admin router
  .route("/admin", admin)

  // Public Web Auth routes (Login, Register, etc.)
  .route("/", webAuth)
  .route("/expense", expenseRoute) // Singular to match NavBar
  // Public Join Page
  .get("/join", (c) => {
    return c.render(<JoinPage />, {
      title: "Join",
    });
  })

  // Protected Profile Page (Any logged-in user can see their own profile)
  .get("/profile", requireUser, (c) => {
    const { auth } = c.var;

    // We can safely cast because 'requireUser' guarantees auth.user exists
    const props = {
      user: auth.user as SafeUser,
      config: c.var.authConfig,
    };
    return c.render(<ProfilePage {...props} />, {
      title: "Profile",
    });
  })

  // ==========================================
  // 3. CONTEXT SWITCHING (Protected)
  // ==========================================
  // Only Landlords/Admins should be able to "select" a property to manage.
  // Tenants usually have a fixed assignment, so they shouldn't trigger this.
  .post(
    "/session/property",
    requireRole("admin", "landlord"), // <--- Added Security
    zValidator("form", z.object({ propertyId: z.string() })),
    async (c) => {
      const { propertyId } = c.req.valid("form");
      console.log("Switching context to property ID:", propertyId);
      if (propertyId === "all") {
        // "View All" - remove the filter
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

      // HTMX specific header to force a client-side page refresh
      // so the new cookie takes effect on the UI
      c.header("HX-Refresh", "true");
      return c.body(null);
    },
  )

  // ==========================================
  // 4. API ROUTES
  // ==========================================
  .basePath("/api")
  .route("/auth", apiAuth);

export type AppType = typeof app;
export default app;
