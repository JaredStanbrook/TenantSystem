# Professional Portfolio

[![CI Pipeline](https://github.com/JaredStanbrook/ProfessionalPortfolio/actions/workflows/ci-pipeline.yml/badge.svg)](https://github.com/JaredStanbrook/ProfessionalPortfolio/actions/workflows/ci-pipeline.yml)

A modern, full-stack portfolio template built with [Hono](https://hono.dev/), [React](https://react.dev/), [Drizzle ORM](https://orm.drizzle.team/), and [Bun](https://bun.sh/).  
Easily deployable to Cloudflare Workers, with a focus on developer experience, scalability, and performance.

---

## 🚀 Features

- **Full-stack:** Hono API routes, React frontend, Drizzle ORM, SQLite (D1)
- **Modern Tooling:** Bun, Vite, TypeScript, Tailwind CSS, Radix UI, Zod 4 validation
- **Authentication:** Lucia Auth
- **Production Ready:** Cloudflare Workers, Wrangler, CI/CD scripts
- **Developer Experience:** Fast local dev, hot reload, unified config, type safety
- **Automated Quality:** Husky for automatic linting of commit messages, code, and running tests on commit/push

---

## 📦 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [Node.js](https://nodejs.org/) (for some tooling)
- Cloudflare account (for deployment)

### Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Generate Drizzle tables & Wrangler types
bun run gen

# 3. Seed local database
bun run migrate:local

# 4. Start local development (client + worker)
bun dev
```

---

## 🛠️ Scripts

| Script                   | Description                                 |
| ------------------------ | ------------------------------------------- |
| `bun dev`                | Start frontend and worker in parallel       |
| `bun run dev:frontend`   | Start Vite dev server                       |
| `bun run dev:worker`     | Start Cloudflare Worker locally             |
| `bun run gen`            | Generate Drizzle ORM types & Wrangler types |
| `bun run migrate:local`  | Apply local DB migrations                   |
| `bun run migrate:remote` | Apply remote DB migrations                  |
| `bun run build:prod`     | Build for production                        |
| `bun run build:staging`  | Build for staging                           |
| `bun run lint`           | Run ESLint                                  |
| `bun run preview`        | Preview production build                    |

---

## 🗂️ Project Structure

```
/
├── src/           # Frontend (React, routes, components)
├── worker/        # API routes, backend logic (Hono)
├── drizzle/       # DB migrations & schema
├── public/        # Static assets
├── package.json   # Unified scripts & dependencies
├── tsconfig.*.json# Unified TypeScript configs
└── wrangler.toml  # Cloudflare Worker config
```

---

## 🧑‍💻 Development Workflow

- **Unified Dev:** Run `bun dev` to start both frontend and worker with hot reload.
- **Database:** Use Drizzle ORM for schema and migrations. Seed with SQL files in `drizzle/`.
- **Type Safety:** All configs and code are TypeScript-first.
- **Linting:** ESLint with recommended configs for JS/TS/React.

---

## 🚢 Deployment

> **⚠️ Configuration Required:**  
> Before running or deploying this project, you must create your own `wrangler.jsonc` file at the project root.
>
> - Use the provided [`wrangler.jsonc.example`](./wrangler.jsonc.example) as a template.
> - Replace placeholder values with your own Cloudflare resources:
>   - **D1 Database:** Set your own `database_name`, `database_id`, and `migrations_dir`.
>   - **KV Namespaces:** Add your KV namespace `binding` and `id`.
>   - **R2 Buckets:** Add your R2 `binding` and `bucket_name`.
>   - **Routes:** Update `pattern` and `custom_domain` for your deployment domains.
> - For more details, see the [Cloudflare Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/configuration/).

**Example:**

```bash
cp wrangler.jsonc.example wrangler.jsonc
# Edit wrangler.jsonc with your Cloudflare D1, KV, and R2 details
```

> **Note:**  
> Your project will not build or deploy until you have configured these Cloudflare resources in `wrangler.jsonc`.

1. **Create Remote Migrations & Build for production & Deploy to Cloudflare**
   ```bash
   bun run build:prod
   ```

---

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests.  
Follow the [Conventional Commits](https://www.conventionalcommits.org/) style for commit messages.

---

## 📄 License

[MIT](./LICENSE)

---

## 🙏 Acknowledgements

- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Bun](https://bun.sh/)
