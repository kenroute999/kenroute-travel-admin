import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
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
  Building2,
  UserCog,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { errorMessage } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv";
import { NewBookingSheet } from "@/components/bookings/NewBookingSheet";
import {
  bookingsKey,
  cancelBooking,
  listBookings,
  ticketCode,
  type OwnerBooking,
} from "@/lib/api/bookings";
import { fleetKeys, listSchedules } from "@/lib/api/fleet";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — KenRoute" },
      {
        name: "description",
        content: "Premium booking management for KenRoute travel operations.",
      },
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
  /** Set by the conductor's app. A separate fact from the status; "-" once the ticket is cancelled. */
  boarded: "Boarded" | "Not boarded" | "-";
  /** "07 Oct, 05:31 PM" in India time; empty unless boarded. */
  boardedAt: string;
  boardedBy: string;
  initials: string;
  avatarTone: string;
  /** The booking in the database. */
  bookingId: string;
  /** Who sold it; empty for OTA bookings. */
  agent: string;
  /** What the ticket's QR code holds. */
  qr: string;
  /** Still cancellable: confirmed and the bus has not left. */
  cancellable: boolean;
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

const STATUS_FROM_API: Record<OwnerBooking["status"], BookingStatus> = {
  CREATED: "Pending",
  CONFIRMED: "Confirmed",
  BOARDED: "Completed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Cancelled",
};

const ID_PROOF_LABEL: Record<string, string> = {
  AADHAAR: "Aadhar Card",
  PAN: "PAN Card",
  DRIVING_LICENCE: "Driving License",
  VOTER_ID: "Voter ID",
  PASSPORT: "Passport",
};

function sourceOf(b: OwnerBooking): BookingSource {
  if (b.channel === "REDBUS") return "redBus";
  if (b.channel === "ABHIBUS") return "AbhiBus";
  return b.source === "COUNTER" ? "Counter" : "Agent";
}

/** A saved booking as one row of this screen. Times are shown in the browser's local time. */
function toRow(b: OwnerBooking): Booking {
  const departs = new Date(b.trip.departureAt);
  const arrives = new Date(b.trip.arrivalAt);
  const minutes = Math.round((arrives.getTime() - departs.getTime()) / 60_000);
  const name = b.passenger?.name ?? "—";
  const phone = b.passenger?.phone ?? "";
  const tone = [...b.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length;
  return {
    id: ticketCode(b.pnr, b.seatNumber),
    pnr: b.pnr,
    source: sourceOf(b),
    passenger: name,
    phone: phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : "—",
    gender: b.passenger?.gender === "FEMALE" ? "Female" : "Male",
    age: b.passenger?.age ?? 0,
    idProof: ID_PROOF_LABEL[b.passenger?.idProofType ?? ""] ?? "—",
    from: b.trip.route.origin,
    to: b.trip.route.destination,
    boarding: b.boardingPoint ?? b.trip.route.origin,
    dropping: b.droppingPoint ?? b.trip.route.destination,
    bus: b.trip.bus.registrationNo,
    busName: b.trip.bus.name ?? "",
    seat: b.seatNumber,
    seatType: b.deck === "UPPER" ? "Upper" : "Lower",
    journey: format(departs, "dd MMM yyyy"),
    depart: format(departs, "hh:mm a"),
    arrive: format(arrives, "hh:mm a"),
    duration: `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`,
    amount: Number(b.fare),
    payment: b.status === "REFUNDED" ? "Refunded" : "Paid",
    status: STATUS_FROM_API[b.status],
    boarded:
      b.status === "CANCELLED" || b.status === "REFUNDED"
        ? "-"
        : b.passenger?.boarded
          ? "Boarded"
          : "Not boarded",
    boardedAt: b.passenger?.boardedAt
      ? new Date(b.passenger.boardedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "",
    boardedBy: b.passenger?.boardedBy ?? "",
    initials: name
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    avatarTone: AVATAR_TONES[tone] ?? "bg-muted text-foreground",
    bookingId: b.id,
    agent: b.agent ? `${b.agent.name} (${b.agent.agentCode})` : "",
    qr: ticketCode(b.pnr, b.seatNumber),
    cancellable: (b.status === "CONFIRMED" || b.status === "CREATED") && departs > new Date(),
  };
}

const bookingStatusStyles: Record<BookingStatus, string> = {
  Confirmed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  Pending:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400",
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

const SOURCE_META: Record<
  BookingSource,
  { color: string; chip: string; icon: typeof Globe; tint: string }
> = {
  redBus: {
    color: "#e63946",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    icon: Globe,
    tint: "bg-rose-100 text-rose-600",
  },
  AbhiBus: {
    color: "#7c3aed",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    icon: Globe,
    tint: "bg-violet-100 text-violet-600",
  },
  Agent: {
    color: "#10b981",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: UserCog,
    tint: "bg-emerald-100 text-emerald-600",
  },
  Counter: {
    color: "#f59e0b",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    icon: Building2,
    tint: "bg-orange-100 text-orange-600",
  },
  Website: {
    color: "#3b82f6",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Globe,
    tint: "bg-sky-100 text-sky-600",
  },
};

const SOURCE_ORDER: BookingSource[] = ["redBus", "AbhiBus", "Agent", "Counter", "Website"];

function SourceBadge({ source }: { source: BookingSource }) {
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
        meta.chip,
      )}
    >
      <Icon className="size-3" />
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        bookingStatusStyles[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", bookingDot[status])} />
      {status}
    </span>
  );
}
function BoardedBadge({ row }: { row: Booking }) {
  if (row.boarded === "-") return <span className="text-muted-foreground">-</span>;
  const on = row.boarded === "Boarded";
  return (
    <div>
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
          on
            ? "bg-success/15 text-success border-success/25"
            : "bg-muted text-muted-foreground border-border",
        )}
      >
        {row.boarded}
      </span>
      {on && row.boardedAt && (
        <div className="mt-1 text-[11px] text-muted-foreground whitespace-nowrap">
          {row.boardedAt}
        </div>
      )}
    </div>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
        paymentStyles[status],
      )}
    >
      {status}
    </span>
  );
}

