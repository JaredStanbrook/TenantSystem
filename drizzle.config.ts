import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: [
    "./server/db/schema/expenses.ts",
    "./server/db/schema/sessions.ts",
    "./server/db/schema/bills.ts",
    "./server/db/schema/users.ts",
    "./server/db/schema/properties.ts",
    "./server/db/schema/tenantProperty.ts",
  ],
  dialect: "sqlite",
});
