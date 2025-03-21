import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/d1";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { verifyRequestOrigin, Lucia } from "lucia";
import type { User, Session } from "lucia";
import { users as userTable } from "./schema/users.ts";
import { sessions as sessionTable } from "./schema/sessions.ts";
import { getCookie } from "hono/cookie";

export type CustomContext = {
  db: ReturnType<typeof drizzle>;
  lucia?: Lucia;
  user: User | null;
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

  if (c.req.method !== "GET") {
    const originHeader = c.req.header("Origin");
    const hostHeader = c.req.header("Host");
    if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
      return c.body(null, 403);
    }
  }

  const sessionId = getCookie(c, lucia.sessionCookieName) ?? null;
  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    return next();
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
  c.set("user", user);
  c.set("session", session);

  await next();
});
