import { drizzle } from "drizzle-orm/d1";
import type { AuthConfig } from "./config/auth.config";
import type { Auth } from "./services/auth.service";

export type Bindings = {
  KV: KVNamespace;
  DB: D1Database;
  ASSETS: Fetcher;
  BLOG: R2Bucket;
  RATE_LIMITER: RateLimit;
};
export type Variables = {
  db: ReturnType<typeof drizzle>;
  authConfig: AuthConfig;
  isMethodEnabled: (method: string) => boolean;
  auth: Auth;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
