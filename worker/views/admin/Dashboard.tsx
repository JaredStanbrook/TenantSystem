import { html } from "hono/html";
import { Property } from "../../schema/property.schema";
import { capitalize } from "../lib/utils";

interface DashboardMetrics {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  activeTenants: number;
  occupancyRate: number;
  invoiceDistribution: { type: string; amount: number }[];
}

// --- Components ---

const StatCard = ({
  title,
  value,
  subtext,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
}) => html`
  <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
    <div class="flex flex-row items-center justify-between space-y-0 pb-2">
      <h3 class="tracking-tight text-sm font-medium text-muted-foreground">${title}</h3>
      <div class="h-4 w-4 text-muted-foreground">
        <i data-lucide="${icon}"></i>
      </div>
    </div>
    <div class="content">
      <div class="text-2xl font-bold">${value}</div>
      ${subtext && html`<p class="text-xs text-muted-foreground mt-1">${subtext}</p>`}
    </div>
  </div>
`;

// Lightweight SVG Donut Chart
const DonutChart = ({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  let cumulativeAngle = 0;

  if (total === 0) {
    return html`
      <div class="flex h-[${size}px] items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    `;
  }

  const paths = data.map((slice) => {
    const angle = (slice.value / total) * 360;
    const x1 = 50 + 40 * Math.cos((Math.PI * cumulativeAngle) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * cumulativeAngle) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * (cumulativeAngle + angle)) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * (cumulativeAngle + angle)) / 180);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData =
      total === slice.value
        ? "M 50 10 a 40 40 0 0 1 0 80 a 40 40 0 0 1 0 -80" // Full circle
        : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    cumulativeAngle += angle;
    return html`<path d="${pathData}" fill="${slice.color}" stroke="white" stroke-width="2" />`;
  });

  return html`
    <div class="flex items-center gap-8">
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 100 100"
        class="transform -rotate-90 transition-all">
        ${paths}
        <circle cx="50" cy="50" r="25" fill="white" class="dark:fill-card" />
      </svg>
      <div class="space-y-2">
        ${data.map(
          (d) => html`
            <div class="flex items-center gap-2 text-sm">
              <span class="block w-3 h-3 rounded-full" style="background-color: ${d.color}"></span>
              <span class="font-medium text-foreground">${d.label}</span>
              <span class="text-muted-foreground">(${d.value})</span>
            </div>
          `
        )}
      </div>
    </div>
  `;
};

