import { html } from "hono/html";
import type { FC, Child } from "hono/jsx";
import { type PropsUser } from "@server/schema/auth.schema";
import { NavBar } from "./components/NavBar";
import { SafeProperty } from "@server/schema/property.schema";

interface LayoutProps {
  title?: string;
  children?: Child;
  user?: PropsUser | null;
  headExtra?: Child;
  currentPropertyId?: number;
  properties?: SafeProperty[];
  googleMapsApiKey?: string;
}

export const Layout: FC<LayoutProps> = (props) => {
  const isProd = import.meta.env ? import.meta.env.PROD : true;

  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link
          id="app-favicon"
          rel="icon"
          type="image/svg+xml"
          href="/house-door-light.svg"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${props.title}</title>
        ${isProd
          ? html`<link rel="stylesheet" href="/static/main.css" />`
          : html`<link rel="stylesheet" href="/worker/index.css" />`}
        <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script>
          (() => {
            const favicon = document.getElementById("app-favicon");
            if (!favicon) return;

            const pickTheme = () => {
              const root = document.documentElement;
              if (root.classList.contains("dark") || root.classList.contains("dusk")) {
                return "dark";
              }
              if (root.classList.contains("light") || root.classList.contains("bush")) {
                return "light";
              }
              return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            };

            const apply = () => {
              const theme = pickTheme();
              favicon.setAttribute(
                "href",
                theme === "dark" ? "/house-door-dark.svg" : "/house-door-light.svg",
              );
            };

            apply();
            window.addEventListener("theme-change", apply);
            window
              .matchMedia("(prefers-color-scheme: dark)")
              .addEventListener("change", apply);

            const observer = new MutationObserver(apply);
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
          })();
        </script>
        <script>
          ((g) => {
            var h,
              a,
              k,
              p = "The Google Maps JavaScript API",
              c = "google",
              l = "importLibrary",
              q = "__ib__",
              m = document,
              b = window;
            b = b[c] || (b[c] = {});
            var d = b.maps || (b.maps = {}),
              r = new Set(),
              e = new URLSearchParams(),
              u = () =>
                h ||
                (h = new Promise(async (f, n) => {
                  await (a = m.createElement("script"));
                  e.set("libraries", [...r] + "");
                  for (k in g)
                    e.set(
                      k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
                      g[k]
                    );
                  e.set("callback", c + ".maps." + q);
                  a.src = "https://maps." + c + "apis.com/maps/api/js?" + e;
                  d[q] = f;
                  a.onerror = () => (h = n(Error(p + " could not load.")));
                  a.nonce = m.querySelector("script[nonce]")?.nonce || "";
                  m.head.append(a);
                }));
            d[l]
              ? console.warn(p + " only loads once. Ignoring:", g)
              : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
          })({
            key: "${props.googleMapsApiKey}",
            v: "weekly",
          });
        </script>
        <script
          type="module"
          src="${isProd ? "/static/client.js" : "/worker/components/main.ts"}"></script>
        ${props.headExtra}
      </head>
      <body class="bg-background text-foreground antialiased min-h-screen font-sans flex flex-col">
        <theme-provider defaultTheme="system"></theme-provider>

        ${NavBar({
          user: props.user,
          currentPath: "",
          properties: props.properties,
          currentPropertyId: props.currentPropertyId,
        })}

        <main hx-boost="true" id="main-content" class="relative flex-grow w-full">
          ${props.children}
        </main>
        <div id="modal-container"></div>

        <app-toaster></app-toaster>

        <footer class="py-6 md:px-8 md:py-0">
          <div class="flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built for small landlords. Simple, reliable, tenant-friendly.
            </p>
          </div>
        </footer>
      </body>
    </html>
  `;
};
