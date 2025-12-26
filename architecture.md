# System Architecture: Tenant System (Worker-based)

This project is a modern, full-stack application built using **Hono** on **Cloudflare Workers**. It follows a layered architecture with server-side rendering (SSR) via JSX and dynamic frontend interactivity powered by **HTMX**.

## 1. Core Technology Stack
- **Framework**: [Hono](https://hono.dev/) (Fast, lightweight web framework)
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite-based edge database)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **State/Cache**: [Cloudflare KV](https://developers.cloudflare.com/kv/) (used for auth challenges and session metadata)
- **Validation**: [Zod](https://zod.dev/) (schema-based validation for requests and data)
- **Frontend**: Hono JSX (SSR) + [HTMX](https://htmx.org/) (AJAX/dynamic updates) + [Tailwind CSS](https://tailwindcss.com/)

---

## 2. Directory Breakdown

### `worker/schema/` (Data Modeling)
Defines the database structure and validation rules using Drizzle and Zod.
- **`auth.schema.ts`**: Users, credentials (passkeys), auth logs, and verification codes.
- **`property.schema.ts`**: Property details (address, rent, specs).
- **`tenancy.schema.ts`**: Links users to properties, tracks lease status and dates.
- **`invoice.schema.ts` / `invoicePayment.schema.ts`**: Financial tracking and billing.
- **`roles.schema.ts`**: RBAC (Role-Based Access Control) definitions.

### `worker/services/` (Business Logic)
Encapsulates complex logic away from the routes.
- **`auth.service.ts`**: The "brain" of the auth system. Handles multi-method login (Password, PIN, TOTP, Passkey/WebAuthn), session validation, and registration logic.
- **`roles.service.ts`**: Manages permission checks and role assignments.
- **`tenancy.service.ts`**: Handles the lifecycle of a tenancy (move-in, move-out).
- **`access.service.ts`**: High-level authorization logic.

### `worker/middleware/` (Request Lifecycle)
Cross-cutting concerns applied to routes.
- **`db.middleware.ts`**: Injects the Drizzle DB instance into the context.
- **`auth.middleware.ts`**: Extracts the JWT from cookies and initializes the `Auth` service.
- **`guard.middleware.ts`**: Provides `requireRole` and `requirePermission` helpers for route protection.
- **`renderer.middleware.tsx`**: Sets up the global JSX renderer, wrapping responses in the standard `Layout`.
- **`config.middleware.ts`**: Loads environment-specific configurations.

### `worker/routes/` (Routing)
Categorized into functional domains:
- **`web/`**: Server-side rendered pages for the public/main web interface.
- **`admin/`**: Management routes for properties, tenants, and invoices (protected by RBAC).
- **`api/`**: JSON endpoints for programmatic access and frontend-specific calls.

### `worker/views/` (UI Components)
- **`Layout.tsx`**: The master template (HTML head, Navbar, Footer).
- **`pages/`**: Full-page components (Login, Register, Profile, Join).
- **`components/`**: Reusable UI atoms (Icons, Navbars).
- **Domain-specific views**: `properties/`, `tenants/`, `invoices/` containing specialized components for those entities.

---

## 3. Key Workflows

### Authentication Flow
1. **Login**: User provides credentials (Password/PIN/Passkey).
2. **Service**: `AuthService` validates against D1.
3. **Session**: A JWT `auth_token` is signed and set as an `httpOnly` cookie.
4. **Validation**: Every subsequent request is intercepted by `auth.middleware.ts`, which validates the JWT and hydrates `c.var.auth` with user details.

### SSR & HTMX Interaction
- **Initial Load**: Hono renders a full JSX page via `globalRenderer`.
- **Dynamic Updates**: Actions (like changing a selected property in `app.tsx`) return partial HTML or trigger `HX-Refresh` headers, allowing HTMX to update the page without a full browser reload.

### Multi-Tenant Property Management
- Users (Landlords/Admins) can manage multiple properties.
- **`selected_property_id`**: Stored in a cookie to maintain context across different views (Invoices, Tenants, etc.).

---

## 4. Entry Points
- **`worker/index.ts`**: The main entry point for the Cloudflare Worker. Sets up global logging, CORS, and mounts the primary middleware stack.
- **`worker/app.tsx`**: The main application router where all sub-routes (`/admin`, `/api`, `/web`) are combined and the base path logic is defined.

## 5. Security Model
- **RBAC**: Roles (Admin, Landlord, Tenant) and fine-grained permissions (e.g., `properties.delete`).
- **Stateless Auth**: JWT-based sessions stored in secure cookies.
- **Input Validation**: Strict Zod schemas for every form submission and API request.
- **Data Isolation**: Database queries are scoped by `landlordId` or `userId` retrieved from the verified session.