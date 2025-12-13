import { html } from "hono/html";
import type { FC, Child } from "hono/jsx";
import { type SafeUser } from "@server/schema/auth.schema";
import { NavBar } from "./components/NavBar";

interface LayoutProps {
  title?: string;
  children?: Child;
  user?: SafeUser | null;
  headExtra?: Child;
}

export const Layout: FC<LayoutProps> = (props) => {
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/house-door.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${props.title}</title>
        ${import.meta.env.PROD
          ? html`<link rel="stylesheet" href="/static/style.css" />`
          : html`<link rel="stylesheet" href="/worker/index.css" />`}
        <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script
          type="module"
          src="${import.meta.env.PROD
            ? "/static/client.js"
            : "/worker/components/main.ts"}"></script>
        ${props.headExtra}
      </head>
      <body class="bg-background text-foreground antialiased min-h-screen font-sans flex flex-col">
        <theme-provider defaultTheme="system"></theme-provider>

        ${NavBar({
          user: props.user,
          currentPath: "",
        })}

        <main class="mx-auto relative p-4 flex-grow w-full max-w-7xl">
          <!-- Main content container that HTMX will target -->
          <div id="main-content" class="w-full">${props.children}</div>
        </main>

        <app-toaster></app-toaster>

        <footer class="py-6 md:px-8 md:py-0">
          <div
            class="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built with Hono & Lit.
            </p>
          </div>
        </footer>
      </body>
    </html>
  `;
};