// Lightweight SVG Bar Chart
const BarChart = ({
  data,
  height = 150,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) => {
  const max = Math.max(...data.map((d) => d.value), 100);

  return html`
    <div class="w-full flex items-end gap-4 h-[${height}px] pt-8 pb-2">
      ${data.map((d) => {
        const barHeight = Math.max((d.value / max) * 100, 4);
        const formattedValue = new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(d.value / 100);

        return html`
          <div class="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
            <div
              class="absolute -top-5 text-[10px] font-bold text-muted-foreground z-10 whitespace-nowrap">
              ${formattedValue}
            </div>

            <div class="relative w-full bg-muted/30 rounded-t-sm h-full flex items-end">
              <div
                class="w-full bg-primary/80 group-hover:bg-primary transition-all rounded-t-sm"
                style="height: ${barHeight}%"></div>
            </div>
            <span class="text-xs text-muted-foreground truncate w-full text-center capitalize"
              >${d.label}</span
            >
          </div>
        `;
      })}
    </div>
  `;
};

// --- Main View ---

export const Dashboard = ({
  property,
  metrics,
}: {
  property: Property | null;
  metrics: DashboardMetrics | null;
}) => {
  // 1. Empty State (No Property Selected)
  if (!property || !metrics) {
    return html`
      <div class="max-w-7xl pb-4 mx-auto pt-18">
        <div
          class="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-xl bg-muted/10">
          <div class="p-4 bg-muted rounded-full mb-4">
            <i data-lucide="building-2" class="w-8 h-8 text-muted-foreground"></i>
          </div>
          <h2 class="text-2xl font-bold tracking-tight">No Property Selected</h2>
          <p class="text-muted-foreground mt-2 max-w-md">
            Please select a property from the navigation bar above to view its dashboard, metrics,
            and tenancy details.
          </p>
          <div class="mt-6">
            <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Tip: Use the building icon in the top right
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Dashboard Content
  return html`
    <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p class="text-muted-foreground mt-1">
            Overview for
            <span class="font-medium text-foreground"
              >${property.nickname || property.addressLine1}</span
            >
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <button
            hx-get="/admin"
            hx-target="#main-content"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 shadow transition-colors">
            <i data-lucide="refresh-cw" class="mr-2 w-4 h-4"></i> Refresh
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        ${StatCard({
          title: "Total Tenants",
          value: metrics.activeTenants,
          icon: "users",
          subtext: "Active lease agreements",
        })}
        ${StatCard({
          title: "Occupancy Rate",
          value: `${metrics.occupancyRate.toFixed(0)}%`,
          icon: "pie-chart",
          subtext: `${metrics.occupiedRooms} / ${metrics.totalRooms} rooms occupied`,
        })}
        ${StatCard({
          title: "Maintenance Issues",
          value: metrics.maintenanceRooms,
          icon: "hammer",
          subtext: "Rooms requiring attention",
        })}
        ${StatCard({
          title: "Property Type",
          value: capitalize(property.propertyType),
          icon: "home",
          subtext: `${property.bedrooms} Bed, ${property.bathrooms} Bath`,
        })}
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div class="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div class="flex flex-col space-y-1.5 p-6">
            <h3 class="font-semibold leading-none tracking-tight">Room Status</h3>
            <p class="text-sm text-muted-foreground">Current distribution of room availability</p>
          </div>
          <div class="p-6 pt-0 pl-10">
            ${DonutChart({
              data: [
                { label: "Occupied", value: metrics.occupiedRooms, color: "#10b981" }, // Emerald 500
                { label: "Vacant", value: metrics.vacantRooms, color: "#3b82f6" }, // Blue 500
                { label: "Maintenance", value: metrics.maintenanceRooms, color: "#ef4444" }, // Red 500
              ],
            })}
          </div>
        </div>

        <div class="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div class="flex flex-col space-y-1.5 p-6">
            <h3 class="font-semibold leading-none tracking-tight">Financial Breakdown</h3>
            <p class="text-sm text-muted-foreground">Total invoiced amounts by category</p>
          </div>
          <div class="p-6 pt-0">
            ${metrics.invoiceDistribution.length > 0
              ? BarChart({
                  data: metrics.invoiceDistribution.map((m) => ({
                    label: m.type,
                    value: m.amount,
                  })),
                })
              : html`<div
                  class="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                  No invoices found
                </div>`}
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div
          class="rounded-xl border bg-muted/40 p-6 flex items-center justify-between hover:bg-muted/60 transition-colors cursor-pointer"
          hx-get="/admin/tenancies"
          hx-target="#main-content"
          hx-push-url="true">
          <div>
            <div class="font-semibold">Manage Tenancies</div>
            <div class="text-sm text-muted-foreground">View lease details and tenant info</div>
          </div>
          <i data-lucide="chevron-right" class="text-muted-foreground"></i>
        </div>
        <div
          class="rounded-xl border bg-muted/40 p-6 flex items-center justify-between hover:bg-muted/60 transition-colors cursor-pointer"
          hx-get="/admin/properties/${property.id}/rooms"
          hx-target="#main-content"
          hx-push-url="true">
          <div>
            <div class="font-semibold">Manage Rooms</div>
            <div class="text-sm text-muted-foreground">Update room details and pricing</div>
          </div>
          <i data-lucide="chevron-right" class="text-muted-foreground"></i>
        </div>
      </div>
    </div>
  `;
};
