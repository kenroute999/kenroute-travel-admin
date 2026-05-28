import { createFileRoute } from "@tanstack/react-router";
import {
  Bus,
  Ticket,
  IndianRupee,
  Network,
  PieChart as PieIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — KenRoute" },
      { name: "description", content: "Overview of travel operations: buses, bookings, revenue and routes." },
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

const bookingData = [
  { name: "Confirmed", value: 8245, color: "var(--brand)" },
  { name: "Cancelled", value: 2145, color: "var(--danger)" },
  { name: "Pending", value: 2068, color: "var(--warning)" },
];

const topRoutes = [
  { name: "Hyderabad → Bangalore", count: 1245, pct: 100 },
  { name: "Hyderabad → Vijayawada", count: 987, pct: 79 },
  { name: "Bangalore → Chennai", count: 876, pct: 70 },
  { name: "Hyderabad → Chennai", count: 765, pct: 61 },
  { name: "Visakhapatnam → Hyderabad", count: 654, pct: 53 },
];

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your travel operations"
        actions={
          <div className="text-sm font-medium px-4 py-2 rounded-lg border border-border bg-card">
            May 20, 2025
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Buses" value="156" delta="12 this month" icon={Bus} tone="brand" />
        <StatCard label="Today's Bookings" value="1,248" delta="18% vs yesterday" icon={Ticket} tone="info" />
        <StatCard label="Total Revenue" value="₹12,45,680" delta="22% vs yesterday" icon={IndianRupee} tone="brand" />
        <StatCard label="Active Routes" value="85" delta="5 this month" icon={Network} tone="navy" />
        <StatCard label="Occupancy" value="78%" delta="8% vs yesterday" icon={PieIcon} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Revenue Overview</h2>
            <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background">
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>
          <div className="h-72">
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
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} fill="url(#gBrand)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Booking Analytics</h2>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bookingData} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={2}>
                  {bookingData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xs text-muted-foreground">Total Bookings</div>
              <div className="text-2xl font-bold">12,458</div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {bookingData.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: b.color }} />
                  <span className="font-medium">{b.name}</span>
                </div>
                <span className="text-muted-foreground">{b.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Routes by Bookings</h2>
            <button className="text-xs font-medium text-brand hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {topRoutes.map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
