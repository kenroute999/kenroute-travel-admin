import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
  FileDown,
  Wallet,
  Receipt,
  PiggyBank,
  CalendarIcon,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  format,
  differenceInCalendarDays,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
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
import { errorMessage } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv";
import { getSummary, SOURCE_COLORS, summaryKey, type Summary } from "@/lib/api/reports";

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
            <Pie
              data={slices}
              dataKey="value"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
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

/* ---------------- Page ---------------- */

const isoDay = (d: Date) => format(d, "yyyy-MM-dd");

/** The CSV files offered on this page, each built from the figures on screen. */
function reportFiles(data: Summary, monthly: { m: string; v: number }[]) {
  const tag = `${data.range.from}_to_${data.range.to}`;
  return {
    "Daily Revenue Report": () =>
      downloadCsv(
        `daily-revenue_${tag}.csv`,
        ["Date", "Bookings", "Cancelled", "Revenue", "Occupancy %"],
        data.daily.map((d) => [d.date, d.bookings, d.cancelled, d.revenue, d.occupancyPct]),
      ),
    "Monthly Revenue Report": () =>
      downloadCsv(
        `monthly-revenue_${data.range.to.slice(0, 4)}.csv`,
        ["Month", "Revenue"],
        monthly.map((m) => [m.m, m.v]),
      ),
    "Route Performance Report": () =>
      downloadCsv(
        `routes_${tag}.csv`,
        ["Route", "Trips", "Bookings", "Revenue", "Occupancy %"],
        data.byRoute.map((r) => [r.route, r.trips, r.bookings, r.revenue, r.occupancyPct]),
      ),
    "Agent Performance Report": () =>
      downloadCsv(
        `agents_${tag}.csv`,
        ["Agent", "Code", "Bookings", "Revenue", "Commission"],
        data.byAgent.map((a) => [a.name, a.code, a.bookings, a.revenue, a.commission]),
      ),
    "Bus Performance Report": () =>
      downloadCsv(
        `buses_${tag}.csv`,
        ["Bus", "Name", "Trips", "Bookings", "Revenue", "Occupancy %"],
        data.byBus.map((b) => [b.bus, b.name, b.trips, b.bookings, b.revenue, b.occupancyPct]),
      ),
    "Occupancy Report": () =>
      downloadCsv(
        `occupancy_${tag}.csv`,
        ["Date", "Occupancy %"],
        data.daily.map((d) => [d.date, d.occupancyPct]),
      ),
  };
}

