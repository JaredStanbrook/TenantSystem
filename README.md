# Tenant System

[![CI](https://github.com/JaredStanbrook/TenantSystem/actions/workflows/ci.yml/badge.svg)](https://github.com/JaredStanbrook/TenantSystem/actions/workflows/ci.yml)

A full-stack property and tenancy management app built on Cloudflare Workers with Hono SSR (JSX + HTMX), Drizzle ORM, and Bun.

---

## 🚀 Features

- **Full-stack:** Hono routes + SSR JSX, HTMX fragments, Drizzle ORM, SQLite (D1)
- **Modern Tooling:** Bun, Vite, TypeScript, Tailwind CSS, Zod validation
- **Auth & Roles:** Built-in auth schema + role/permission scaffolding
- **Production Ready:** Cloudflare Workers + Wrangler deploy scripts
- **Developer Experience:** Fast local dev, hot reload, strong type safety

---

## 📦 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account (for deployment)

### Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Generate Drizzle tables & Wrangler types
bun run gen

# 3. Apply local database migrations
bun run migrate:local

# 4. Start local development (Vite + worker)
bun dev
```

---

## 🛠️ Scripts

| Script                   | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `bun dev`                | Start local dev (Vite + worker)                   |
| `bun run build`          | Build client + server bundles                     |
| `bun run build:client`   | Build client bundle                               |
| `bun run build:server`   | Build worker bundle                               |
| `bun run typecheck`      | Run TypeScript project checks                     |
| `bun run lint`           | Run ESLint                                        |
| `bun test`               | Run Vitest                                        |
| `bun run gen`            | Generate Drizzle artifacts + Wrangler types       |
| `bun run migrate:local`  | Apply local D1 migrations                         |
| `bun run migrate:remote` | Apply remote D1 migrations                        |
| `bun run deploy:staging` | Migrate + build + deploy to Cloudflare (staging)  |
| `bun run deploy:prod`    | Migrate + build + deploy to Cloudflare (prod)     |
| `bun run preview`        | Build + run the worker locally with Wrangler      |

---

## 🗂️ Project Structure

```
/
├── worker/          # Hono routes, SSR JSX views, HTMX fragments
├── worker/schema/   # Drizzle + Zod schemas
├── worker/services/ # Business logic
├── drizzle/         # D1 migrations + metadata
├── public/          # Static assets
├── package.json     # Scripts + deps
├── tsconfig.json    # TypeScript config
└── wrangler.jsonc   # Cloudflare Worker config
```

---

## 🧑‍💻 Development Workflow

- **Unified Dev:** `bun dev` starts Vite + worker with hot reload.
- **Database:** Drizzle ORM for schema + D1 migrations in `drizzle/`.
- **Type Safety:** TypeScript-first everywhere.
- **Linting/Testing:** ESLint + Vitest.

---

## 🚢 Deployment

> **⚠️ Configuration Required:**  
> Create `wrangler.jsonc` from the example and set your Cloudflare bindings (D1/KV/R2) before build or deploy.

**Example:**

```bash
cp wrangler.jsonc.example wrangler.jsonc
# Edit wrangler.jsonc with your Cloudflare D1/KV/R2 details
```

> **Note:**  
> The app will not build or deploy until Cloudflare resources are configured.

### Environment Variables

Copy `.dev.vars.example` to `.dev.vars` and `.dev.vars.staging` for local/staging settings.

1. **Staging Deploy**
   ```bash
   bun run deploy:staging
   ```
2. **Production Deploy**
   ```bash
   bun run deploy:prod
   ```

---

## 🤝 Contributing

Contributions are welcome. Follow Conventional Commits as outlined in `CONTRIBUTING.md`.

---

## 📄 License

See `LICENSE`.

---

## 🙏 Acknowledgements

- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Bun](https://bun.sh/)
