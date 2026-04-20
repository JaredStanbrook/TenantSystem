import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { BILL_RECORD_TYPES, type BillingRecordType, billingFormShape } from "@server/schema/billing.shared";
import { property } from "@server/schema/property.schema";
import { BillingService } from "@server/services/billing.service";
import { tenancy } from "@server/schema/tenancy.schema";
import { room } from "@server/schema/room.schema";
import type { AppEnv } from "@server/types";
import { InvoiceForm, InvoiceTable, BillingContextFields, BillingTypeFields } from "@views/invoices/InvoiceComponents";
import { htmxRedirect, htmxResponse, htmxToast, flashToast, htmxPushUrl } from "@server/lib/htmx-helpers";
import { buildInvoicePdf } from "@server/lib/pdf/invoice";

export const invoiceRoute = new Hono<AppEnv>();

const formSchema = z.object(billingFormShape).superRefine((data, ctx) => {
  if (data.recordType === "rent") {
    if (!data.startDate) {
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Rent start date is required." });
    }
    if (!data.endDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Rent end date is required." });
    }
  }

  if (data.recordType === "bill" && !data.billType) {
    ctx.addIssue({ code: "custom", path: ["billType"], message: "Bill type is required." });
  }

  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date." });
  }
});

const recordTypeParamSchema = z.object({
  recordType: z.enum(BILL_RECORD_TYPES),
  id: z.coerce.number(),
});

const isAdminUser = (roles: string[]) => roles.includes("admin");

async function propertyScope(c: any, propertyId: number) {
  const user = c.var.auth.user!;
  const [prop] = await c.var.db
    .select()
    .from(property)
    .where(
      and(
        eq(property.id, propertyId),
        isAdminUser(user.roles) ? undefined : eq(property.landlordId, user.id),
        isNull(property.deletedAt),
      ),
    );
  return prop;
}

async function renderForm(
  c: any,
  params: {
    title: string;
    action: string;
    invoice?: any;
    propertyId?: number;
    page?: string;
    errors?: Record<string, string[]>;
  },
) {
  const user = c.var.auth.user!;
  const properties = await c.var.db
    .select()
    .from(property)
    .where(and(isAdminUser(user.roles) ? undefined : eq(property.landlordId, user.id), isNull(property.deletedAt)));
  const propertyTenants = params.propertyId
    ? await BillingService.getActiveTenantsForProperty(c.var.db, params.propertyId)
    : [];

  return htmxResponse(
    c,
    params.title,
    InvoiceForm({
      invoice: params.invoice,
      properties,
      propertyTenants,
      action: params.action,
      page: params.page || "1",
      errors: params.errors,
    }),
  );
}

function draftInvoiceFromBody(body: Record<string, unknown>, forcedRecordType?: BillingRecordType) {
  const recordType = (forcedRecordType ||
    (body.recordType === "rent" || body.recordType === "bond" || body.recordType === "bill"
      ? body.recordType
      : "bill")) as BillingRecordType;

  const toDate = (value: unknown) => {
    if (typeof value !== "string" || !value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  return {
    recordType,
    propertyId:
      typeof body.propertyId === "string" && body.propertyId
        ? Number(body.propertyId)
        : undefined,
    userId: typeof body.userId === "string" ? body.userId : undefined,
    roomId:
      typeof body.roomId === "string" && body.roomId
        ? Number(body.roomId)
        : undefined,
    totalAmount:
      typeof body.amountDollars === "string" && body.amountDollars
        ? Math.round(Number(body.amountDollars) * 100)
        : undefined,
    dueDate: toDate(body.dueDate),
    startDate: toDate(body.startDate),
    endDate: toDate(body.endDate),
    category: typeof body.billType === "string" ? body.billType : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
  };
}

invoiceRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = 20;
  htmxPushUrl(c, c.req.url);

  const records = await BillingService.listForAdmin(db, user);
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const pageItems = records.slice((page - 1) * pageSize, page * pageSize);

  const properties = await db
    .select()
    .from(property)
    .where(and(isAdminUser(user.roles) ? undefined : eq(property.landlordId, user.id), isNull(property.deletedAt)));

  return htmxResponse(
    c,
    "Billing",
    InvoiceTable({
      invoices: pageItems,
      properties,
      pagination: { page, totalPages },
      showAll: false,
    }),
  );
});

