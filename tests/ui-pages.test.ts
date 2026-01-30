import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "../worker/types";
import app from "../worker/app";
import { createFakeDb, createMockData } from "./utils/fakeDb";
import type { AuthConfig } from "../worker/config/auth.config";

const createAuthConfig = (): AuthConfig => ({
  methods: new Set(["password"]),
  session: { duration: 1000, renewalThreshold: 500, maxSessions: 5 },
  security: {
    maxFailedAttempts: 5,
    lockoutDuration: 300,
    requireEmailVerification: false,
    requirePhoneVerification: false,
    allowedEmails: [],
    jwtSecret: "test",
    jwtExpiry: 3600,
  },
  roles: {
    available: ["admin", "landlord", "tenant"],
    default: "tenant",
    restricted: ["admin"],
    inherent: {},
  },
  permissions: {
    available: [],
  },
  password: {
    minLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
  },
});

const createTestApp = (user: any | null) => {
  const mockData = createMockData();
  const fakeDb = createFakeDb(mockData);

  const wrapper = new Hono<AppEnv>();
  wrapper.use("*", async (c, next) => {
    c.set("db", fakeDb as any);
    c.set("authConfig", createAuthConfig());
    c.set("auth", { user, session: user ? { id: user.id } : null, destroySession() {} } as any);
    c.set("isMethodEnabled", () => true);
    await next();
  });

  wrapper.route("/", app);
  return wrapper;
};

const env = {
  KV: {} as KVNamespace,
  DB: {} as D1Database,
  ASSETS: {} as Fetcher,
  BLOG: {} as R2Bucket,
  GOOGLE_MAPS_API_KEY: "",
} as any;

describe("UI pages load", () => {
  it("loads public pages", async () => {
    const testApp = createTestApp(null);
    const paths = ["/", "/login", "/register", "/join"];
    for (const path of paths) {
      const res = await testApp.fetch(new Request(`http://localhost${path}`), env);
      expect(res.status).toBe(200);
    }
  });

  it("loads protected pages", async () => {
    const testApp = createTestApp(createMockData().users[0]);
    const paths = [
      "/profile",
      "/expense",
      "/admin",
      "/admin/properties",
      "/admin/properties/create",
      "/admin/properties/1/edit",
      "/admin/invoices",
      "/admin/invoices/create",
      "/admin/invoices/1/edit",
      "/admin/tenancies",
      "/admin/tenancies/create",
      "/admin/tenancies/1/edit",
      "/admin/rooms/1/edit",
    ];

    for (const path of paths) {
      const res = await testApp.fetch(new Request(`http://localhost${path}`), env);
      expect(res.status).toBe(200);
    }
  });
});