function BookingsPage() {
  const queryClient = useQueryClient();
  const bookingsQuery = useQuery({ queryKey: bookingsKey, queryFn: listBookings });
  const schedulesQuery = useQuery({ queryKey: fleetKeys.schedules, queryFn: listSchedules });
  const rows = useMemo(() => (bookingsQuery.data ?? []).map(toRow), [bookingsQuery.data]);
  const loading = bookingsQuery.isPending;
  const [booking, setBooking] = useState(false);
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [boardedFilter, setBoardedFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);

  const cancel = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      toast.success("Booking cancelled. The seat is back on sale.");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: fleetKeys.schedules });
      return queryClient.invalidateQueries({ queryKey: bookingsKey });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const handleCancel = (b: Booking) => {
    if (!b.cancellable) {
      toast.info("Only a confirmed ticket on a bus that has not left can be cancelled.");
      return;
    }
    if (
      window.confirm(
        `Cancel the booking for ${b.passenger}, seat ${b.seat}? This cannot be undone.`,
      )
    ) {
      cancel.mutate(b.bookingId);
    }
  };

  // The ticket lives in the side panel, so open it and print once it is on screen.
  // To keep a PDF, choose "Save as PDF" as the printer.
  const printTicket = (b: Booking) => {
    setSelected(b);
    window.setTimeout(() => window.print(), 200);
  };

  const routes = useMemo(() => Array.from(new Set(rows.map((r) => `${r.from} → ${r.to}`))), [rows]);
  const journeyDates = useMemo(() => Array.from(new Set(rows.map((r) => r.journey))), [rows]);

  // Money counts for tickets that stand: cancelled ones are left out.
  const standing = rows.filter((r) => r.status !== "Cancelled");
  const sourceTotals = Object.fromEntries(
    SOURCE_ORDER.map((source) => {
      const mine = standing.filter((r) => r.source === source);
      return [source, { count: mine.length, revenue: mine.reduce((sum, r) => sum + r.amount, 0) }];
    }),
  ) as Record<BookingSource, { count: number; revenue: number }>;
  const cancelledCount = rows.length - standing.length;
  // Seats sold out of seats offered, over the trips that are still to run.
  const upcoming = (schedulesQuery.data ?? []).filter(
    (t) => t.status === "SCHEDULED" && new Date(t.departureAt) > new Date(),
  );
  const seatsOffered = upcoming.reduce((sum, t) => sum + t._count.seats, 0);
  const seatsSold = (bookingsQuery.data ?? []).filter(
    (b) => b.status === "CONFIRMED" && new Date(b.trip.departureAt) > new Date(),
  ).length;
  const occupancy = seatsOffered === 0 ? 0 : (seatsSold / seatsOffered) * 100;

  const exportCsv = () =>
    downloadCsv(
      "kenroute-bookings.csv",
      [
        "Booking ID",
        "PNR",
        "Source",
        "Agent",
        "Passenger",
        "Mobile",
        "From",
        "To",
        "Boarding",
        "Dropping",
        "Bus",
        "Seat",
        "Journey",
        "Departure",
        "Amount",
        "Payment",
        "Status",
        "Boarded",
        "Boarded At",
        "Boarded By",
      ],
      filtered.map((r) => [
        r.id,
        r.pnr,
        r.source,
        r.agent,
        r.passenger,
        r.phone,
        r.from,
        r.to,
        r.boarding,
        r.dropping,
        r.bus,
        r.seat,
        r.journey,
        r.depart,
        r.amount,
        r.payment,
        r.status,
        r.boarded,
        r.boardedAt,
        r.boardedBy,
      ]),
    );

  const totalBookings = SOURCE_ORDER.reduce((s, k) => s + sourceTotals[k].count, 0);
  const totalRevenue = SOURCE_ORDER.reduce((s, k) => s + sourceTotals[k].revenue, 0);
  const pieData = SOURCE_ORDER.map((k) => ({
    name: k,
    value: sourceTotals[k].count,
    color: SOURCE_META[k].color,
  }));

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.trim().toLowerCase();
      const matchesQ =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.pnr.toLowerCase().includes(q) ||
        r.passenger.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q);
      const matchesR = routeFilter === "all" || `${r.from} → ${r.to}` === routeFilter;
      const matchesS = statusFilter === "all" || r.status === statusFilter;
      const matchesP = paymentFilter === "all" || r.payment === paymentFilter;
      const matchesB = boardedFilter === "all" || r.boarded === boardedFilter;
      const matchesSrc = sourceFilter === "all" || r.source === sourceFilter;
      const matchesD = dateFilter === "all" || r.journey === dateFilter;
      return matchesQ && matchesR && matchesS && matchesP && matchesB && matchesSrc && matchesD;
    });
  }, [
    rows,
    query,
    routeFilter,
    statusFilter,
    paymentFilter,
    boardedFilter,
    sourceFilter,
    dateFilter,
  ]);

  return (
    <>
      <PageHeader
        title="Bookings"
        breadcrumb="Bookings"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 rounded-xl" onClick={exportCsv}>
              <Download className="size-4" />
              Export
            </Button>
            <Button
              onClick={() => setBooking(true)}
              className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-10 px-4 rounded-xl"
            >
              <Plus className="size-4" />
              New Booking
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Bookings"
          value={rows.length.toLocaleString("en-IN")}
          delta="all channels"
          icon={Ticket}
          tone="brand"
        />
        <StatCard
          label="Confirmed Bookings"
          value={standing.length.toLocaleString("en-IN")}
          delta="not cancelled"
          icon={TicketCheck}
          tone="brand"
        />
        <StatCard
          label="Cancelled Bookings"
          value={cancelledCount.toLocaleString("en-IN")}
          delta="seats released"
          icon={TicketX}
          tone="danger"
        />
        <StatCard
          label="Revenue Generated"
          value={`₹${totalRevenue.toLocaleString("en-IN")}`}
          delta="from standing tickets"
          icon={Wallet}
          tone="navy"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${occupancy.toFixed(1)}%`}
          delta={`${seatsSold} of ${seatsOffered} upcoming seats`}
          icon={TrendingUp}
          tone="info"
        />
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
              <div
                key={src}
                className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0",
                      meta.tint,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{src} Bookings</p>
                    <p className="text-xl font-bold tracking-tight">
                      {data.count.toLocaleString()}
                    </p>
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
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n) => [`${v.toLocaleString()} bookings`, n]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <span className="text-lg font-bold tracking-tight">
                  {totalBookings.toLocaleString()}
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm min-w-0">
              {pieData.map((d) => {
                const pct = ((d.value / totalBookings) * 100).toFixed(1);
                return (
                  <li key={d.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2.5 rounded-sm shrink-0"
                        style={{ background: d.color }}
                      />
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
                    <span
                      className={cn(
                        "size-7 rounded-md flex items-center justify-center shrink-0",
                        meta.tint,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="truncate font-medium">{src}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">
                      ₹{rev.toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
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
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="h-11 w-[170px] rounded-xl bg-background">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
                <SelectValue placeholder="Journey Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {journeyDates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[140px] rounded-xl bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={boardedFilter} onValueChange={setBoardedFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
                <SelectValue placeholder="Boarded" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boarding</SelectItem>
                <SelectItem value="Boarded">Boarded</SelectItem>
                <SelectItem value="Not boarded">Not boarded</SelectItem>
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
                <th className="px-5 py-3.5 font-semibold">Boarding Point</th>
                <th className="px-5 py-3.5 font-semibold">Seat</th>
                <th className="px-5 py-3.5 font-semibold">Journey</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Payment</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Boarded</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 13 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <Skeleton className="h-5 w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-border transition-colors hover:bg-brand/[0.04] group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{r.id}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          PNR {r.pnr.slice(-10)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <SourceBadge source={r.source} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "size-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0",
                              r.avatarTone,
                            )}
                          >
                            {r.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{r.passenger}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {r.gender} • {r.age}y
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {r.phone}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{r.from}</span>
                          <ArrowRight className="size-3.5 text-brand" />
                          <span>{r.to}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.bus} • {r.busName}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="size-3.5 text-brand" />
                          {r.boarding}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          → {r.dropping}
                        </div>
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
                      <td className="px-5 py-4">
                        <PaymentBadge status={r.payment} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-4">
                        <BoardedBadge row={r} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelected(r)}
                            aria-label="View"
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => printTicket(r)}
                            aria-label="Download"
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sky-50 hover:text-sky-600 transition-all hover:scale-110"
                          >
                            <Download className="size-4" />
                          </button>
                          <button
                            onClick={() => handleCancel(r)}
                            disabled={!r.cancellable || cancel.isPending}
                            aria-label="Cancel"
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-110 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center text-muted-foreground">
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
            <span className="font-medium text-foreground">{rows.length}</span> bookings
          </p>
          <div className="flex items-center gap-1">
            <button className="size-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                className={cn(
                  "size-9 rounded-lg text-sm font-medium transition-all",
                  p === 1
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "border border-border hover:bg-muted text-foreground",
                )}
              >
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
            <div className="print-area flex-1 overflow-y-auto p-5 space-y-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <StatusBadge status={selected.status} />
                  <SourceBadge source={selected.source} />
                </div>
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
                      <div className="font-bold text-brand">
                        ₹{selected.amount.toLocaleString()}
                      </div>
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
                  {selected.boarded !== "-" && (
                    <Row
                      label="Boarding"
                      value={
                        selected.boarded === "Boarded"
                          ? `Boarded at ${selected.boardedAt || "time not recorded"}${selected.boardedBy ? ` by ${selected.boardedBy}` : ""}`
                          : "Not boarded"
                      }
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Boarding Point</div>
                  <div className="font-medium">
                    {selected.boarding}, {selected.from}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-medium">{selected.depart}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dropping Point</div>
                  <div className="font-medium">
                    {selected.dropping}, {selected.to}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-medium">{selected.arrive}</div>
                </div>
              </div>

              {/* QR */}
              <div className="flex flex-col items-center pt-2">
                <div className="rounded-lg border border-border bg-white p-2">
                  <QRCodeSVG value={selected.qr} size={128} level="M" />
                </div>
                <div className="font-mono text-xs font-semibold mt-2">{selected.qr}</div>
                <div className="text-xs text-muted-foreground">Scan at boarding</div>
                {selected.agent && (
                  <div className="text-xs text-muted-foreground mt-1">Sold by {selected.agent}</div>
                )}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-border bg-muted/20 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              title="Choose 'Save as PDF' in the print dialog"
              onClick={() => window.print()}
            >
              <Download className="size-4" />
              Download Ticket
            </Button>
            <Button
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              disabled={!selected?.cancellable || cancel.isPending}
              onClick={() => selected && handleCancel(selected)}
            >
              <X className="size-4" />
              Cancel Booking
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <NewBookingSheet open={booking} onOpenChange={setBooking} />
    </>
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