invoiceRoute.get("/create", async (c) => {
  return renderForm(c, {
    title: "Create Billing Record",
    action: "/admin/invoices",
    propertyId: Number(c.req.query("propertyId")) || undefined,
    page: c.req.query("page") || "1",
  });
});

invoiceRoute.get("/fragments/property-context", async (c) => {
  const propertyId = Number(c.req.query("propertyId"));
  const userId = c.req.query("userId") || undefined;
  const roomId = Number(c.req.query("roomId") || "");

  if (!propertyId) return c.html(BillingContextFields({}));
  const tenants = await BillingService.getActiveTenantsForProperty(c.var.db, propertyId);
  return c.html(
    BillingContextFields({
      tenants,
      selectedUserId: userId,
      selectedRoomId: Number.isNaN(roomId) ? undefined : roomId,
    }),
  );
});

invoiceRoute.get("/fragments/type-fields", async (c) => {
  const recordType = c.req.query("recordType");
  const resolvedType: BillingRecordType =
    recordType === "rent" || recordType === "bond" || recordType === "bill"
      ? recordType
      : "bill";

  return c.html(
    BillingTypeFields({
      recordType: resolvedType,
      invoice: draftInvoiceFromBody(c.req.query() as Record<string, unknown>, resolvedType),
    }),
  );
});

invoiceRoute.post(
  "/",
  zValidator("form", formSchema, async (result, c) => {
    if (!result.success) {
      htmxToast(c, "Validation Failed", { description: "Please check the form for errors.", type: "error" });
      const body = await c.req.parseBody();
      return renderForm(c, {
        title: "Create Billing Record",
        action: "/admin/invoices",
        propertyId: Number(body.propertyId) || undefined,
        invoice: draftInvoiceFromBody(body as Record<string, unknown>),
        errors: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const db = c.var.db;
    const data = c.req.valid("form");
    const prop = await propertyScope(c, data.propertyId);
    if (!prop) return c.text("Unauthorized", 403);

    const id = await BillingService.createManualRecord(db, {
      recordType: data.recordType,
      propertyId: data.propertyId,
      userId: data.userId,
      roomId: data.roomId,
      description: data.description,
      amountCents: Math.round(data.amountDollars * 100),
      dueDate: data.dueDate,
      billType: data.billType,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    flashToast(c, `${data.recordType} created`, { type: "success" });
    return htmxRedirect(c, `/admin/invoices/${data.recordType}/${id}/edit?page=${data.page || "1"}`);
  },
);

invoiceRoute.get("/:recordType/:id/pdf", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  const record = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
  if (!record) return c.text("Unauthorized", 403);

  const pdfBytes = await buildInvoicePdf({
    invoiceLabel: record.displayNumber,
    propertyLabel: record.propertyLabel,
    propertyAddress: record.propertyLabel,
    invoiceStatus: record.status,
    invoiceType: record.recordType === "bill" ? record.category : record.recordType,
    totalAmount: record.totalAmount,
    dueDate: record.dueDate,
    issuedDate: record.issuedDate,
    createdAt: record.createdAt,
    description: record.description || "-",
    tenantName: record.tenantName,
    tenantEmail: record.tenantEmail,
    startDate: record.startDate || null,
    endDate: record.endDate || null,
  });

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${record.displayNumber}.pdf"`,
    },
  });
});

invoiceRoute.get("/:id/edit", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) {
    return renderForm(c, {
      title: "Create Billing Record",
      action: "/admin/invoices",
      page: c.req.query("page") || "1",
    });
  }

  for (const recordType of BILL_RECORD_TYPES) {
    const record = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
    if (record) {
      return renderForm(c, {
        title: "Manage Billing Record",
        action: `/admin/invoices/${recordType}/${id}/update`,
        invoice: record,
        propertyId: record.propertyId,
        page: c.req.query("page") || "1",
      });
    }
  }

  return renderForm(c, {
    title: "Create Billing Record",
    action: "/admin/invoices",
    page: c.req.query("page") || "1",
  });
});

