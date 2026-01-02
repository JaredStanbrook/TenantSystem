import { insertExpenseSchema } from "../old/db/schema/expense";
import { insertUserSchema } from "../old/db/schema/user";
import { insertSessionSchema } from "../old/db/schema/session";
import { insertBillSchema } from "../old/db/schema/bill";
import { insertPropertySchema } from "../old/db/schema/property";

import { z } from "zod/v4";
import { insertUserPropertySchema } from "../old/db/schema/userProperty";
import { insertWaitlistSchema } from "../old/db/schema/waitlist";

export const createBillSchema = insertBillSchema
  .omit({
    createdAt: true,
    id: true,
  })
  .extend({
    tenantIds: z.array(z.string()).min(1),
  });

export const createExpenseSchema = insertExpenseSchema.omit({
  userId: true,
  createdAt: true,
  id: true,
  propertyId: true,
});
export const createUserSchema = insertUserSchema
  .omit({
    id: true,
    emailVerified: true,
    phone: true,
  })
  .extend({
    address: z.string().optional(),
  });
export const updateTenantInfoSchema = insertUserPropertySchema.omit({
  userId: true,
  propertyId: true,
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
export const createPropertySchema = insertPropertySchema.omit({
  id: true,
  landlordId: true,
});
export const submitWaitlistEntrySchema = insertWaitlistSchema.omit({
  id: true,
  propertyId: true,
  status: true,
  source: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateBill = z.infer<typeof createBillSchema>;
export type Bill = z.infer<typeof insertBillSchema>;
export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type CreateProperty = z.infer<typeof createPropertySchema>;
export type submitWaitlistEntry = z.infer<typeof submitWaitlistEntrySchema>;
