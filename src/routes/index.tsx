import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bus,
  Ticket,
  IndianRupee,
  Network,
  Users,
  Plug,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Activity,
  TrendingUp,
  MapPin,
  Globe,
  UserCog,
  Building2,
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
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — KenRoute" },
      { name: "description", content: "Travel operations & OTA management: bookings, revenue, OTA integrations and live operations." },
    ],
  }),
  component: Dashboard,
});

const revenueData = [
  { d: "1 May", v: 420000 },
  { d: "6 May", v: 510000 },
  { d: "11 May", v: 480000 },
  { d: "16 May", v: 590000 },
  { d: "20 May", v: 645680 },
  { d: "25 May", v: 700000 },
  { d: "31 May", v: 780000 },
];

const bookingTrend = [
  { d: "Mon", v: 980 },
  { d: "Tue", v: 1120 },
  { d: "Wed", v: 1045 },
  { d: "Thu", v: 1180 },
  { d: "Fri", v: 1350 },
  { d: "Sat", v: 1480 },
  { d: "Sun", v: 1248 },
];

const bookingSources = [
  { name: "redBus", value: 4250, color: "#e63946", icon: Globe },
  { name: "AbhiBus", value: 3120, color: "#f4a261", icon: Globe },
  { name: "Website", value: 2480, color: "var(--brand)", icon: Globe },
  { name: "Agent", value: 1680, color: "var(--chart-5)", icon: UserCog },
  { name: "Counter", value: 928, color: "var(--navy)", icon: Building2 },
];

const revenueSources = [
  { name: "redBus", value: 485000, color: "#e63946" },
  { name: "AbhiBus", value: 362000, color: "#f4a261" },
  { name: "Website", value: 298000, color: "var(--brand)" },
  { name: "Agent", value: 195000, color: "var(--chart-5)" },
  { name: "Counter", value: 105680, color: "var(--navy)" },
];

const otaIntegrations = [
  {
    name: "redBus",
    color: "#e63946",
    connected: true,
    lastSync: "2 min ago",
    bookings: 482,
    revenue: "₹4,85,000",
  },
  {
    name: "AbhiBus",
    color: "#f4a261",
    connected: true,
    lastSync: "5 min ago",
    bookings: 356,
    revenue: "₹3,62,000",
  },
];

const activityFeed = [
  { t: "Just now", text: "New booking received from redBus", source: "redBus", color: "#e63946", icon: Ticket },
  { t: "2 min ago", text: "Inventory synced successfully with redBus", source: "System", color: "var(--brand)", icon: RefreshCw },
  { t: "4 min ago", text: "New booking received from AbhiBus", source: "AbhiBus", color: "#f4a261", icon: Ticket },
  { t: "8 min ago", text: "Route HYD → BLR updated successfully", source: "Ops", color: "var(--navy)", icon: MapPin },
  { t: "12 min ago", text: "New booking received from Website", source: "Website", color: "var(--chart-5)", icon: Ticket },
  { t: "18 min ago", text: "Inventory synced successfully with AbhiBus", source: "System", color: "var(--brand)", icon: RefreshCw },
];

const topRoutes = [
  { name: "Hyderabad → Bangalore", bookings: 1245, revenue: "₹3,45,680", occupancy: 92 },
  { name: "Hyderabad → Vijayawada", bookings: 987, revenue: "₹2,45,270", occupancy: 86 },
  { name: "Bangalore → Chennai", bookings: 876, revenue: "₹2,10,430", occupancy: 81 },
  { name: "Hyderabad → Chennai", bookings: 765, revenue: "₹1,85,300", occupancy: 74 },
  { name: "Visakhapatnam → Hyderabad", bookings: 654, revenue: "₹1,52,400", occupancy: 68 },
];