function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("This Month");
  const [range, setRange] = useState<DateRange>(() => presetRange("This Month"));

  const from = isoDay(range.from ?? new Date());
  const to = isoDay(range.to ?? range.from ?? new Date());
  const yearFrom = isoDay(startOfYear(new Date()));
  const today = isoDay(new Date());

  const query = useQuery({
    queryKey: summaryKey(from, to),
    queryFn: () => getSummary(from, to),
    placeholderData: keepPreviousData,
  });
  const yearQuery = useQuery({
    queryKey: summaryKey(yearFrom, today),
    queryFn: () => getSummary(yearFrom, today),
  });
  const data = query.data;

  const days = data?.range.days ?? 1;
  const daily = (data?.daily ?? []).map((d) => ({
    d: format(parseISO(d.date), days <= 14 ? "dd MMM" : "dd/MM"),
    v: d.revenue,
    bookings: d.bookings,
    cancelled: d.cancelled,
    occ: d.occupancyPct,
  }));
  const byMonth = new Map<string, number>();
  for (const d of yearQuery.data?.daily ?? [])
    byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.revenue);
  const monthly = [...byMonth].map(([month, v]) => ({
    m: format(parseISO(`${month}-01`), "MMM"),
    v,
  }));

  const source = (data?.bySource ?? []).map((s) => ({
    name: s.source,
    bookings: s.bookings,
    revenue: s.revenue,
    color: SOURCE_COLORS[s.source] ?? "var(--muted-foreground)",
  }));
  const revenue = data?.totals.revenue ?? 0;
  const commission = data?.totals.commission ?? 0;
  const net = revenue - commission;
  const kept = revenue ? (net / revenue) * 100 : 0;
  const files = data ? reportFiles(data, monthly) : null;
  const none = (cols: number, text: string) => (
    <tr>
      <td colSpan={cols} className="py-6 text-center text-sm text-muted-foreground">
        {data ? text : "Loading…"}
      </td>
    </tr>
  );

  const rangeLabel =
    range.from && range.to
      ? `${format(range.from, "dd MMM yyyy")} — ${format(range.to, "dd MMM yyyy")} · ${differenceInCalendarDays(range.to, range.from) + 1} day(s)`
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
                <Button variant="outline" className="gap-2 rounded-xl" disabled={!files}>
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => window.print()}>
                  <FileText className="size-4 mr-2 text-danger" /> PDF (print this page)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => files?.["Daily Revenue Report"]()}>
                  <FileDown className="size-4 mr-2 text-chart-5" /> CSV (opens in Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Active range chip */}
      <div className="mb-5 inline-flex items-center gap-2 text-xs font-medium bg-brand/10 text-brand border border-brand/20 px-3 py-1.5 rounded-full">
        <CalendarIcon className="size-3.5" />
        Showing data for: <span className="font-semibold">{rangeLabel}</span>
      </div>

      {query.error && (
        <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="size-4" /> Could not load the report: {errorMessage(query.error)}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Revenue Today"
          value={data ? fmt(data.today.revenue) : "—"}
          icon={IndianRupee}
          tone="brand"
        />
        <StatCard
          label="Range Revenue"
          value={data ? fmtCompact(revenue) : "—"}
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Total Bookings"
          value={data ? fmtN(data.totals.bookings) : "—"}
          icon={Ticket}
          tone="navy"
        />
        <StatCard
          label="Occupancy Rate"
          value={data ? `${data.totals.occupancyPct}%` : "—"}
          icon={Percent}
          tone="warning"
        />
        <StatCard
          label="Net After Commission"
          value={data ? fmtCompact(net) : "—"}
          icon={TrendingUp}
          tone="brand"
        />
      </div>

      {/* Revenue trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Revenue Trend (Selected Range)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
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
                  name="Revenue"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#grd-d)"
                  dot={days <= 14 ? { r: 3, fill: "var(--brand)" } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title={`Revenue Trend (Monthly, ${today.slice(0, 4)})`}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="m"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                <Bar
                  dataKey="v"
                  name="Revenue"
                  fill="var(--brand)"
                  radius={[6, 6, 0, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Bookings & Cancellations (Selected Range)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="bookings" name="Bookings" stackId="a" fill="var(--chart-5)" />
                <Bar
                  dataKey="cancelled"
                  name="Cancelled"
                  stackId="a"
                  fill="var(--danger)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Source analytics + Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Booking Source Analytics">
          <ChannelDonut
            data={source}
            metric="bookings"
            totalLabel="Total"
            totalValue={fmtN(data?.totals.bookings ?? 0)}
          />
        </SectionCard>
        <SectionCard title="Revenue by Source">
          <ChannelDonut
            data={source}
            metric="revenue"
            totalLabel="Total"
            totalValue={fmtCompact(revenue)}
          />
        </SectionCard>
        <SectionCard title="Occupancy Analytics">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="occ"
                  name="Occupancy"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  dot={days <= 14 ? { r: 3, fill: "var(--brand)" } : false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { l: "Latest", v: `${daily[daily.length - 1]?.occ ?? 0}%` },
              { l: "Average", v: `${data?.totals.occupancyPct ?? 0}%` },
              { l: "Peak", v: `${Math.max(0, ...daily.map((o) => o.occ))}%` },
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
                <th className="text-right font-medium py-2">Trips</th>
                <th className="text-right font-medium py-2">Bookings</th>
                <th className="text-right font-medium py-2">Revenue</th>
                <th className="text-right font-medium py-2">Occ.</th>
              </tr>
            </thead>
            <tbody>
              {!data?.byRoute.length && none(5, "No tickets sold in this range.")}
              {data?.byRoute.slice(0, 5).map((r) => (
                <tr
                  key={r.route}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="py-2.5 font-medium">{r.route}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.trips}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtN(r.bookings)}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono">{fmt(r.revenue)}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.occupancyPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button asChild variant="outline" className="w-full mt-4 rounded-xl">
            <Link to="/routes">View All Routes</Link>
          </Button>
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
              {!data?.byBus.length && none(4, "No tickets sold in this range.")}
              {data?.byBus.slice(0, 5).map((b) => (
                <tr
                  key={b.bus}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="py-2.5 font-medium">{b.bus}</td>
                  <td className="py-2.5 text-right tabular-nums">{b.trips}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono">{fmt(b.revenue)}</td>
                  <td className="py-2.5 text-right">
                    <div className="inline-flex">
                      <OccBar value={b.occupancyPct} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button asChild variant="outline" className="w-full mt-4 rounded-xl">
            <Link to="/buses">View All Buses</Link>
          </Button>
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
              {!data?.byAgent.length && none(4, "No agent bookings in this range.")}
              {data?.byAgent.slice(0, 5).map((a) => (
                <tr
                  key={a.code}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="py-2.5 font-medium truncate max-w-[140px]">{a.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtN(a.bookings)}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono">{fmt(a.revenue)}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-brand">
                    {fmt(a.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button asChild variant="outline" className="w-full mt-4 rounded-xl">
            <Link to="/agents">View All Agents</Link>
          </Button>
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
              <p className="text-xl font-bold mt-2">{fmtCompact(revenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtN(data?.totals.bookings ?? 0)} tickets
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-danger/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Receipt className="size-4 text-danger" /> Agent Commission
              </div>
              <p className="text-xl font-bold mt-2">{fmtCompact(commission)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtN(data?.totals.cancelled ?? 0)} tickets cancelled
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-chart-5/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <PiggyBank className="size-4 text-chart-5" /> Net After Commission
              </div>
              <p className="text-xl font-bold mt-2">{fmtCompact(net)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Avg fare {fmt(data?.totals.averageFare ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-warning/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Percent className="size-4 text-warning" /> Kept After Commission
              </div>
              <p className="text-xl font-bold mt-2">{kept.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtN(data?.totals.trips ?? 0)} trips run
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Fuel, salaries and other running costs are not recorded in KenRoute yet, so this is
            revenue less agent commission.
          </p>

          <div className="mt-5 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                <Bar
                  dataKey="v"
                  fill="var(--brand)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Quick Reports">
          <ul className="divide-y divide-border/60">
            {(
              [
                "Daily Revenue Report",
                "Monthly Revenue Report",
                "Route Performance Report",
                "Agent Performance Report",
                "Bus Performance Report",
                "Occupancy Report",
              ] as const
            ).map((r) => (
              <li
                key={r}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
              >
                <span className="text-sm">{r}</span>
                <button
                  disabled={!files}
                  onClick={() => files?.[r]()}
                  title={`Download ${r} (CSV)`}
                  aria-label={`Download ${r}`}
                  className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand transition-colors disabled:opacity-50"
                >
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
