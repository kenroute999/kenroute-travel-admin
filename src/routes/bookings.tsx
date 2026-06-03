import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  BusFront,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Ticket,
  TicketCheck,
  TicketX,
  Wallet,
  XCircle,
  Eye,
  X,
  Globe,
  Users,
  Building2,
  UserCog,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — KenRoute" },
      { name: "description", content: "Premium booking management for KenRoute travel operations." },
    ],
  }),
  component: BookingsPage,
});

type BookingStatus = "Confirmed" | "Pending" | "Cancelled" | "Completed";
type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Failed";
type BookingSource = "redBus" | "AbhiBus" | "Agent" | "Counter" | "Website";

interface Booking {
  id: string;
  pnr: string;
  source: BookingSource;
  passenger: string;
  phone: string;
  gender: "Male" | "Female";
  age: number;
  idProof: string;
  from: string;
  to: string;
  boarding: string;
  dropping: string;
  bus: string;
  busName: string;
  seat: string;
  seatType: "Lower" | "Upper";
  journey: string;
  depart: string;
  arrive: string;
  duration: string;
  amount: number;
  payment: PaymentStatus;
  status: BookingStatus;
  initials: string;
  avatarTone: string;
}

const initial: Booking[] = [
  { id: "KR-10421", pnr: "KENR-10421-250520", source: "redBus", passenger: "Anil Kumar", phone: "+91 98765 43210", gender: "Male", age: 32, idProof: "Aadhar Card", from: "Hyderabad", to: "Bangalore", boarding: "Ameerpet", dropping: "Silk Board", bus: "TS 09 AB 1234", busName: "Volvo B11R", seat: "L3", seatType: "Lower", journey: "20 May 2025", depart: "08:00 PM", arrive: "05:30 AM", duration: "9h 30m", amount: 1250, payment: "Paid", status: "Confirmed", initials: "AK", avatarTone: "bg-emerald-100 text-emerald-700" },
  { id: "KR-10422", pnr: "KENR-10422-250520", source: "AbhiBus", passenger: "Sneha Rao", phone: "+91 91234 56789", gender: "Female", age: 28, idProof: "PAN Card", from: "Hyderabad", to: "Vijayawada", boarding: "Miyapur", dropping: "Benz Circle", bus: "TS 09 CD 5678", busName: "Scania Metrolink", seat: "U7", seatType: "Upper", journey: "20 May 2025", depart: "06:00 AM", arrive: "12:00 PM", duration: "6h 00m", amount: 650, payment: "Paid", status: "Confirmed", initials: "SR", avatarTone: "bg-pink-100 text-pink-700" },
  { id: "KR-10423", pnr: "KENR-10423-250521", source: "Agent", passenger: "Vikram Singh", phone: "+91 99876 54321", gender: "Male", age: 41, idProof: "Aadhar Card", from: "Bangalore", to: "Chennai", boarding: "Silk Board", dropping: "Koyambedu", bus: "KA 01 AB 2222", busName: "Volvo B11R", seat: "L1", seatType: "Lower", journey: "21 May 2025", depart: "07:00 PM", arrive: "03:30 AM", duration: "8h 30m", amount: 890, payment: "Pending", status: "Pending", initials: "VS", avatarTone: "bg-blue-100 text-blue-700" },
  { id: "KR-10424", pnr: "KENR-10424-250521", source: "Counter", passenger: "Pooja Reddy", phone: "+91 93456 78901", gender: "Female", age: 26, idProof: "Aadhar Card", from: "Hyderabad", to: "Chennai", boarding: "LB Nagar", dropping: "Koyambedu", bus: "TS 09 EF 9101", busName: "Benz Dreamz", seat: "U4", seatType: "Upper", journey: "21 May 2025", depart: "09:00 PM", arrive: "07:00 AM", duration: "10h 00m", amount: 1420, payment: "Paid", status: "Cancelled", initials: "PR", avatarTone: "bg-violet-100 text-violet-700" },
  { id: "KR-10425", pnr: "KENR-10425-250522", source: "Website", passenger: "Karthik Iyer", phone: "+91 90000 11122", gender: "Male", age: 35, idProof: "Driving License", from: "Visakhapatnam", to: "Hyderabad", boarding: "MVP Colony", dropping: "Kukatpally", bus: "AP 39 GH 1122", busName: "Volvo B8R", seat: "L9", seatType: "Lower", journey: "22 May 2025", depart: "08:30 PM", arrive: "06:30 AM", duration: "10h 00m", amount: 1180, payment: "Paid", status: "Completed", initials: "KI", avatarTone: "bg-amber-100 text-amber-700" },
  { id: "KR-10426", pnr: "KENR-10426-250522", source: "redBus", passenger: "Ramesh Babu", phone: "+91 97888 66554", gender: "Male", age: 49, idProof: "Aadhar Card", from: "Hyderabad", to: "Tirupati", boarding: "Miyapur", dropping: "Tirupati", bus: "TS 09 IJ 3344", busName: "Benz AC Sleeper", seat: "U8", seatType: "Upper", journey: "22 May 2025", depart: "06:30 AM", arrive: "06:00 PM", duration: "11h 30m", amount: 900, payment: "Pending", status: "Pending", initials: "RB", avatarTone: "bg-orange-100 text-orange-700" },
  { id: "KR-10427", pnr: "KENR-10427-250522", source: "AbhiBus", passenger: "Lakshmi Devi", phone: "+91 99663 22114", gender: "Female", age: 38, idProof: "Aadhar Card", from: "Hyderabad", to: "Bangalore", boarding: "Ameerpet", dropping: "Silk Board", bus: "TS 09 KL 7788", busName: "Scania MultiAxle", seat: "L5", seatType: "Lower", journey: "22 May 2025", depart: "11:30 PM", arrive: "09:00 AM", duration: "9h 30m", amount: 1300, payment: "Paid", status: "Confirmed", initials: "LD", avatarTone: "bg-rose-100 text-rose-700" },
];

