import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  IndianRupee,
  Ticket,
  CalendarDays,
  Percent,
  TrendingUp,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  PiggyBank,
  CalendarIcon,
  AlertCircle,
  Check,
} from "lucide-react";
import { format, differenceInCalendarDays, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import { type DateRange } from "react-day-picker";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — KenRoute" },
      {
        name: "description",
        content:
          "Executive analytics: revenue, occupancy, profitability and channel performance for bus operations.",
      },
    ],
  }),
  component: ReportsPage,
});

/* ---------------- Mock base data (per ~30-day month) ---------------- */

const dailyTrendBase = [
  185000, 162000, 224000, 198000, 268000, 241000, 312000, 205000, 228000, 256000,
  198000, 274000, 232000, 289000, 247000, 268000, 215000, 296000, 251000, 304000,
  232000, 278000, 245000, 267000, 289000, 312000, 254000, 276000, 298000, 321000,
];

const monthlyTrend = [
  { m: "Jan", v: 820000 },
  { m: "Feb", v: 910000 },
  { m: "Mar", v: 1180000 },
  { m: "Apr", v: 1040000 },
  { m: "May", v: 1250000 },
  { m: "Jun", v: 1320000 },
  { m: "Jul", v: 1410000 },
  { m: "Aug", v: 1505000 },
  { m: "Sep", v: 1280000 },
  { m: "Oct", v: 1390000 },
  { m: "Nov", v: 1455000 },
  { m: "Dec", v: 1620000 },
];

const yearlyTrend = [
  { y: "2021", v: 6200000 },
  { y: "2022", v: 8100000 },
  { y: "2023", v: 10500000 },
  { y: "2024", v: 13200000 },
  { y: "2025", v: 17400000 },
];

const sourceBase = [
  { name: "redBus", bookings: 1025, revenue: 545000, color: "var(--brand)" },
  { name: "AbhiBus", bookings: 568, revenue: 285000, color: "var(--chart-5)" },
  { name: "Agent Bookings", bookings: 312, revenue: 165000, color: "var(--warning)" },
  { name: "Counter Bookings", bookings: 152, revenue: 75000, color: "var(--danger)" },
  { name: "Website Bookings", bookings: 88, revenue: 40000, color: "var(--navy)" },
];

const routeBase = [
  { route: "HYD → BLR", bookings: 512, revenue: 325000, occ: 82, growth: 15.2 },
  { route: "HYD → VJA", bookings: 398, revenue: 245000, occ: 76, growth: 11.3 },
  { route: "BLR → CHN", bookings: 287, revenue: 185000, occ: 71, growth: 8.6 },
  { route: "HYD → PUNE", bookings: 215, revenue: 135000, occ: 68, growth: 6.1 },
  { route: "VJA → BLR", bookings: 168, revenue: 95000, occ: 65, growth: -2.3 },
];

const busBase = [
  { bus: "TS09Z 1234", trips: 45, revenue: 245000, occ: 84 },
  { bus: "TS09Z 5678", trips: 42, revenue: 215000, occ: 81 },
  { bus: "TS09Z 9012", trips: 40, revenue: 195000, occ: 78 },
  { bus: "TS09Z 3456", trips: 38, revenue: 175000, occ: 75 },
  { bus: "TS09Z 7890", trips: 35, revenue: 155000, occ: 72 },
];

const agentBase = [
  { name: "Ramesh Travels", bookings: 156, revenue: 95000, commission: 9500 },
  { name: "Sharma Tours", bookings: 128, revenue: 78000, commission: 7800 },
  { name: "Balaji Travels", bookings: 98, revenue: 62000, commission: 6200 },
  { name: "Sree Sai Travels", bookings: 86, revenue: 54000, commission: 5400 },
  { name: "VK Tours & Travels", bookings: 72, revenue: 45000, commission: 4500 },
];

const occupancyBase = [72, 76, 71, 79, 74, 81, 77, 83, 78, 75, 80, 76, 82, 79, 77, 81, 74, 78, 80, 83, 79, 75, 77, 81, 84, 78, 80, 82, 79, 76];

/* ---------------- Helpers ---------------- */

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtCompact = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
};
const fmtN = (n: number) => Math.round(n).toLocaleString("en-IN");

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  fontSize: 12,
  background: "var(--background)",
};

const MAX_RANGE_DAYS = 366;

type Preset = "Today" | "This Week" | "This Month" | "This Year" | "Custom";

function presetRange(p: Exclude<Preset, "Custom">): DateRange {
  const today = startOfDay(new Date());
  switch (p) {
    case "Today":
      return { from: today, to: today };
    case "This Week":
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: today };
    case "This Month":
      return { from: startOfMonth(today), to: today };
    case "This Year":
      return { from: startOfYear(today), to: today };
  }
}

