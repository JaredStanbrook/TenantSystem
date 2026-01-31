import { jsxRenderer } from "hono/jsx-renderer";
import { Layout } from "../views/Layout";
import { getCookie } from "hono/cookie";
import { and, eq, isNull } from "drizzle-orm";
import { property } from "@server/schema/property.schema";

declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string }): Response;
  }
}

// 2. The Middleware
export const globalRenderer = jsxRenderer(async ({ children, title }, c) => {
  const db = c.var.db;
  const user = c.var.auth?.user || null;

  const cookieId = getCookie(c, "selected_property_id");
  const currentPropertyId = cookieId ? Number(cookieId) : undefined;

  const activeProperties = user
    ? await db
        .select()
        .from(property)
        .where(and(eq(property.landlordId, user.id), isNull(property.deletedAt)))
    : [];

  //const currentPath = c.req.path;

  return (
    <Layout
      title={title || "My App"}
      user={user}
      currentPropertyId={currentPropertyId}
      properties={activeProperties}
      googleMapsApiKey={c.env.GOOGLE_MAPS_API_KEY}>
      {children}
    </Layout>
  );
});