const bookingStatusStyles: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  Pending: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400",
  Completed: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400",
};
const bookingDot: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-500",
  Pending: "bg-orange-500",
  Cancelled: "bg-rose-500",
  Completed: "bg-sky-500",
};

const paymentStyles: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-orange-50 text-orange-700 border-orange-200",
  Refunded: "bg-slate-100 text-slate-700 border-slate-200",
  Failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const SOURCE_META: Record<BookingSource, { color: string; chip: string; icon: typeof Globe; tint: string }> = {
  redBus:  { color: "#e63946", chip: "bg-rose-50 text-rose-700 border-rose-200",         icon: Globe,     tint: "bg-rose-100 text-rose-600" },
  AbhiBus: { color: "#7c3aed", chip: "bg-violet-50 text-violet-700 border-violet-200",   icon: Globe,     tint: "bg-violet-100 text-violet-600" },
  Agent:   { color: "#10b981", chip: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: UserCog,   tint: "bg-emerald-100 text-emerald-600" },
  Counter: { color: "#f59e0b", chip: "bg-orange-50 text-orange-700 border-orange-200",   icon: Building2, tint: "bg-orange-100 text-orange-600" },
  Website: { color: "#3b82f6", chip: "bg-sky-50 text-sky-700 border-sky-200",            icon: Globe,     tint: "bg-sky-100 text-sky-600" },
};

const SOURCE_ORDER: BookingSource[] = ["redBus", "AbhiBus", "Agent", "Counter", "Website"];

function SourceBadge({ source }: { source: BookingSource }) {
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border", meta.chip)}>
      <Icon className="size-3" />
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", bookingStatusStyles[status])}>
      <span className={cn("size-1.5 rounded-full", bookingDot[status])} />
      {status}
    </span>
  );
}
function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border", paymentStyles[status])}>
      {status}
    </span>
  );
}