function validateRange(r: DateRange | undefined): string | null {
  if (!r?.from) return "Select a start date";
  if (!r.to) return "Select an end date";
  const today = startOfDay(new Date());
  if (r.from > today) return "Start date can't be in the future";
  if (r.to > today) return "End date can't be in the future";
  if (r.from > r.to) return "Start date must be before end date";
  const days = differenceInCalendarDays(r.to, r.from) + 1;
  if (days > MAX_RANGE_DAYS) return `Range can't exceed ${MAX_RANGE_DAYS} days`;
  return null;
}

/* ---------------- Date range picker ---------------- */

function DateRangeControl({
  preset,
  range,
  onPresetChange,
  onRangeChange,
}: {
  preset: Preset;
  range: DateRange;
  onPresetChange: (p: Preset) => void;
  onRangeChange: (r: DateRange) => void;
}) {
  const tabs: Preset[] = ["Today", "This Week", "This Month", "This Year", "Custom"];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(range);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setDraft(range);
      setError(null);
    }
    setOpen(o);
  };

  const apply = () => {
    const err = validateRange(draft);
    if (err) {
      setError(err);
      return;
    }
    onRangeChange(draft!);
    onPresetChange("Custom");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center bg-card border border-border rounded-xl p-1 shadow-sm">
        {tabs.map((t) => {
          const isCustom = t === "Custom";
          const active = preset === t;
          if (!isCustom) {
            return (
              <button
                key={t}
                onClick={() => {
                  onPresetChange(t);
                  onRangeChange(presetRange(t));
                }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  active
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            );
          }
          return (
            <Popover key={t} open={open} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5",
                    active
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CalendarIcon className="size-3.5" />
                  Custom
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0 pointer-events-auto">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-semibold">Select date range</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {draft?.from ? format(draft.from, "dd MMM yyyy") : "Start"}
                    {" — "}
                    {draft?.to ? format(draft.to, "dd MMM yyyy") : "End"}
                  </p>
                </div>
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={draft}
                  onSelect={(r) => {
                    setDraft(r);
                    setError(validateRange(r));
                  }}
                  disabled={{ after: new Date() }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
                {error && (
                  <div className="px-3 pb-2 -mt-1 flex items-center gap-1.5 text-xs text-danger">
                    <AlertCircle className="size-3.5" /> {error}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 p-3 border-t border-border bg-muted/30">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { l: "7D", d: 6 },
                      { l: "30D", d: 29 },
                      { l: "90D", d: 89 },
                    ].map((q) => (
                      <button
                        key={q.l}
                        onClick={() => {
                          const to = startOfDay(new Date());
                          const from = subDays(to, q.d);
                          const r = { from, to };
                          setDraft(r);
                          setError(validateRange(r));
                        }}
                        className="px-2 py-1 text-[11px] font-semibold rounded-md border border-border bg-background hover:bg-muted"
                      >
                        {q.l}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={apply}
                      disabled={!!validateRange(draft)}
                      className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1"
                    >
                      <Check className="size-3.5" /> Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Other Components ---------------- */

function SectionCard({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChannelDonut({
  data,
  metric,
  totalLabel,
  totalValue,
}: {
  data: { name: string; bookings: number; revenue: number; color: string }[];
  metric: "bookings" | "revenue";
  totalLabel: string;
  totalValue: string;
}) {
  const slices = data.map((s) => ({
    name: s.name,
    value: metric === "bookings" ? s.bookings : s.revenue,
    color: s.color,
  }));
  const grand = slices.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
              {slices.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => (metric === "revenue" ? fmt(v) : fmtN(v))}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground">{totalLabel}</span>
          <span className="text-lg font-bold mt-0.5">{totalValue}</span>
        </div>
      </div>
      <div className="text-xs">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0 text-muted-foreground font-medium pb-2 border-b border-border">
          <span>Source</span>
          <span className="text-right">{metric === "bookings" ? "Bookings" : "Revenue"}</span>
          <span className="text-right">%</span>
        </div>
        {slices.map((d) => (
          <div
            key={d.name}
            className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center py-2 border-b border-border/60 last:border-0"
          >
            <span className="flex items-center gap-2 text-foreground">
              <span className="size-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="text-right font-mono font-semibold text-foreground">
              {metric === "revenue" ? fmt(d.value) : fmtN(d.value)}
            </span>
            <span className="text-right font-semibold text-muted-foreground">
              {((d.value / grand) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OccBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-brand rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

function GrowthCell({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        up ? "text-success" : "text-danger",
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

/* ---------------- Page ---------------- */

function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("This Month");
  const [range, setRange] = useState<DateRange>(() => presetRange("This Month"));

  const derived = useMemo(() => {
    const from = range.from ?? new Date();
    const to = range.to ?? from;
    const days = Math.max(1, differenceInCalendarDays(to, from) + 1);
    // Scale: base metrics are calibrated to a 30-day month.
    const scale = days / 30;

    // Daily series for the selected window (cycle base data).
    const daily = Array.from({ length: days }, (_, i) => {
      const date = subDays(to, days - 1 - i);
      return {
        d: format(date, days <= 14 ? "dd MMM" : "dd/MM"),
        v: dailyTrendBase[i % dailyTrendBase.length],
      };
    });

    const occupancy = Array.from({ length: days }, (_, i) => ({
      d: format(subDays(to, days - 1 - i), "dd"),
      v: occupancyBase[i % occupancyBase.length],
    }));

    const avgOcc = occupancy.reduce((s, x) => s + x.v, 0) / occupancy.length;

    const source = sourceBase.map((s) => ({
      ...s,
      bookings: Math.round(s.bookings * scale),
      revenue: Math.round(s.revenue * scale),
    }));
    const routes = routeBase.map((r) => ({
      ...r,
      bookings: Math.round(r.bookings * scale),
      revenue: Math.round(r.revenue * scale),
    }));
    const buses = busBase.map((b) => ({
      ...b,
      trips: Math.max(1, Math.round(b.trips * scale)),
      revenue: Math.round(b.revenue * scale),
    }));
    const agents = agentBase.map((a) => ({
      ...a,
      bookings: Math.round(a.bookings * scale),
      revenue: Math.round(a.revenue * scale),
      commission: Math.round(a.commission * scale),
    }));

    const totalBookings = source.reduce((s, x) => s + x.bookings, 0);
    const totalRevenue = source.reduce((s, x) => s + x.revenue, 0);
    const expenses = Math.round(totalRevenue * 0.576);
    const profit = totalRevenue - expenses;
    const margin = totalRevenue ? (profit / totalRevenue) * 100 : 0;
    const todaysRevenue = daily[daily.length - 1]?.v ?? 0;

    return {
      days,
      daily,
      occupancy,
      avgOcc,
      source,
      routes,
      buses,
      agents,
      totalBookings,
      totalRevenue,
      expenses,
      profit,
      margin,
      todaysRevenue,
    };
  }, [range]);

  const rangeLabel =
    range.from && range.to
      ? `${format(range.from, "dd MMM yyyy")} — ${format(range.to, "dd MMM yyyy")} · ${derived.days} day${derived.days > 1 ? "s" : ""}`
      : "Select a date range";

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Track performance, revenue, occupancy and more"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeControl
              preset={preset}
              range={range}
              onPresetChange={setPreset}
              onRangeChange={setRange}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <FileText className="size-4 mr-2 text-danger" /> PDF Report
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileDown className="size-4 mr-2 text-chart-5" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileSpreadsheet className="size-4 mr-2 text-brand" /> Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              <Filter className="size-4" /> Filters
            </Button>
          </div>
        }
      />

      {/* Active range chip */}
      <div className="mb-5 inline-flex items-center gap-2 text-xs font-medium bg-brand/10 text-brand border border-brand/20 px-3 py-1.5 rounded-full">
        <CalendarIcon className="size-3.5" />
        Showing data for: <span className="font-semibold">{rangeLabel}</span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Period Revenue (Latest Day)"
          value={fmt(derived.todaysRevenue)}
          delta="12.8% vs prior day"
          icon={IndianRupee}
          tone="brand"
        />
        <StatCard
          label="Range Revenue"
          value={fmtCompact(derived.totalRevenue)}
          delta="18.6% vs prior period"
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Total Bookings"
          value={fmtN(derived.totalBookings)}
          delta="15.4% vs prior period"
          icon={Ticket}
          tone="navy"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${derived.avgOcc.toFixed(1)}%`}
          delta="6.3% vs prior period"
          icon={Percent}
          tone="warning"
        />
        <StatCard
          label="Net Profit"
          value={fmtCompact(derived.profit)}
          delta="14.7% vs prior period"
          icon={TrendingUp}
          tone="brand"
        />
      </div>

      {/* Revenue trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Revenue Trend (Selected Range)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={derived.daily}>
                <defs>
                  <linearGradient id="grd-d" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#grd-d)"
                  dot={derived.days <= 14 ? { r: 3, fill: "var(--brand)" } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Revenue Trend (Monthly)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="v" fill="var(--brand)" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Revenue Trend (Yearly)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyTrend}>
                <defs>
                  <linearGradient id="grd-y" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="y" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="v" stroke="var(--chart-5)" strokeWidth={2.5} fill="url(#grd-y)" dot={{ r: 3, fill: "var(--chart-5)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Source analytics + Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Booking Source Analytics">
          <ChannelDonut
            data={derived.source}
            metric="bookings"
            totalLabel="Total"
            totalValue={fmtN(derived.totalBookings)}
          />
        </SectionCard>
        <SectionCard title="Revenue by Source">
          <ChannelDonut
            data={derived.source}
            metric="revenue"
            totalLabel="Total"
            totalValue={fmtCompact(derived.totalRevenue)}
          />
        </SectionCard>
        <SectionCard title="Occupancy Analytics">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={derived.occupancy}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} dot={derived.days <= 14 ? { r: 3, fill: "var(--brand)" } : false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { l: "Latest", v: `${derived.occupancy[derived.occupancy.length - 1]?.v ?? 0}%` },
              { l: "Average", v: `${derived.avgOcc.toFixed(1)}%` },
              { l: "Peak", v: `${Math.max(...derived.occupancy.map((o) => o.v))}%` },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border p-3 bg-muted/30">
                <p className="text-[11px] text-muted-foreground">{s.l}</p>
                <p className="text-base font-bold mt-0.5">{s.v}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Performance tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Top Performing Routes">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Route</th>
                <th className="text-right font-medium py-2">Bookings</th>
                <th className="text-right font-medium py-2">Revenue</th>
                <th className="text-right font-medium py-2">Occ.</th>
                <th className="text-right font-medium py-2">Growth</th>
              </tr>
            </thead>
            <tbody>
              {derived.routes.map((r) => (
                <tr key={r.route} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 font-medium">{r.route}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtN(r.bookings)}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono">{fmt(r.revenue)}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.occ}%</td>
                  <td className="py-2.5 text-right"><GrowthCell v={r.growth} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="outline" className="w-full mt-4 rounded-xl">View All Routes</Button>
        </SectionCard>

        <SectionCard title="Top Performing Buses">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Bus Number</th>
                <th className="text-right font-medium py-2">Trips</th>
                <th className="text-right font-medium py-2">Revenue</th>
                <th className="text-right font-medium py-2">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {derived.buses.map((b) => (
                <tr key={b.bus} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 font-medium">{b.bus}</td>
                  <td className="py-2.5 text-right tabular-nums">{b.trips}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono">{fmt(b.revenue)}</td>
                  <td className="py-2.5 text-right"><div className="inline-flex"><OccBar value={b.occ} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="outline" className="w-full mt-4 rounded-xl">View All Buses</Button>
        </SectionCard>

        <SectionCard title="Top Agents">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2">Agent</th>
                <th className="text-right font-medium py-2">Bookings</th>
                <th className="text-right font-medium py-2">Revenue</th>
                <th className="text-right font-medium py-2">Commission</th>
              </tr>
            </thead>
            <tbody>
              {derived.agents.map((a) => (
                <tr key={a.name} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 font-medium truncate max-w-[140px]">{a.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtN(a.bookings)}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono">{fmt(a.revenue)}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-brand">{fmt(a.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="outline" className="w-full mt-4 rounded-xl">View All Agents</Button>
        </SectionCard>
      </div>

      {/* Profitability + Quick reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Profitability Summary" className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4 bg-brand/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="size-4 text-brand" /> Total Revenue
              </div>
              <p className="text-xl font-bold mt-2">{fmtCompact(derived.totalRevenue)}</p>
              <p className="text-xs text-success font-semibold mt-1">+18.6%</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-danger/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Receipt className="size-4 text-danger" /> Total Expenses
              </div>
              <p className="text-xl font-bold mt-2">{fmtCompact(derived.expenses)}</p>
              <p className="text-xs text-danger font-semibold mt-1">+9.2%</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-chart-5/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <PiggyBank className="size-4 text-chart-5" /> Net Profit
              </div>
              <p className="text-xl font-bold mt-2">{fmtCompact(derived.profit)}</p>
              <p className="text-xs text-success font-semibold mt-1">+14.7%</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-warning/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Percent className="size-4 text-warning" /> Profit Margin
              </div>
              <p className="text-xl font-bold mt-2">{derived.margin.toFixed(1)}%</p>
              <p className="text-xs text-success font-semibold mt-1">+2.1%</p>
            </div>
          </div>

          <div className="mt-5 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.daily.slice(-Math.min(derived.days, 14))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="v" fill="var(--brand)" radius={[6, 6, 0, 0]} barSize={18} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Quick Reports">
          <ul className="divide-y divide-border/60">
            {[
              "Daily Revenue Report",
              "Monthly Revenue Report",
              "Route Performance Report",
              "Agent Performance Report",
              "Bus Performance Report",
              "Occupancy Report",
            ].map((r) => (
              <li key={r} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group">
                <span className="text-sm">{r}</span>
                <button className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand transition-colors">
                  <Download className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
