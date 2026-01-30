# Repository Guidelines

## Project Structure & Module Organization
- `worker/` is the main app: Hono routes, SSR JSX views, HTMX fragments, middleware, services, and schema live here.
  - `worker/routes/` (feature-grouped routes), `worker/views/` (pages/components), `worker/components/` (shared UI), `worker/services/` (business logic), `worker/schema/` (Drizzle + Zod).
- `drizzle/` holds migrations and SQL assets for Cloudflare D1.
- `public/` contains static assets served by the worker.
- Root configs: `wrangler.jsonc`, `drizzle.config.ts`, `vite.config.ts`, `tsconfig.json`.

## Build, Test, and Development Commands
- `bun dev`: local dev via Vite + worker integration.
- `bun run build`: build client + server bundles.
- `bun run typecheck`: run TypeScript project checks.
- `bun run lint`: ESLint across the repo.
- `bun test`: Vitest (no test files are currently tracked).
- `bun run gen`: generate Drizzle artifacts + Wrangler types.
- `bun run migrate:local`: apply D1 migrations locally.
- `bun run preview`: build + run the worker locally with Wrangler.

## Coding Style & Naming Conventions
- TypeScript only; follow existing 2-space indentation, double quotes, and semicolons.
- Use feature-based folders under `worker/routes/` and keep JSX fragments small.
- Prefer server-rendered HTMX fragments; reach for Web Components only when client state is unavoidable.

## Testing Guidelines
- Vitest is configured via `bun test`. Add new tests as `*.test.ts` or `*.spec.ts` near the feature code under `worker/`.
- Target critical workflows (auth, tenancy, invoicing) and include HTMX fragment coverage where possible.

## Commit & Pull Request Guidelines
- Git history is mixed (sentence-case messages like “Adds …” and conventional entries like `chore(worker): …`). Prefer Conventional Commits, as described in `CONTRIBUTING.md`.
- Keep PRs focused, describe the change, and note any schema/migration updates.
- If UI changes are user-visible, include before/after screenshots or short clips.

## Configuration & Security
- Copy `.dev.vars.example` to `.dev.vars` and `.dev.vars.staging` for local env.
- Create `wrangler.jsonc` from the example and set Cloudflare D1/KV/R2 bindings before build or deploy.
- Report security issues via `SECURITY.md` and avoid public disclosures.

## Runtime & Architecture Notes
- Runtime is Cloudflare Workers; SSR is handled via Hono JSX with HTMX for interactivity.
- Drizzle + Zod define database and validation contracts in `worker/schema/`.
