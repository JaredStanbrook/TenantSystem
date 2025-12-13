import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/d1";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { verifyRequestOrigin, Lucia } from "lucia";
import type { User, Session } from "lucia";
import { user as userTable } from "./schema/user.ts";

import { session as sessionTable } from "./schema/session.ts";
import { getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import type { User as LuciaUser } from "./schema/user.ts";
import { HTTPException } from "hono/http-exception";

export type CustomContext = {
  db: ReturnType<typeof drizzle>;
  lucia?: Lucia;
  user: LuciaUser | null;
  session: Session | null;
};

export const dbMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: CustomContext;
}>(async (c, next) => {
  const db = drizzle(c.env.DB);
  c.set("db", db);
  await next();
});

export const luciaMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: CustomContext;
}>(async (c, next) => {
  const db = c.get("db");
  const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);

  const lucia = new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: false,
      },
    },
    getUserAttributes: (attributes: any) => ({
      email: attributes.email,
      emailVerified: Boolean(attributes.email_verified),
    }),
  });

  c.set("lucia", lucia);
  await next();
});

export const userMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: CustomContext;
}>(async (c, next) => {
  const db = c.get("db");
  const lucia = c.get("lucia");

  if (!lucia) {
    throw new HTTPException(500, { message: "Lucia not initialized" });
  }

  const path = c.req.path;
  if (path.endsWith("/signup") || path.endsWith("/login")) {
    c.set("user", null);
    c.set("session", null);
    return await next();
  }

  if (c.req.method !== "GET" && c.env.ENVIRONMENT !== "staging") {
    const originHeader = c.req.header("Origin");
    const hostHeader = c.req.header("Host");
    if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
  }

  const sessionId = getCookie(c, lucia.sessionCookieName) ?? null;
  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const { session, user } = await lucia.validateSession(sessionId);
  if (session && session.fresh) {
    // use `header()` instead of `setCookie()` to avoid TS errors
    c.header("Set-Cookie", lucia.createSessionCookie(session.id).serialize(), {
      append: true,
    });
  }
  if (!session) {
    c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize(), {
      append: true,
    });
  }

  const [dbUser] = await db
    .select({
      email: userTable.email,
      firstName: userTable.firstName,
      lastName: userTable.lastName,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, user!.id))
    .limit(1);

  if (!dbUser) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  c.set("user", { id: user!.id, ...dbUser });
  c.set("session", session);

  await next();
});
