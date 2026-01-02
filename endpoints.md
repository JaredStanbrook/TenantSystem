[3 tools called]

# Development Guide: Routes, HTMX, and Service Layer

This document details the patterns and practices used for developing endpoints in the Tenant System. It covers the separation of concerns between routes, services, and the use of HTMX for dynamic web interfaces.

---

## 1. Routing Architecture

Routes are divided into three primary categories in `worker/routes/`:

| Directory | Purpose | Response Type |
| :--- | :--- | :--- |
| `web/` | Public-facing pages (Home, Login, Register). | Full HTML or HTMX Fragments |
| `admin/` | Protected management routes (Properties, Tenants, Invoices). | Full HTML or HTMX Fragments |
| `api/` | JSON endpoints for programmatic access and complex client-side logic. | JSON |

### Hono Implementation
Every route file exports a `new Hono<AppEnv>()` instance, ensuring type safety for environment variables, database connections, and auth context.

```tsx
export const propertyRoute = new Hono<AppEnv>();
```

---

## 2. HTMX-First Development (`htmx-helpers.ts`)

The system is optimized for **HTMX**, which allows server-rendered HTML to feel as fast as a Single Page Application (SPA).

### The `htmxResponse` Helper
Instead of manually checking headers, we use `htmxResponse` to return either a full page (with layout) or just a fragment (for partial DOM updates).

```tsx
// worker/routes/admin/property.tsx
return htmxResponse(c, "My Properties", PropertyTable({ properties }));
```

### Advanced HTMX Interactions
- **Toasts**: `htmxToast(c, message, { type: "success" })` triggers a client-side event that the `<app-toaster>` component listens for.
- **Client-Side Redirects**: `htmxRedirect(c, "/login")` tells HTMX to change the browser location entirely.
- **History Management**: `htmxPushUrl(c, "/admin/properties")` updates the browser URL bar during an AJAX swap.
- **OOB (Out-of-Band) Swaps**: Sometimes we need to update a component elsewhere on the page (like a property selector in the navbar) while updating the main content. We use `hx-swap-oob="outerHTML"` for this.

---

## 3. The Service Layer Pattern

To keep routes clean and maintainable, complex business logic is delegated to classes in `worker/services/`.

### Example: `AuthService`
The route handles the HTTP request, validates the input, and then calls the service to perform the action.

```tsx
// worker/routes/api/auth.ts
.post("/login", zValidator("json", loginUserSchema), async (c) => {
  const { auth } = c.var; // Auth service instance
  const body = c.req.valid("json");
  
  // Route delegates logic to Service
  const result = await auth.loginWithPassword(body.email, body.password);
  
  // Route handles the HTTP response/session
  await auth.createSession(result.user);
  return c.json(result.user);
})
```

**Benefits of Services:**
- **Reusability**: `Auth.register()` can be called from an API route or a Web form.
- **Testability**: Services can be unit-tested without mocking the entire Hono request lifecycle.
- **Clarity**: Routes focus on "What is the request/response?", Services focus on "What is the business rule?".

---

## 4. Input Validation with Zod

We use `@hono/zod-validator` to ensure all incoming data (JSON or Form) adheres to our schemas.

```tsx
propertyRoute.post(
  "/",
  zValidator("form", formPropertySchema, async (result, c) => {
    if (!result.success) {
      // Logic for handling validation errors specifically for HTMX
      // Usually involves re-rendering the form with error messages
    }
  }),
  async (c) => {
    // Logic for valid data
  }
);
```

---

## 5. Development Workflow for a New Feature

1.  **Define Schema**: Create a new file in `worker/schema/` (e.g., `maintenance.schema.ts`).
2.  **Create Service**: If there's complex logic, add a class in `worker/services/`.
3.  **Build Views**: Create the necessary JSX components in `worker/views/`.
4.  **Register Route**:
    -   Create `worker/routes/admin/maintenance.tsx`.
    -   Mount the route in `worker/app.tsx`.
5.  **Wire HTMX**: Add `hx-post`, `hx-target`, and `hx-swap` to your views to trigger the new routes.

---

### Summary Table
| Feature | Tool / Method |
| :--- | :--- |
| **Validation** | Zod + `zValidator` |
| **Persistence** | Drizzle ORM + Cloudflare D1 |
| **Auth** | `AuthService` + `authMiddleware` |
| **Page Updates** | HTMX AJAX Swaps |
| **Notifications** | `htmxToast` (Triggered Events) |
| **Redirection** | `htmxRedirect` or `c.redirect` |

This architecture ensures the application remains **lean on the client** and **robust on the server**.