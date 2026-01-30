import { invoice } from "../../worker/schema/invoice.schema";
import { invoicePayment } from "../../worker/schema/invoicePayment.schema";
import { property } from "../../worker/schema/property.schema";
import { room } from "../../worker/schema/room.schema";
import { tenancy } from "../../worker/schema/tenancy.schema";
import { users } from "../../worker/schema/auth.schema";

type QueryState = {
  fields?: Record<string, any> | undefined;
  fromTable?: unknown;
};

type MockData = {
  properties: any[];
  rooms: any[];
  tenancies: any[];
  invoices: any[];
  payments: any[];
  users: any[];
};

const resolveSelect = (data: MockData, state: QueryState) => {
  const fields = state.fields || {};

  if ("count" in fields) {
    return [{ count: data.invoices.length }];
  }

  if ("total" in fields && "occupied" in fields) {
    const occupied = data.rooms.filter((r) => r.status === "occupied").length;
    return [{ total: data.rooms.length, occupied }];
  }

  if ("r" in fields && "p" in fields) {
    return data.rooms[0] && data.properties[0] ? [{ r: data.rooms[0], p: data.properties[0] }] : [];
  }

  if ("invoice" in fields && "property" in fields) {
    return data.invoices[0] && data.properties[0]
      ? [{ invoice: data.invoices[0], property: data.properties[0] }]
      : [];
  }

  if ("invoice" in fields && "propertyName" in fields) {
    const dueDate = data.invoices[0]?.dueDate ?? new Date();
    return data.invoices[0]
      ? [
          {
            invoice: data.invoices[0],
            propertyName: data.properties[0]?.nickname ?? null,
            amountPaid: 0,
            effectiveDueDate: Math.floor(dueDate.getTime() / 1000),
          },
        ]
      : [];
  }

  if ("overdue" in fields && "pending" in fields && "dueNext" in fields) {
    return [{ overdue: 0, pending: 0, dueNext: 0 }];
  }

  if ("tenancy" in fields && "user" in fields && "property" in fields) {
    return data.tenancies[0] && data.users[0] && data.properties[0]
      ? [{ tenancy: data.tenancies[0], user: data.users[0], property: data.properties[0], room: data.rooms[0] }]
      : [];
  }

  if ("t" in fields && "u" in fields && "p" in fields) {
    return data.tenancies[0] && data.users[0] && data.properties[0]
      ? [{ t: data.tenancies[0], u: data.users[0], p: data.properties[0] }]
      : [];
  }

  if ("tenancy" in fields && "room" in fields && "user" in fields) {
    return data.tenancies[0] && data.users[0] && data.rooms[0]
      ? [{ tenancy: data.tenancies[0], room: data.rooms[0], user: data.users[0] }]
      : [];
  }

  if ("payment" in fields && "invoice" in fields) {
    return data.payments[0] && data.invoices[0]
      ? [{ payment: data.payments[0], invoice: data.invoices[0] }]
      : [];
  }

  if ("userDisplayName" in fields && "userEmail" in fields) {
    return data.payments.map((p) => ({
      ...p,
      userDisplayName: data.users[0]?.displayName ?? null,
      userEmail: data.users[0]?.email ?? null,
    }));
  }

  if ("propertyId" in fields) {
    return [{ propertyId: data.rooms[0]?.propertyId ?? data.properties[0]?.id ?? 1 }];
  }

  if ("idempotencyKey" in fields) {
    return data.invoices.map((inv) => ({ idempotencyKey: inv.idempotencyKey }));
  }

  switch (state.fromTable) {
    case property:
      return data.properties;
    case room:
      return data.rooms;
    case tenancy:
      return data.tenancies;
    case invoice:
      return data.invoices;
    case invoicePayment:
      return data.payments;
    case users:
      return data.users;
    default:
      return [];
  }
};

const createQuery = (data: MockData, fields?: Record<string, any>) => {
  const state: QueryState = { fields };
  const query: any = {
    from(table: unknown) {
      state.fromTable = table;
      return query;
    },
    where() {
      return query;
    },
    innerJoin() {
      return query;
    },
    leftJoin() {
      return query;
    },
    groupBy() {
      return query;
    },
    orderBy() {
      return query;
    },
    limit() {
      return query;
    },
    offset() {
      return query;
    },
    get() {
      const result = resolveSelect(data, state);
      return Promise.resolve(result[0]);
    },
    returning() {
      return Promise.resolve(resolveSelect(data, state));
    },
    then(resolve: any, reject: any) {
      return Promise.resolve(resolveSelect(data, state)).then(resolve, reject);
    },
  };
  return query;
};

export const createFakeDb = (data: MockData) => ({
  select(fields?: Record<string, any>) {
    return createQuery(data, fields);
  },
  insert() {
    return {
      values() {
        return {
          returning() {
            return Promise.resolve([]);
          },
        };
      },
    };
  },
  update() {
    return {
      set() {
        return {
          where() {
            return Promise.resolve([]);
          },
        };
      },
    };
  },
  delete() {
    return {
      where() {
        return Promise.resolve([]);
      },
    };
  },
  batch() {
    return Promise.resolve([]);
  },
});

export const createMockData = () => {
  const now = new Date();
  const userId = "user-1";
  return {
    users: [
      {
        id: userId,
        email: "admin@example.com",
        displayName: "Admin User",
        roles: ["admin"],
        permissions: [],
      },
    ],
    properties: [
      {
        id: 1,
        landlordId: userId,
        nickname: "Demo Property",
        addressLine1: "1 Main St",
        addressLine2: null,
        city: "Townsville",
        state: "TS",
        postcode: "1234",
        country: "Australia",
        propertyType: "house",
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 1,
        rentAmount: 10000,
        rentFrequency: "weekly",
        status: "occupied",
        createdAt: now,
        updatedAt: now,
        nextBillingDate: now,
      },
    ],
    rooms: [
      {
        id: 1,
        propertyId: 1,
        name: "Room 1",
        description: null,
        status: "vacant_ready",
        baseRentAmount: 10000,
      },
    ],
    tenancies: [
      {
        id: 1,
        userId,
        propertyId: 1,
        roomId: 1,
        status: "active",
        startDate: now,
        endDate: null,
        bondAmount: 10000,
        createdAt: now,
        updatedAt: now,
        billedThroughDate: now,
      },
    ],
    invoices: [
      {
        id: 1,
        propertyId: 1,
        type: "rent",
        description: "Rent",
        totalAmount: 10000,
        status: "open",
        dueDate: now,
        issuedDate: now,
        createdAt: now,
        idempotencyKey: "rent-property-1-2025-01-01",
      },
    ],
    payments: [
      {
        id: 1,
        invoiceId: 1,
        userId,
        amountOwed: 10000,
        amountPaid: 0,
        status: "pending",
        paidAt: null,
        tenantMarkedPaidAt: null,
        paymentReference: null,
        extensionStatus: "none",
        extensionRequestedDate: null,
        extensionReason: null,
        dueDateExtensionDays: 0,
        adminNote: null,
        updatedAt: now,
      },
    ],
  };
};
