import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  Bus,
  Ticket,
  IndianRupee,
  Network,
  Users,
  Plug,
  RefreshCw,
  XCircle,
  Activity,
  TrendingUp,
  MapPin,
  CircleDot,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api/client";
import { getSummary, SOURCE_COLORS, summaryKey } from "@/lib/api/reports";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — KenRoute" },
      {
        name: "description",
        content:
          "Travel operations & OTA management: bookings, revenue, OTA integrations and live operations.",
      },
    ],
  }),
  component: Dashboard,
});

// ponytail: redBus and AbhiBus are not connected yet, so these cards show what the
// database holds for them (nothing) and the sync buttons stay off until they are.
const otaIntegrations = [
  { name: "redBus", color: "#e63946" },
  { name: "AbhiBus", color: "#f4a261" },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const compact = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${Math.round(n)}`;

function Dashboard() {
  // The last 7 days, refreshed every minute so the page follows the counter.
  const { data, error } = useQuery({
    queryKey: summaryKey(),
    queryFn: () => getSummary(),
    refetchInterval: 60_000,
  });
  const n = (value: number | undefined) =>
    value === undefined ? "—" : value.toLocaleString("en-IN");
  const money = (value: number | undefined) => (value === undefined ? "—" : inr(value));

  const daily = (data?.daily ?? []).map((d) => ({
    d: format(parseISO(d.date), "dd MMM"),
    revenue: d.revenue,
    bookings: d.bookings,
  }));
  const sources = (data?.bySource ?? []).map((s) => ({
    ...s,
    color: SOURCE_COLORS[s.source] ?? "var(--muted-foreground)",
  }));
  const sourceOf = (name: string) => sources.find((s) => s.source === name);
  const topRoutes = (data?.byRoute ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Travel operations & OTA management overview"
        actions={
          <div className="text-sm font-medium px-4 py-2 rounded-lg border border-border bg-card">
            {format(new Date(), "MMM d, yyyy")}
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not load the dashboard: {errorMessage(error)}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Bookings Today"
          value={n(data?.today.bookings)}
          icon={Ticket}
          tone="info"
        />
        <StatCard
          label="Total Revenue Today"
          value={money(data?.today.revenue)}
          icon={IndianRupee}
          tone="brand"
        />
        <StatCard
          label="Passengers (Last 7 Days)"
          value={n(data?.totals.bookings)}
          icon={Users}
          tone="navy"
        />
        <StatCard
          label="Active Routes"
          value={n(data?.fleet.activeRoutes)}
          icon={Network}
          tone="warning"
        />
        <StatCard label="Active Buses" value={n(data?.fleet.activeBuses)} icon={Bus} tone="brand" />
      </div>

      {/* OTA Integration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {otaIntegrations.map((ota) => {
          const sold = sourceOf(ota.name);
          return (
            <div
              key={ota.name}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="size-11 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ background: ota.color }}
                  >
                    {ota.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-base">{ota.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Plug className="size-3" /> OTA Integration
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground border border-border px-2.5 py-1 text-xs font-semibold">
                  <XCircle className="size-3.5" /> Not connected
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="size-3" /> Last Sync
                  </div>
                  <div className="text-sm font-semibold mt-1">Never</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Bookings (7 Days)</div>
                  <div className="text-sm font-semibold mt-1">{n(sold?.bookings)}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="text-sm font-semibold mt-1">{money(sold?.revenue)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled
                  title={`Works once ${ota.name} is connected`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="size-3.5" />
                  Sync Inventory
                </button>
                <button
                  disabled
                  title={`Works once ${ota.name} is connected`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card text-foreground px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="size-3.5" />
                  Retry Failed
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Revenue Trend</h2>
              <p className="text-xs text-muted-foreground">Tickets sold, last 7 days</p>
            </div>
            <TrendingUp className="size-5 text-brand" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={compact}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [inr(v), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#gBrand)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Daily Booking Trend</h2>
              <p className="text-xs text-muted-foreground">Bookings per day, last 7 days</p>
            </div>
            <Activity className="size-5 text-chart-5" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="bookings"
                  name="Bookings"
                  fill="var(--chart-5)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Source analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SourceCard
          title="Booking Sources"
          subtitle={`${n(data?.totals.bookings)} bookings in the last 7 days`}
          data={sources.map((s) => ({ name: s.source, value: s.bookings, color: s.color }))}
          formatValue={(v) => v.toLocaleString("en-IN")}
          centerLabel="Bookings"
          centerValue={n(data?.totals.bookings)}
        />
        <SourceCard
          title="Revenue Sources"
          subtitle={`${money(data?.totals.revenue)} revenue in the last 7 days`}
          data={sources.map((s) => ({ name: s.source, value: s.revenue, color: s.color }))}
          formatValue={(v) => inr(v)}
          centerLabel="Revenue"
          centerValue={data ? compact(data.totals.revenue) : "—"}
        />
      </div>

      {/* Live ops + Activity + Top routes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Live Operations</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <CircleDot className="size-3 animate-pulse" /> Live
            </span>
          </div>
          <div className="space-y-3">
            <LiveStat
              label="Total Seats Available"
              value={n(data?.fleet.seatsAvailable)}
              tone="brand"
              icon={Ticket}
            />
            <LiveStat
              label="Seats Sold Today"
              value={n(data?.today.bookings)}
              tone="info"
              icon={Users}
            />
            <LiveStat
              label="Upcoming Trips Occupancy"
              value={data ? `${data.fleet.occupancyPct}%` : "—"}
              tone="warning"
              icon={Activity}
            />
            <LiveStat
              label="Buses On The Road"
              value={n(data?.fleet.activeTrips)}
              tone="navy"
              icon={Bus}
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Bookings</h2>
            <Link to="/bookings" className="text-xs font-medium text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-auto pr-1">
            {data?.recent.length === 0 && (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
            {data?.recent.map((b) => {
              const cancelled = b.status === "CANCELLED" || b.status === "REFUNDED";
              const color = cancelled
                ? "var(--danger)"
                : (SOURCE_COLORS[b.source] ?? "var(--brand)");
              return (
                <div
                  key={`${b.pnr}-${b.seat}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
                  >
                    <Ticket className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">
                      {cancelled ? "Cancelled: " : ""}
                      {b.passenger || "Passenger"} · {b.route} · Seat {b.seat}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{b.agent || b.source}</span>
                      <span>•</span>
                      <span>{inr(b.fare)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Performing Routes</h2>
            <Link to="/reports" className="text-xs font-medium text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {data && topRoutes.length === 0 && (
              <p className="text-sm text-muted-foreground">No tickets sold in the last 7 days.</p>
            )}
            {topRoutes.map((r) => (
              <div
                key={r.route}
                className="p-3 rounded-xl border border-border hover:border-brand/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="size-4 text-brand shrink-0" />
                    <span className="font-medium text-sm truncate">{r.route}</span>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5 shrink-0">
                    {r.occupancyPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{r.bookings.toLocaleString()} bookings</span>
                  <span className="font-semibold text-foreground">{inr(r.revenue)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand to-chart-5 rounded-full"
                    style={{ width: `${r.occupancyPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SourceCard({
  title,
  subtitle,
  data,
  formatValue,
  centerLabel,
  centerValue,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number; color: string }[];
  formatValue: (v: number) => string;
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((s, x) => s + x.value, 0);
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="h-56 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.map((e, i) => (
                  <Cell key={i} fill={e.color} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                formatter={(v: number) => formatValue(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {centerLabel}
            </div>
            <div className="text-xl font-bold">{centerValue}</div>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((s) => {
            const pct = total ? ((s.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={s.name} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="font-medium truncate">{s.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold">{formatValue(s.value)}</div>
                  <div className="text-[10px] text-muted-foreground">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LiveStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "brand" | "navy" | "warning" | "info";
  icon: typeof Bus;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand/10 text-brand",
    navy: "bg-navy/10 text-navy",
    warning: "bg-warning/15 text-warning",
    info: "bg-chart-5/15 text-chart-5",
  };
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("size-10 rounded-lg flex items-center justify-center", tones[tone])}>
          <Icon className="size-5" />
        </div>
        <div className="text-sm font-medium">{label}</div>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
