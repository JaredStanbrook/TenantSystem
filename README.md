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
- **Tenant Portal:** Expenses view with extensions and payment confirmations

---

## 📦 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- Node.js 20.x (see `.node-version`)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account (for deployment)

### Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Copy environment config
cp .env.example .env

# 3. Generate Drizzle tables & Wrangler types
bun run gen

# 4. Apply local database migrations
bun run migrate:local

# 5. Start local development (Vite + worker)
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
| `bun run format`         | Check formatting (Prettier)                       |
| `bun test`               | Run Vitest                                        |
| `bun run gen`            | Generate Drizzle artifacts + Wrangler types       |
| `bun run migrate:local`  | Apply local D1 migrations                         |
| `bun run migrate:remote` | Apply remote D1 migrations                        |
| `bun run create-admin`   | Create or update an admin user (see options)      |
| `bun run create-admin:local` | Create admin user against local D1            |
| `bun run create-admin:remote` | Create admin user against remote D1          |
| `bun run deploy:staging` | Migrate + build + deploy to Cloudflare (staging)  |
| `bun run deploy:prod`    | Migrate + build + deploy to Cloudflare (prod)     |
| `bun run preview`        | Build + run the worker locally with Wrangler      |

Example create-admin usage:

```bash
bun run create-admin --email you@domain.com --password "Secret123!" --local
bun run create-admin --email you@domain.com --password "Secret123!" --remote
```

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
- **Linting/Testing:** ESLint + Prettier + Vitest.

---

## 👤 Admin Bootstrap

Create your first admin user locally or against a remote D1 database:

```bash
bun run create-admin --email you@domain.com --password "Secret123!" --local
bun run create-admin --email you@domain.com --password "Secret123!" --remote
```

---

## 🚢 Deployment

> **⚠️ Configuration Required:**  
> Update `wrangler.jsonc` with your Cloudflare bindings (D1/KV/R2) before build or deploy.

> **Note:**  
> The app will not build or deploy until Cloudflare resources are configured.

### Environment Variables

Start with `.env.example` for local values and use `wrangler secret put` for production secrets.

Required values:
- `JWT_SECRET`
- `GOOGLE_MAPS_API_KEY` (if address autocomplete is used)

1. **Staging Deploy**
   ```bash
   bun run deploy:staging
   ```
2. **Production Deploy**
   ```bash
   bun run deploy:prod
   ```

---

## 🧪 Demo / Seed Data (for screenshots)

1. Create an admin user (`bun run create-admin --email ... --local`).
2. Log in and add a property.
3. Add rooms and a tenancy.
4. Generate invoices from the Invoices screen.
5. Use the Admin Tools page to void legacy overdue invoices if needed.

---

## 🔐 Auth & Access Notes

- Landlord/admin routes live under `/admin` and are role-guarded.
- Tenant experiences live under `/expense` and `/bill`.
- If you customize roles, update `ROLES_AVAILABLE` and `ROLES_INHERENT` accordingly.

---

## 🏷️ Release

Tag a release after merging to `main`:

```bash
git tag v1.0.0
git push origin v1.0.0
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
