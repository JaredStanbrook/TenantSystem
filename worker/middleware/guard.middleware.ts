// worker/middleware/guard.middleware.ts
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types"; // Import your Hono Env types
import { HTTPException } from "hono/http-exception";

/**
 * Ensures the user is logged in and holds at least one of the required roles.
 * Usage: .use(requireRole("admin", "editor"))
 */
export const requireRole = (...allowedRoles: string[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.var.auth.user;
    // 1. Authentication Check
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // 2. Authorization Check (Role)
    // We check if the user has ANY of the allowed roles
    const hasRole = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      // It is good security practice to log this unauthorized attempt
      console.warn(
        `User ${user.id} attempted to access protected route. Required: ${allowedRoles}, Actual: ${user.roles}`
      );
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    await next();
  });

/**
 * Ensures the user is logged in and holds a specific permission.
 * This is often better than checking roles directly.
 * Usage: .use(requirePermission("users.delete"))
 */
export const requirePermission = (requiredPermission: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.var.auth.user;

    // 1. Authentication Check
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // 2. Authorization Check (Permission)
    // Your SafeUser object already has the flat array of permissions calculated
    if (!user.permissions.includes(requiredPermission)) {
      throw new HTTPException(403, { message: "Missing required permission" });
    }

    await next();
  });
