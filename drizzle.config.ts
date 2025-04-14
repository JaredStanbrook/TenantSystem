import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: [
    "./server/db/schema/bill.ts",
    "./server/db/schema/expense.ts",
    "./server/db/schema/property.ts",
    "./server/db/schema/session.ts",
    "./server/db/schema/userBill.ts",
    "./server/db/schema/user.ts",
    "./server/db/schema/userProperty.ts",
  ],
  dialect: "sqlite",
});
