import { jsxRenderer } from "hono/jsx-renderer";
import { Layout } from "../views/Layout";

declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string }): Response;
  }
}

// 2. The Middleware
export const globalRenderer = jsxRenderer(({ children, title }, c) => {
  const user = c.var.auth?.user || null;
  const currentPath = c.req.path;

  return (
    <Layout title={title || "My App"} user={user}>
      {children}
    </Layout>
  );
});