invoiceRoute.get("/:recordType/:id/edit", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  const record = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
  if (!record) return c.text("Unauthorized", 403);

  return renderForm(c, {
    title: "Manage Billing Record",
    action: `/admin/invoices/${recordType}/${id}/update`,
    invoice: record,
    propertyId: record.propertyId,
    page: c.req.query("page") || "1",
  });
});

invoiceRoute.post(
  "/:recordType/:id/update",
  zValidator("param", recordTypeParamSchema),
  zValidator("form", formSchema, async (result, c: any) => {
    if (!result.success) {
      const recordType = c.req.param("recordType") as BillingRecordType;
      const id = Number(c.req.param("id"));
      const existing = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
      if (!existing) return c.text("Unauthorized", 403);
      const body = await c.req.parseBody();
      htmxToast(c, "Validation Failed", { description: "Please check the form for errors.", type: "error" });
      return renderForm(c, {
        title: "Manage Billing Record",
        action: `/admin/invoices/${recordType}/${id}/update`,
        invoice: { ...existing, ...draftInvoiceFromBody(body as Record<string, unknown>, recordType) },
        propertyId:
          typeof body.propertyId === "string" && body.propertyId
            ? Number(body.propertyId)
            : existing.propertyId,
        page:
          typeof body.page === "string" && body.page ? body.page : "1",
        errors: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { recordType, id } = c.req.valid("param");
    const data = c.req.valid("form");
    const existing = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
    if (!existing) return c.text("Unauthorized", 403);

    await BillingService.updateManualRecord(c.var.db, recordType, id, {
      propertyId: data.propertyId,
      userId: data.userId,
      roomId: data.roomId,
      description: data.description,
      amountCents: Math.round(data.amountDollars * 100),
      dueDate: data.dueDate,
      billType: data.billType,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    flashToast(c, "Billing record updated", { type: "success" });
    return htmxRedirect(c, "/admin/invoices");
  },
);

invoiceRoute.delete("/:recordType/:id", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  const existing = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
  if (!existing) return c.text("Unauthorized", 403);
  try {
    await BillingService.deleteRecord(c.var.db, recordType, id);
  } catch (error: any) {
    htmxToast(c, error.message, { type: "error" });
    return c.text(error.message, 400);
  }
  flashToast(c, "Billing record deleted", { type: "success" });
  return htmxRedirect(c, "/admin/invoices");
});

invoiceRoute.post("/:recordType/:id/payment/approve", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  const existing = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
  if (!existing) return c.text("Unauthorized", 403);
  await BillingService.approvePayment(c.var.db, recordType, id);
  flashToast(c, "Payment approved", { type: "success" });
  return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
});

invoiceRoute.post("/:recordType/:id/payment/reject", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  const existing = await BillingService.getForAdmin(c.var.db, c.var.auth.user!, recordType, id);
  if (!existing) return c.text("Unauthorized", 403);
  await BillingService.rejectPayment(c.var.db, recordType, id, c.req.header("HX-Prompt"));
  flashToast(c, "Payment rejected", { type: "info" });
  return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
});

invoiceRoute.post("/:recordType/:id/approve-extension", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  await BillingService.approveExtension(c.var.db, recordType, id);
  flashToast(c, "Extension approved", { type: "success" });
  return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
});

invoiceRoute.post("/:recordType/:id/reject-extension", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  await BillingService.rejectExtension(c.var.db, recordType, id, c.req.header("HX-Prompt"));
  flashToast(c, "Extension rejected", { type: "info" });
  return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
});

invoiceRoute.post("/:recordType/:id/grant-extension", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  const extensionDays = parseInt(c.req.header("HX-Prompt") || "0");
  if (!extensionDays || extensionDays < 1) {
    flashToast(c, "Please enter a valid number of days", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
  }
  await BillingService.grantExtension(c.var.db, recordType, id, extensionDays);
  flashToast(c, `Extension of ${extensionDays} days granted`, { type: "success" });
  return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
});

invoiceRoute.post("/:recordType/:id/revoke-extension", zValidator("param", recordTypeParamSchema), async (c) => {
  const { recordType, id } = c.req.valid("param");
  await BillingService.revokeExtension(c.var.db, recordType, id);
  flashToast(c, "Extension revoked", { type: "info" });
  return htmxRedirect(c, `/admin/invoices/${recordType}/${id}/edit`);
});

invoiceRoute.post("/tenancy/:id/generate", async (c) => {
  const tenancyId = Number(c.req.param("id"));
  const formData = await c.req.parseBody();
  const strategy = formData["strategy"] as string;
  if (strategy === "skip") return htmxRedirect(c, "/admin/tenancies");

  const [record] = await c.var.db
    .select({ tenancy, property, room })
    .from(tenancy)
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .leftJoin(room, eq(tenancy.roomId, room.id))
    .where(eq(tenancy.id, tenancyId));

  if (!record || !record.property.nextBillingDate) {
    flashToast(c, "Tenancy not found", { type: "error" });
    return htmxRedirect(c, "/admin/tenancies");
  }

  const messages: string[] = [];
  if ((strategy === "all" || strategy === "bond_only") && record.tenancy.bondAmount) {
    await BillingService.createBondRecord(c.var.db, {
      propertyId: record.tenancy.propertyId,
      userId: record.tenancy.userId,
      roomId: record.tenancy.roomId,
      amountCents: record.tenancy.bondAmount,
      dueDate: record.tenancy.startDate,
      idempotencyKey: `bond-${record.tenancy.id}`,
    });
    messages.push("Bond");
  }

  if (strategy === "all" || strategy === "rent_only") {
    const rentResults = await BillingService.generateRentRecordsForTenancy(c.var.db, tenancyId);
    if (rentResults.generated > 0) messages.push(`Rent x${rentResults.generated}`);
    if (rentResults.errors.length > 0) {
      flashToast(c, rentResults.errors.join(" "), { type: "warning" });
      return htmxRedirect(c, "/admin/tenancies");
    }
  }

  if (messages.length > 0) flashToast(c, `Generated: ${messages.join(", ")}`, { type: "success" });
  else flashToast(c, "No records generated", { type: "info" });

  return htmxRedirect(c, "/admin/tenancies");
});

invoiceRoute.post("/tenancy/:id/generate-rent", async (c) => {
  const tenancyId = Number(c.req.param("id"));
  if (!Number.isFinite(tenancyId)) return c.text("Invalid tenancy", 400);

  const [record] = await c.var.db
    .select({
      tenancyId: tenancy.id,
      propertyId: property.id,
      landlordId: property.landlordId,
    })
    .from(tenancy)
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .where(eq(tenancy.id, tenancyId));

  if (!record) return c.text("Tenancy not found", 404);

  const user = c.var.auth.user!;
  if (!isAdminUser(user.roles) && record.landlordId !== user.id) {
    return c.text("Unauthorized", 403);
  }

  const results = await BillingService.generateRentRecordsForTenancy(c.var.db, tenancyId);
  const message =
    results.errors.length > 0
      ? results.errors.join(" ")
      : results.generated > 0
        ? `${results.generated} rent record(s) generated`
        : "No missing rent records found";

  htmxToast(c, message, {
    type: results.errors.length > 0 ? "warning" : "success",
  });
  return c.text("OK", 200);
});