function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const routes = useMemo(() => Array.from(new Set(rows.map((r) => `${r.from} → ${r.to}`))), [rows]);
  const journeyDates = useMemo(() => Array.from(new Set(rows.map((r) => r.journey))), [rows]);

  // Realistic OTA-scale aggregates (mocked for dashboard feel)
  const sourceTotals: Record<BookingSource, { count: number; revenue: number }> = {
    redBus:  { count: 512, revenue: 345670 },
    AbhiBus: { count: 276, revenue: 210430 },
    Agent:   { count: 245, revenue: 165230 },
    Counter: { count: 142, revenue: 95450 },
    Website: { count:  79, revenue: 28450 },
  };
  const totalBookings = SOURCE_ORDER.reduce((s, k) => s + sourceTotals[k].count, 0);
  const totalRevenue  = SOURCE_ORDER.reduce((s, k) => s + sourceTotals[k].revenue, 0);
  const pieData = SOURCE_ORDER.map((k) => ({ name: k, value: sourceTotals[k].count, color: SOURCE_META[k].color }));

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.trim().toLowerCase();
      const matchesQ = !q || r.id.toLowerCase().includes(q) || r.pnr.toLowerCase().includes(q) || r.passenger.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
      const matchesR = routeFilter === "all" || `${r.from} → ${r.to}` === routeFilter;
      const matchesS = statusFilter === "all" || r.status === statusFilter;
      const matchesP = paymentFilter === "all" || r.payment === paymentFilter;
      const matchesSrc = sourceFilter === "all" || r.source === sourceFilter;
      const matchesD = dateFilter === "all" || r.journey === dateFilter;
      return matchesQ && matchesR && matchesS && matchesP && matchesSrc && matchesD;
    });
  }, [rows, query, routeFilter, statusFilter, paymentFilter, sourceFilter, dateFilter]);

  return (
    <>
      <PageHeader
        title="Bookings"
        breadcrumb="Bookings"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 rounded-xl">
              <Download className="size-4" />
              Export
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-10 px-4 rounded-xl">
              <Plus className="size-4" />
              New Booking
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Bookings" value="1,254" delta="12.5% from yesterday" icon={Ticket} tone="brand" />
        <StatCard label="Confirmed Bookings" value="1,089" delta="10.3% from yesterday" icon={TicketCheck} tone="brand" />
        <StatCard label="Cancelled Bookings" value="165" delta="5.6% from yesterday" icon={TicketX} tone="danger" />
        <StatCard label="Revenue Generated" value="₹8,45,230" delta="14.2% from yesterday" icon={Wallet} tone="navy" />
        <StatCard label="Occupancy Rate" value="78.4%" delta="8.6% from yesterday" icon={TrendingUp} tone="info" />
      </div>

      {/* Source analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6">
        {/* Source mini cards */}
        <div className="xl:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SOURCE_ORDER.map((src) => {
            const meta = SOURCE_META[src];
            const Icon = meta.icon;
            const data = sourceTotals[src];
            const pct = ((data.count / totalBookings) * 100).toFixed(1);
            return (
              <div key={src} className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", meta.tint)}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{src} Bookings</p>
                    <p className="text-xl font-bold tracking-tight">{data.count.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{pct}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie chart */}
        <div className="xl:col-span-4 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <PieIcon className="size-4 text-brand" />
              Booking Source Distribution
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-[160px] h-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n) => [`${v.toLocaleString()} bookings`, n]}
                    contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-lg font-bold tracking-tight">{totalBookings.toLocaleString()}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm min-w-0">
              {pieData.map((d) => {
                const pct = ((d.value / totalBookings) * 100).toFixed(1);
                return (
                  <li key={d.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {pct}% <span className="text-foreground/60">({d.value})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Revenue by source */}
        <div className="xl:col-span-3 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wallet className="size-4 text-brand" />
            Revenue by Source
          </h3>
          <ul className="space-y-2.5 text-sm">
            {SOURCE_ORDER.map((src) => {
              const meta = SOURCE_META[src];
              const Icon = meta.icon;
              const rev = sourceTotals[src].revenue;
              const pct = ((rev / totalRevenue) * 100).toFixed(1);
              return (
                <li key={src} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-7 rounded-md flex items-center justify-center shrink-0", meta.tint)}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="truncate font-medium">{src}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">₹{rev.toLocaleString()}</span>
                    <span className="block text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Revenue</span>
            <span className="font-bold text-brand">₹{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>


      {/* Table card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4 border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Booking ID, Name, Mobile, PNR…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="size-4 text-muted-foreground hidden sm:block" />
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="h-11 w-[170px] rounded-xl bg-background"><SelectValue placeholder="Route" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background"><SelectValue placeholder="Journey Date" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {journeyDates.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[140px] rounded-xl bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="px-5 py-3.5 font-semibold">Booking ID</th>
                <th className="px-5 py-3.5 font-semibold">Source</th>
                <th className="px-5 py-3.5 font-semibold">Passenger</th>
                <th className="px-5 py-3.5 font-semibold">Mobile</th>
                <th className="px-5 py-3.5 font-semibold">Route</th>
                <th className="px-5 py-3.5 font-semibold">Boarding</th>
                <th className="px-5 py-3.5 font-semibold">Seat</th>
                <th className="px-5 py-3.5 font-semibold">Journey</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Payment</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 12 }).map((__, j) => (
                        <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full max-w-[120px]" /></td>
                      ))}
                    </tr>
                  ))
                : filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border transition-colors hover:bg-brand/[0.04] group">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{r.id}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">PNR {r.pnr.slice(-10)}</div>
                      </td>
                      <td className="px-5 py-4"><SourceBadge source={r.source} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("size-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0", r.avatarTone)}>
                            {r.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{r.passenger}</div>
                            <div className="text-[11px] text-muted-foreground">{r.gender} • {r.age}y</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-muted-foreground whitespace-nowrap">{r.phone}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{r.from}</span>
                          <ArrowRight className="size-3.5 text-brand" />
                          <span>{r.to}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.bus} • {r.busName}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="size-3.5 text-brand" />
                          {r.boarding}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">→ {r.dropping}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                          {r.seat}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{r.journey}</div>
                        <div className="text-xs text-muted-foreground">{r.depart}</div>
                      </td>
                      <td className="px-5 py-4 font-semibold">₹{r.amount.toLocaleString()}</td>
                      <td className="px-5 py-4"><PaymentBadge status={r.payment} /></td>
                      <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelected(r)} aria-label="View" className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110">
                            <Eye className="size-4" />
                          </button>
                          <button aria-label="Download" className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sky-50 hover:text-sky-600 transition-all hover:scale-110">
                            <Download className="size-4" />
                          </button>
                          <button aria-label="Edit" className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-all hover:scale-110">
                            <Pencil className="size-4" />
                          </button>
                          <button aria-label="Cancel" className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-110">
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center text-muted-foreground">
                    <Ticket className="size-10 mx-auto mb-2 opacity-40" />
                    No bookings match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">1</span> to{" "}
            <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">3,256</span> bookings
          </p>
          <div className="flex items-center gap-1">
            <button className="size-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            {[1, 2, 3, 4, 5].map((p) => (
              <button key={p} className={cn("size-9 rounded-lg text-sm font-medium transition-all",
                p === 1 ? "bg-brand text-brand-foreground shadow-sm" : "border border-border hover:bg-muted text-foreground")}>
                {p}
              </button>
            ))}
            <button className="size-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket preview sidebar */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="p-5 border-b border-border flex-row items-center justify-between space-y-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Ticket className="size-5 text-brand" />
              Booking Details
            </SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="text-center">
                <StatusBadge status={selected.status} />
                <div className="mt-2 text-lg font-bold tracking-tight">{selected.id}</div>
                <div className="text-xs text-muted-foreground">PNR: {selected.pnr}</div>
              </div>

              {/* E-ticket card */}
              <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="bg-navy text-navy-foreground px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <BusFront className="size-4 text-brand" />
                    KenRoute
                  </div>
                  <span className="text-xs opacity-80">E-Ticket</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div>
                      <div className="text-xs text-muted-foreground">{selected.from}</div>
                      <div className="font-semibold">{selected.boarding}</div>
                      <div className="text-lg font-bold mt-1">{selected.depart}</div>
                      <div className="text-xs text-muted-foreground">{selected.journey}</div>
                    </div>
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ArrowRight className="size-5 text-brand" />
                      <span className="text-xs mt-1">{selected.duration}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{selected.to}</div>
                      <div className="font-semibold">{selected.dropping}</div>
                      <div className="text-lg font-bold mt-1">{selected.arrive}</div>
                      <div className="text-xs text-muted-foreground">{selected.journey}</div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-border pt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Bus</div>
                      <div className="font-semibold">{selected.bus}</div>
                      <div className="text-xs text-muted-foreground">{selected.busName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Seat</div>
                      <div className="font-semibold">{selected.seat}</div>
                      <div className="text-xs text-muted-foreground">{selected.seatType}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Fare</div>
                      <div className="font-bold text-brand">₹{selected.amount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger details */}
              <div>
                <div className="font-semibold mb-3">Passenger Details</div>
                <div className="space-y-2 text-sm">
                  <Row label="Name" value={selected.passenger} />
                  <Row label="Phone" value={selected.phone} />
                  <Row label="Gender" value={selected.gender} />
                  <Row label="Age" value={`${selected.age} Years`} />
                  <Row label="ID Proof" value={selected.idProof} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Boarding Point</div>
                  <div className="font-medium">{selected.boarding}, {selected.from}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-medium">{selected.depart}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dropping Point</div>
                  <div className="font-medium">{selected.dropping}, {selected.to}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-medium">{selected.arrive}</div>
                </div>
              </div>

              {/* QR */}
              <div className="flex flex-col items-center pt-2">
                <QRPlaceholder />
                <div className="text-xs text-muted-foreground mt-2">Scan at boarding</div>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-border bg-muted/20 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-xl">
              <Download className="size-4" />
              Download Ticket
            </Button>
            <Button className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
              <X className="size-4" />
              Cancel Booking
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <NewBookingSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingRoutes={routes}
        onCreate={(b) => {
          setRows((prev) => [b, ...prev]);
          toast.success(`Booking ${b.id} created for ${b.passenger}`);
        }}
      />
    </>
  );
}

interface NewBookingSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingRoutes: string[];
  onCreate: (b: Booking) => void;
}

const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

function NewBookingSheet({ open, onOpenChange, existingRoutes, onCreate }: NewBookingSheetProps) {
  const [passenger, setPassenger] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState("");
  const [idProof, setIdProof] = useState("Aadhar Card");
  const [from, setFrom] = useState("Hyderabad");
  const [to, setTo] = useState("Bangalore");
  const [boarding, setBoarding] = useState("");
  const [dropping, setDropping] = useState("");
  const [bus, setBus] = useState("");
  const [busName, setBusName] = useState("Volvo B11R");
  const [seat, setSeat] = useState("");
  const [seatType, setSeatType] = useState<"Lower" | "Upper">("Lower");
  const [journey, setJourney] = useState("");
  const [depart, setDepart] = useState("");
  const [arrive, setArrive] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<PaymentStatus>("Paid");
  const [status, setStatus] = useState<BookingStatus>("Confirmed");
  const [source, setSource] = useState<BookingSource>("Counter");

  const reset = () => {
    setPassenger(""); setPhone(""); setAge(""); setBoarding(""); setDropping("");
    setBus(""); setSeat(""); setJourney(""); setDepart(""); setArrive(""); setAmount("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passenger || !phone || !from || !to || !amount) {
      toast.error("Please fill in passenger, route and amount");
      return;
    }
    const id = `KR-${Math.floor(10428 + Math.random() * 999)}`;
    const initials = passenger.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    const newBooking: Booking = {
      id,
      pnr: `KENR-${id.replace("KR-", "")}-${Date.now().toString().slice(-6)}`,
      source,
      passenger, phone, gender,
      age: Number(age) || 25,
      idProof, from, to,
      boarding: boarding || from,
      dropping: dropping || to,
      bus: bus || "TS 09 XX 0000",
      busName,
      seat: seat || "L1",
      seatType,
      journey: journey || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      depart: depart || "08:00 PM",
      arrive: arrive || "06:00 AM",
      duration: "9h 30m",
      amount: Number(amount),
      payment, status,
      initials,
      avatarTone: AVATAR_TONES[Math.floor(Math.random() * AVATAR_TONES.length)],
    };
    onCreate(newBooking);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="p-5 border-b border-border space-y-0">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Plus className="size-5 text-brand" />
            Create New Booking
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-1">Fill in the passenger and journey details to issue a ticket.</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Passenger</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name *"><Input value={passenger} onChange={(e) => setPassenger(e.target.value)} placeholder="Anil Kumar" className="h-10 rounded-lg" /></Field>
              <Field label="Phone *"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="h-10 rounded-lg" /></Field>
              <Field label="Gender">
                <Select value={gender} onValueChange={(v) => setGender(v as "Male" | "Female")}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Age"><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="28" className="h-10 rounded-lg" /></Field>
              <Field label="ID Proof">
                <Select value={idProof} onValueChange={setIdProof}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                    <SelectItem value="PAN Card">PAN Card</SelectItem>
                    <SelectItem value="Driving License">Driving License</SelectItem>
                    <SelectItem value="Passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Journey</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From *"><Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Hyderabad" className="h-10 rounded-lg" /></Field>
              <Field label="To *"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Bangalore" className="h-10 rounded-lg" /></Field>
              <Field label="Boarding Point"><Input value={boarding} onChange={(e) => setBoarding(e.target.value)} placeholder="Ameerpet" className="h-10 rounded-lg" /></Field>
              <Field label="Dropping Point"><Input value={dropping} onChange={(e) => setDropping(e.target.value)} placeholder="Silk Board" className="h-10 rounded-lg" /></Field>
              <Field label="Journey Date"><Input value={journey} onChange={(e) => setJourney(e.target.value)} placeholder="20 May 2025" className="h-10 rounded-lg" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Departure"><Input value={depart} onChange={(e) => setDepart(e.target.value)} placeholder="08:00 PM" className="h-10 rounded-lg" /></Field>
                <Field label="Arrival"><Input value={arrive} onChange={(e) => setArrive(e.target.value)} placeholder="05:30 AM" className="h-10 rounded-lg" /></Field>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bus & Seat</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bus Number"><Input value={bus} onChange={(e) => setBus(e.target.value)} placeholder="TS 09 AB 1234" className="h-10 rounded-lg" /></Field>
              <Field label="Bus Name">
                <Select value={busName} onValueChange={setBusName}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Volvo B11R">Volvo B11R</SelectItem>
                    <SelectItem value="Volvo B8R">Volvo B8R</SelectItem>
                    <SelectItem value="Scania Metrolink">Scania Metrolink</SelectItem>
                    <SelectItem value="Scania MultiAxle">Scania MultiAxle</SelectItem>
                    <SelectItem value="Benz Dreamz">Benz Dreamz</SelectItem>
                    <SelectItem value="Benz AC Sleeper">Benz AC Sleeper</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Seat No."><Input value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="L3" className="h-10 rounded-lg" /></Field>
              <Field label="Seat Type">
                <Select value={seatType} onValueChange={(v) => setSeatType(v as "Lower" | "Upper")}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lower">Lower</SelectItem>
                    <SelectItem value="Upper">Upper</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment & Source</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Booking Source">
                <Select value={source} onValueChange={(v) => setSource(v as BookingSource)}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Amount (₹) *"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1250" className="h-10 rounded-lg" /></Field>
              <Field label="Payment">
                <Select value={payment} onValueChange={(v) => setPayment(v as PaymentStatus)}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {existingRoutes.length > 0 && (
              <p className="text-xs text-muted-foreground">Tip: existing routes include {existingRoutes.slice(0, 3).join(", ")}.</p>
            )}
          </section>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="h-10 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              <CheckCircle2 className="size-4" />
              Create Booking
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border/70 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function QRPlaceholder() {
  // simple deterministic 9x9 grid as a stylized QR
  const cells = Array.from({ length: 81 }, (_, i) => (i * 37) % 7 < 3);
  return (
    <div className="size-32 grid grid-cols-9 gap-px bg-white p-2 rounded-lg border border-border">
      {cells.map((on, i) => (
        <div key={i} className={cn("aspect-square", on ? "bg-foreground" : "bg-white")} />
      ))}
    </div>
  );
}
