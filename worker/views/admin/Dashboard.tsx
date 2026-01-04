import { html } from "hono/html";
import { Property } from "../../schema/property.schema";
import { Invoice } from "../../schema/invoice.schema";
import { capitalize } from "../lib/utils";

// Define the shape of data passed from the backend
export interface DashboardMetrics {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  activeTenants: number;
  occupancyRate: number;
  invoiceDistribution: { type: string; amount: number }[];
  recentInvoices: Invoice[];
  financials: {
    overdueAmount: number;
    pendingAmount: number;
  };
}

// --- Helper Functions ---

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
};

const formatDate = (date: Date | string | number) => {
  return new Date(date).toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "overdue":
      return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    case "void":
      return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"; // open/draft
  }
};

// --- Components ---

const StatCard = ({
  title,
  value,
  subtext,
  icon,
  accentColor,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  accentColor?: string;
}) => html`
  <div
    class="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between h-full">
    <div>
      <div class="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 class="tracking-tight text-sm font-medium text-muted-foreground">${title}</h3>
        <div class="h-4 w-4 text-muted-foreground ${accentColor || ""}">
          <i data-lucide="${icon}"></i>
        </div>
      </div>
      <div class="text-2xl font-bold">${value}</div>
    </div>
    ${subtext && html`<p class="text-xs text-muted-foreground mt-2">${subtext}</p>`}
  </div>
`;

// Responsive Invoice List Item
const RecentInvoiceItem = (invoice: Invoice) => html`
  <div
    class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b last:border-0 hover:bg-muted/40 transition-colors gap-2">
    <div class="flex items-center gap-3">
      <div
        class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <i data-lucide="file-text" class="h-4 w-4"></i>
      </div>
      <div>
        <div class="font-medium text-sm text-foreground capitalize">${invoice.type} Invoice</div>
        <div class="text-xs text-muted-foreground">${formatDate(invoice.createdAt)}</div>
      </div>
    </div>

    <div class="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
      <span
        class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 ${getStatusColor(
          invoice.status
        )}">
        ${capitalize(invoice.status)}
      </span>
      <span class="font-semibold text-sm w-20 text-right"
        >${formatCurrency(invoice.totalAmount)}</span
      >
    </div>
  </div>
`;

// --- Main View ---

export const Dashboard = ({
  property,
  metrics,
}: {
  property: Property | null;
  metrics: DashboardMetrics | null;
}) => {
  // 1. Empty State
  if (!property || !metrics) {
    return html`
      <div class="container max-w-7xl mx-auto px-4 py-8 pt-20">
        <div
          class="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-xl bg-muted/10">
          <div class="p-4 bg-muted rounded-full mb-4">
            <i data-lucide="building-2" class="w-8 h-8 text-muted-foreground"></i>
          </div>
          <h2 class="text-2xl font-bold tracking-tight">No Property Selected</h2>
          <p class="text-muted-foreground mt-2 max-w-md">
            Select a property to view its dashboard.
          </p>
        </div>
      </div>
    `;
  }

  // 2. Dashboard Content
  return html`
    <div
      class="container max-w-7xl mx-auto px-4 py-8 pt-20 animate-in fade-in duration-500 space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p class="text-muted-foreground mt-1">
            Overview for
            <span class="font-medium text-foreground"
              >${property.nickname || property.addressLine1}</span
            >
          </p>
        </div>
        <button
          hx-get="/admin"
          hx-target="#main-content"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 shadow transition-colors w-full md:w-auto">
          <i data-lucide="refresh-cw" class="mr-2 w-4 h-4"></i> Refresh Data
        </button>
      </div>

      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        ${StatCard({
          title: "Overdue",
          value: formatCurrency(metrics.financials.overdueAmount),
          icon: "alert-circle",
          accentColor: "text-red-500",
          subtext: "Requires immediate attention",
        })}
        ${StatCard({
          title: "Pending Revenue",
          value: formatCurrency(metrics.financials.pendingAmount),
          icon: "clock",
          accentColor: "text-blue-500",
          subtext: "Invoices due soon",
        })}
        ${StatCard({
          title: "Occupancy Rate",
          value: `${metrics.occupancyRate.toFixed(0)}%`,
          icon: "pie-chart",
          subtext: `${metrics.occupiedRooms}/${metrics.totalRooms} rooms occupied`,
        })}
        ${StatCard({
          title: "Active Tenants",
          value: metrics.activeTenants,
          icon: "users",
          subtext: "Current lease agreements",
        })}
      </div>

      <div class="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div
          class="lg:col-span-2 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col">
          <div class="flex flex-row items-center justify-between p-6 pb-2">
            <h3 class="font-semibold leading-none tracking-tight flex items-center gap-2">
              <i data-lucide="activity" class="w-4 h-4 text-muted-foreground"></i> Recent Activity
            </h3>
            <a href="/admin/invoices" class="text-xs text-primary hover:underline">View All</a>
          </div>
          <div class="p-2">
            ${metrics.recentInvoices.length > 0
              ? html`<div class="flex flex-col">
                  ${metrics.recentInvoices.map(RecentInvoiceItem)}
                </div>`
              : html`<div class="p-8 text-center text-muted-foreground text-sm">
                  No recent invoices found.
                </div>`}
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 class="font-semibold mb-4">Room Status</h3>
            <div class="space-y-4">
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-emerald-600 font-medium">Occupied</span>
                  <span>${metrics.occupiedRooms}</span>
                </div>
                <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-emerald-500"
                    style="width: ${(metrics.occupiedRooms / metrics.totalRooms) * 100}%"></div>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-blue-600 font-medium">Vacant</span>
                  <span>${metrics.vacantRooms}</span>
                </div>
                <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500"
                    style="width: ${(metrics.vacantRooms / metrics.totalRooms) * 100}%"></div>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-red-600 font-medium">Maintenance</span>
                  <span>${metrics.maintenanceRooms}</span>
                </div>
                <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-red-500"
                    style="width: ${(metrics.maintenanceRooms / metrics.totalRooms) * 100}%"></div>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t">
              <button
                hx-get="/admin/properties/${property.id}/rooms"
                hx-target="#main-content"
                class="w-full inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Manage Rooms
              </button>
            </div>
          </div>

          <div class="rounded-xl border bg-muted/30 p-4">
            <h4 class="text-xs font-semibold uppercase text-muted-foreground mb-3">
              Quick Actions
            </h4>
            <div class="space-y-2">
              <button
                hx-get="/admin/invoices/create"
                hx-target="#main-content"
                hx-push-url="true"
                class="w-full flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm font-medium text-left">
                <div
                  class="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <i data-lucide="plus"></i>
                </div>
                Create New Invoice
              </button>
              <button
                hx-get="/admin/tenancies/create"
                hx-target="#main-content"
                hx-push-url="true"
                class="w-full flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors text-sm font-medium text-left">
                <div
                  class="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <i data-lucide="user-plus"></i>
                </div>
                Onboard Tenant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};
