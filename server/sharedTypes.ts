import { insertExpenseSchema } from "./db/schema/expense";
import { insertUserSchema } from "./db/schema/user";
import { insertSessionSchema } from "./db/schema/session";
import { insertBillSchema } from "./db/schema/bill";
import { insertPropertySchema } from "./db/schema/property";

import { z } from "zod";

export const createBillSchema = insertBillSchema.omit({
  createdAt: true,
  id: true,
});

export const createExpenseSchema = insertExpenseSchema.omit({
  userId: true,
  createdAt: true,
  id: true,
});
export const createUserSchema = insertUserSchema
  .omit({
    id: true,
    emailVerified: true,
    phone: true,
  })
  .merge(
    z.object({
      address: z.string().optional(),
    })
  );
export const authUserSchema = insertUserSchema.omit({
  id: true,
  password: true,
  emailVerified: true,
  phone: true,
});
export const createSessionSchema = insertSessionSchema.omit({
  id: true,
});
export const createPropertySchema = insertPropertySchema.omit({
  id: true,
  landlordId: true,
});

export type CreateBill = z.infer<typeof createExpenseSchema>;
export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type CreateProperty = z.infer<typeof createPropertySchema>;
