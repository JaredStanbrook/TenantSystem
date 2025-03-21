import { hc } from "hono/client";
import { type AppType } from "@server/index";

//hc<AppType>("/", { init: { credentials: "include" } });

const client = hc<AppType>("/");
export const api = client.api;
