import { z } from "zod";

export const BILLING_STATUS_VALUES = ["draft", "open", "partial", "paid", "overdue", "void"] as const;
export const EXTENSION_STATUS_VALUES = ["none", "pending", "approved", "rejected"] as const;
export const BILL_RECORD_TYPES = ["rent", "bond", "bill"] as const;
export const BILL_TYPE_VALUES = [
  "water",
  "electricity",
  "gas",
  "internet",
  "maintenance",
  "other",
] as const;

export type BillingStatus = (typeof BILLING_STATUS_VALUES)[number];
export type ExtensionStatus = (typeof EXTENSION_STATUS_VALUES)[number];
export type BillingRecordType = (typeof BILL_RECORD_TYPES)[number];
export type BillType = (typeof BILL_TYPE_VALUES)[number];

export const billingFormShape = {
  recordType: z.enum(BILL_RECORD_TYPES),
  propertyId: z.coerce.number(),
  userId: z.string().min(1, "Tenant is required"),
  roomId: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  description: z.string().optional(),
  amountDollars: z.coerce.number().min(0.01, "Amount must be positive"),
  dueDate: z.coerce.date(),
  billType: z.preprocess((val) => (val === "" ? undefined : val), z.enum(BILL_TYPE_VALUES).optional()),
  startDate: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  endDate: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  page: z.string().optional().default("1"),
};
