# Release Notes – v1.0.0

**Release date:** 2026-02-01

## Highlights
- Complete landlord/admin workflows with SSR + HTMX for fast, reliable UI.
- Soft-delete property lifecycle with audit-friendly history views.
- Invoice and expense experiences tuned for clarity and bulk operations.
- Admin tools for system initialization and cleanup.

## What’s included
- Property, tenancy, invoice, and expense management.
- Role-based access control with admin-only tooling.
- Cloudflare Workers + D1 deployment pipeline.
- Updated docs, CI, and release automation.

## Upgrade notes
- Configure environment variables in `.env.example` and `wrangler.jsonc` before deploy.
- Use the `create-admin` script to bootstrap the first admin user.