const totalBookings = bookingSources.reduce((s, x) => s + x.value, 0);
const totalRev = revenueSources.reduce((s, x) => s + x.value, 0);
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Dashboard() {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [confirmAction, setConfirmAction] = useState<{ ota: string; action: "sync" | "retry" } | null>(null);

  const confirmAndRun = () => {
    if (!confirmAction) return;
    const { ota } = confirmAction;
    setConfirmAction(null);
    setSyncing((prev) => ({ ...prev, [ota]: true }));
    setTimeout(() => {
      setSyncing((prev) => ({ ...prev, [ota]: false }));
    }, 2000);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Travel operations & OTA management overview"
        actions={
          <div className="text-sm font-medium px-4 py-2 rounded-lg border border-border bg-card">
            May 20, 2025
          </div>
        }
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Bookings Today" value="1,248" delta="18% vs yesterday" icon={Ticket} tone="info" />
        <StatCard label="Total Revenue Today" value="₹12,45,680" delta="22% vs yesterday" icon={IndianRupee} tone="brand" />
        <StatCard label="Total Passengers" value="3,486" delta="14% vs yesterday" icon={Users} tone="navy" />
        <StatCard label="Active Routes" value="85" delta="5 this month" icon={Network} tone="warning" />
        <StatCard label="Active Buses" value="156" delta="12 this month" icon={Bus} tone="brand" />
      </div>

      {/* OTA Integration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {otaIntegrations.map((ota) => {
          const isSyncing = syncing[ota.name];
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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success border border-success/20 px-2.5 py-1 text-xs font-semibold">
                  <CheckCircle2 className="size-3.5" /> Connected
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} /> Last Sync
                  </div>
                  <div className="text-sm font-semibold mt-1">{ota.lastSync}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Today's Bookings</div>
                  <div className="text-sm font-semibold mt-1">{ota.bookings}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="text-sm font-semibold mt-1">{ota.revenue}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={isSyncing}
                  onClick={() => setConfirmAction({ ota: ota.name, action: "sync" })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white px-3 py-2 text-xs font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Sync Inventory
                </button>
                <button
                  disabled={isSyncing}
                  onClick={() => setConfirmAction({ ota: ota.name, action: "retry" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card text-foreground px-3 py-2 text-xs font-semibold hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
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
              <p className="text-xs text-muted-foreground">Last 7 reporting points</p>
            </div>
            <TrendingUp className="size-5 text-brand" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                  formatter={(v: number) => [inr(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} fill="url(#gBrand)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Daily Booking Trend</h2>
              <p className="text-xs text-muted-foreground">Bookings per day this week</p>
            </div>
            <Activity className="size-5 text-chart-5" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="v" fill="var(--chart-5)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Source analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SourceCard
          title="Booking Sources"
          subtitle={`${totalBookings.toLocaleString()} total bookings`}
          data={bookingSources.map((s) => ({ name: s.name, value: s.value, color: s.color }))}
          formatValue={(v) => v.toLocaleString("en-IN")}
          centerLabel="Bookings"
          centerValue={totalBookings.toLocaleString()}
        />
        <SourceCard
          title="Revenue Sources"
          subtitle={`${inr(totalRev)} total revenue`}
          data={revenueSources}
          formatValue={(v) => inr(v)}
          centerLabel="Revenue"
          centerValue={`₹${(totalRev / 100000).toFixed(1)}L`}
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
            <LiveStat label="Total Seats Available" value="4,820" tone="brand" icon={Ticket} />
            <LiveStat label="Seats Sold Today" value="3,486" tone="info" icon={Users} />
            <LiveStat label="Occupancy Rate" value="78%" tone="warning" icon={Activity} />
            <LiveStat label="Active Trips" value="64" tone="navy" icon={Bus} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent OTA Activity</h2>
            <button className="text-xs font-medium text-brand hover:underline">View All</button>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-auto pr-1">
            {activityFeed.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${a.color} 15%, transparent)`, color: a.color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{a.text}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{a.source}</span>
                      <span>•</span>
                      <span>{a.t}</span>
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
            <button className="text-xs font-medium text-brand hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {topRoutes.map((r) => (
              <div key={r.name} className="p-3 rounded-xl border border-border hover:border-brand/40 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="size-4 text-brand shrink-0" />
                    <span className="font-medium text-sm truncate">{r.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5 shrink-0">
                    {r.occupancy}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{r.bookings.toLocaleString()} bookings</span>
                  <span className="font-semibold text-foreground">{r.revenue}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand to-chart-5 rounded-full" style={{ width: `${r.occupancy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sync/Retry Confirmation */}
      <AlertDialog open={!!confirmAction}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "sync" ? "Sync Inventory" : "Retry Failed Bookings"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.action === "sync" ? "sync inventory" : "retry failed bookings"} for {confirmAction?.ota}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndRun} className="bg-brand hover:bg-brand/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{centerLabel}</div>
            <div className="text-xl font-bold">{centerValue}</div>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((s) => {
            const pct = total ? ((s.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={s.name} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: s.color }} />
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
