import { hc } from "hono/client";
import { type AppType } from "@server/index";

const client = hc<AppType>("/");
export const api = client.api;
