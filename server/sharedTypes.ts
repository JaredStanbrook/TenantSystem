import { insertExpenseSchema } from "./db/schema/expenses";
import { insertUserSchema } from "./db/schema/users";
import { insertSessionSchema } from "./db/schema/sessions";
import { insertBillSchema } from "./db/schema/bills";

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
export const createUserSchema = insertUserSchema.omit({
  id: true,
  emailVerified: true,
  phone: true,
});
export const authUserSchema = insertUserSchema.omit({
  id: true,
  password: true,
  emailVerified: true,
  phone: true,
});
export const createSessionSchema = insertSessionSchema.omit({
  id: true,
});

export type CreateBill = z.infer<typeof createExpenseSchema>;
export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
