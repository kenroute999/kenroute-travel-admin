import { createFileRoute } from "@tanstack/react-router";
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
  Legend,
} from "recharts";
import { IndianRupee, Ticket, XCircle, Percent } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — KenRoute" },
      { name: "description", content: "Revenue trends, bookings, cancellations and occupancy analytics." },
    ],
  }),
  component: ReportsPage,
});

const trend = [
  { d: "1 May", v: 320000 },
  { d: "6 May", v: 410000 },
  { d: "11 May", v: 470000 },
  { d: "16 May", v: 560000 },
  { d: "20 May", v: 645000 },
];

const byRoute = [
  { name: "Hyderabad → Bangalore", value: 345680, color: "var(--brand)" },
  { name: "Hyderabad → Vijayawada", value: 245270, color: "var(--chart-5)" },
  { name: "Bangalore → Chennai", value: 210430, color: "var(--warning)" },
  { name: "Hyderabad → Chennai", value: 185300, color: "var(--danger)" },
  { name: "Others", value: 259000, color: "var(--navy)" },
];

function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        breadcrumb="Reports"
        actions={
          <div className="text-sm font-medium px-4 py-2 rounded-lg border border-border bg-card">
            May 1, 2025 — May 20, 2025
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value="₹12,45,680" delta="22%" icon={IndianRupee} tone="brand" />
        <StatCard label="Total Bookings" value="12,458" delta="18%" icon={Ticket} tone="info" />
        <StatCard label="Cancelled Bookings" value="2,145" delta="5%" icon={XCircle} tone="danger" />
        <StatCard label="Average Occupancy" value="78%" delta="6%" icon={Percent} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Revenue Trend</h2>
            <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background">
              <option>This Month</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Revenue by Route</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byRoute} dataKey="value" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {byRoute.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
