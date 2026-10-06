import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowRight,
  BusFront,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Route as RouteIcon,
  Save,
  Search,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  busFleet,
  busByNo,
  fareFieldsForType,
  type BusType,
  type FareKey,
} from "@/lib/buses";

export const Route = createFileRoute("/routes")({
  head: () => ({
    meta: [
      { title: "Route Management — KenRoute" },
      {
        name: "description",
        content:
          "Manage travel routes, sources, destinations, schedules, fares and assigned buses.",
      },
    ],
  }),
  component: RoutesPage,
});

// The owner sets Active, Maintenance or Inactive. "In Transit" and "Completed"
// are never set by hand: an Active trip moves through them by the clock.
type Status = "Active" | "In Transit" | "Completed" | "Maintenance" | "Inactive";
type ManualStatus = Extract<Status, "Active" | "Maintenance" | "Inactive">;
const STATUSES: Status[] = ["Active", "In Transit", "Completed", "Maintenance", "Inactive"];

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
};

const formatDay = (iso: string) => (iso ? format(parseDay(iso), "EEE, dd MMM") : "—");

const formatTime = (t: string) => {
  if (!t) return "—";
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  const h = Number(m[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${m[2]} ${suffix}`;
};

const isNextDay = (r: RouteRow) =>
  Boolean(r.depDate && r.arrDate) && r.arrDate > r.depDate;

interface RouteRow {
  id: string;
  src: string;
  dst: string;
  busNo: string;
  busName: string;
  busColor: string;
  busType: BusType;
  dep: string;
  depDate: string;
  arr: string;
  arrDate: string;
  boarding: string[];
  dropping: string[];
  fares: Partial<Record<FareKey, number>>;
  status: Status;
}

function collect(fd: FormData, name: string): string[] {
  return fd
    .getAll(name)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function defaultFares(type: BusType): Partial<Record<FareKey, number>> {
  const base: Record<FareKey, number> = { seater: 850, singleBed: 1400, doubleBed: 900 };
  return Object.fromEntries(
    fareFieldsForType[type].map((f) => [f.key, base[f.key]]),
  ) as Partial<Record<FareKey, number>>;
}

// Sample rows are dated relative to today so every status is always on show.
const sampleMoment = (days: number, hours = 0) =>
  new Date(Date.now() + days * 86_400_000 + hours * 3_600_000);
const sampleDay = (days: number, hours = 0) => format(sampleMoment(days, hours), "yyyy-MM-dd");
const sampleClock = (hours: number) => format(sampleMoment(0, hours), "HH:mm");

const initialRows: RouteRow[] = [
  {
    id: "RTE-1001",
    src: "Hyderabad",
    dst: "Bangalore",
    busNo: "TS 09 AB 1234",
    busName: "Volvo B11R",
    busColor: "text-emerald-500",
    busType: "Sleeper (2+1)",
    dep: "08:00 PM",
    depDate: "2026-10-06",
    arr: "05:30 AM",
    arrDate: "2026-10-07",
    boarding: ["Ameerpet", "LB Nagar", "Kothapet", "Mehdipatnam", "Shamshabad"],
    dropping: ["Yelahanka", "Hebbal", "Majestic", "Shivajinagar", "Silk Board", "Electronic City", "Bangalore"],
    fares: { singleBed: 1450, doubleBed: 950 },
    status: "Active",
  },
  {
    id: "RTE-1002",
    src: "Hyderabad",
    dst: "Vijayawada",
    busNo: "TS 09 CD 5678",
    busName: "Scania Metrolink",
    busColor: "text-slate-700",
    busType: "Seater (2+2)",
    dep: "06:00 AM",
    depDate: sampleDay(-1),
    arr: "11:15 AM",
    arrDate: sampleDay(-1),
    boarding: ["Ameerpet", "Miyapur", "JNTU", "Kukatpally", "Uppal", "LB Nagar"],
    dropping: ["Suryapet", "Khammam", "Gollapudi", "Benz Circle", "Governorpet", "Vijayawada"],
    fares: { seater: 850 },
    status: "Active",
  },
  {
id: "RTE-1003",
    src: "Bangalore",
    dst: "Chennai",
    busNo: "TS 09 EF 9101",
    busName: "Volvo B11R",
    busColor: "text-amber-500",
    busType: "Sleeper (2+1)",
    dep: "07:00 PM",
    depDate: "2026-10-08",
    arr: "02:15 AM",
    arrDate: "2026-10-09",
    boarding: ["Silk Board", "Marathahalli", "Hosur Road", "Electronic City", "Madiwala"],
    dropping: ["Hosur", "Krishnagiri", "Vellore", "Sriperumbudur", "Tambaram", "Koyambedu", "Chennai"],
    fares: { singleBed: 1350, doubleBed: 900 },
    status: "Maintenance",
  },
  {
    id: "RTE-1004",
    src: "Hyderabad",
    dst: "Chennai",
    busNo: "TS 09 GH 1122",
    busName: "Benz Dreamz",
    busColor: "text-sky-600",
    busType: "Seater/Sleeper (2+1)",
    dep: sampleClock(-2),
    depDate: sampleDay(0, -2),
    arr: sampleClock(8),
    arrDate: sampleDay(0, 8),
    boarding: ["Ameerpet", "LB Nagar", "Sagar Road", "Dilsukhnagar", "Hayathnagar", "Uppal", "Kothapet"],
    dropping: ["Ongole", "Nellore", "Gudur", "Sriperumbudur", "Tambaram", "Koyambedu", "Chennai"],
    fares: { seater: 900, singleBed: 1400, doubleBed: 950 },
    status: "Active",
  },
  {
    id: "RTE-1005",
    src: "Visakhapatnam",
    dst: "Hyderabad",
    busNo: "TS 09 IJ 3344",
    busName: "Volvo B8R",
    busColor: "text-rose-500",
    busType: "Seater (2+2)",
    dep: "08:30 PM",
    depDate: "2026-10-07",
    arr: "07:50 AM",
    arrDate: "2026-10-08",
    boarding: ["MVP Colony", "Maddilapalem", "Anakapalle", "Tuni", "Rajahmundry", "Vijayawada"],
    dropping: ["Rajahmundry", "Eluru", "Vijayawada", "Khammam", "Suryapet", "LB Nagar", "Ameerpet"],
    fares: { seater: 950 },
    status: "Active",
  },
  {
    id: "RTE-1006",
    src: "Hyderabad",
    dst: "Tirupati",
    busNo: "TS 09 GH 1122",
    busName: "Benz AC Sleeper",
    busColor: "text-sky-600",
    busType: "Seater/Sleeper (2+1)",
    dep: "06:30 AM",
    depDate: "2026-10-09",
    arr: "12:45 PM",
    arrDate: "2026-10-09",
    boarding: ["Ameerpet", "Kukatpally", "LB Nagar", "Dilsukhnagar", "Kothapet"],
    dropping: ["Kurnool", "Gooty", "Anantapur", "Madanapalle", "Renigunta", "Tirupati"],
    fares: { seater: 800, singleBed: 1250, doubleBed: 850 },
    status: "Inactive",
  },
];

const statusStyles: Record<Status, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  "In Transit":
    "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400",
  Completed:
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400",
  Maintenance:
    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400",
  Inactive:
    "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400",
};

const statusDot: Record<Status, string> = {
  Active: "bg-emerald-500",
  "In Transit": "bg-sky-500 animate-pulse",
  Completed: "bg-violet-500",
  Maintenance: "bg-rose-500",
  Inactive: "bg-slate-400",
};

/** "08:00 PM" or "20:00" as "20:00"; "" when it is not a time. */
function to24h(time: string): string {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return "";
  let hour = Number(m[1]);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${m[2]}`;
}

function moment(dateIso: string, time: string): Date | null {
  const clock = to24h(time);
  if (!dateIso || !clock) return null;
  const at = new Date(`${dateIso}T${clock}:00`);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** What the trip is doing right now. Maintenance and Inactive stay as the owner set them. */
function liveStatus(r: RouteRow, now: Date): Status {
  if (r.status !== "Active") return r.status;
  const departs = moment(r.depDate, r.dep);
  const arrives = moment(r.arrDate, r.arr);
  if (!departs || !arrives) return "Active";
  if (now >= arrives) return "Completed";
  if (now >= departs) return "In Transit";
  return "Active";
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        statusStyles[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", statusDot[status])} />
      {status}
    </span>
  );
}

function RoutePath({ src, dst }: { src: string; dst: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 text-brand shrink-0" />
          <span className="font-medium text-foreground truncate">{src}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 text-rose-500 shrink-0" />
          <span className="font-medium text-foreground truncate">{dst}</span>
        </div>
      </div>
    </div>
  );
}

function RoutesPage() {
  const [rows, setRows] = useState<RouteRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [srcFilter, setSrcFilter] = useState("all");
  const [dstFilter, setDstFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [assignedBusNo, setAssignedBusNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<RouteRow | null>(null);
  const [editing, setEditing] = useState<RouteRow | null>(null);
  const [editBusNo, setEditBusNo] = useState("");
  // Statuses follow the clock, so re-check once a minute.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const cities = useMemo(() => {
    const all = new Set<string>();
    rows.forEach((r) => {
      all.add(r.src);
      all.add(r.dst);
    });
    return Array.from(all);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.src.toLowerCase().includes(q) ||
        r.dst.toLowerCase().includes(q) ||
        r.busNo.toLowerCase().includes(q) ||
        r.busName.toLowerCase().includes(q);
      const matchSrc = srcFilter === "all" || r.src === srcFilter;
      const matchDst = dstFilter === "all" || r.dst === dstFilter;
      const matchType = typeFilter === "all" || r.busType === typeFilter;
      const matchStatus = statusFilter === "all" || liveStatus(r, now) === statusFilter;
      return matchQ && matchSrc && matchDst && matchType && matchStatus;
    });
  }, [rows, query, srcFilter, dstFilter, typeFilter, statusFilter, now]);

  const handleSave = (row: RouteRow) => {
    setRows((prev) => [row, ...prev]);
    setOpenAdd(false);
  };

  const openEdit = (row: RouteRow) => {
    setEditing(row);
    setEditBusNo(row.busNo);
  };

  const handleDelete = (row: RouteRow) => {
    if (!window.confirm(`Delete route ${row.id} (${row.src} → ${row.dst})?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success(`Route ${row.id} deleted`);
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const src = String(fd.get("src")).trim();
    const dst = String(fd.get("dst")).trim();
    if (src.toLowerCase() === dst.toLowerCase()) {
      toast.error("Source and destination must be different");
      return;
    }
    const depDate = String(fd.get("depDate"));
    const dep = String(fd.get("dep"));
    const arrDate = String(fd.get("arrDate"));
    const arr = String(fd.get("arr"));
    const departs = moment(depDate, dep);
    const arrives = moment(arrDate, arr);
    if (!departs || !arrives || arrives <= departs) {
      toast.error("Arrival must be after departure");
      return;
    }
    const bus = busByNo(editBusNo);
    const busType = bus?.type ?? editing.busType;
    const fares: Partial<Record<FareKey, number>> = {};
    for (const f of fareFieldsForType[busType]) {
      const v = Number(fd.get(`fare_${f.key}`) || 0);
      if (v > 0) fares[f.key] = v;
    }
    const stops = (name: string) =>
      String(fd.get(name))
        .split(",")
        .map((stop) => stop.trim())
        .filter(Boolean);

    const updated: RouteRow = {
      ...editing,
      src,
      dst,
      busNo: bus?.no ?? editing.busNo,
      busName: bus?.name ?? editing.busName,
      busColor: bus?.color ?? editing.busColor,
      busType,
      depDate,
      dep,
      arrDate,
      arr,
      boarding: stops("boarding"),
      dropping: stops("dropping"),
      fares,
      status: (fd.get("status") as ManualStatus) || "Active",
    };
    setRows((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
    setEditing(null);
    toast.success(`Route ${updated.id} updated`);
  };

  return (
    <>
      <PageHeader
        title="Route Management"
        breadcrumb="Routes"
        actions={
          <Button
            onClick={() => setOpenAdd(true)}
            className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-10 px-4 rounded-xl"
          >
            <Plus className="size-4" />
            Add Route
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Routes" value="156" delta="12 this month" icon={RouteIcon} tone="brand" />
        <StatCard label="Active Routes" value="142" delta="18 this month" icon={Navigation} tone="info" />
        <StatCard label="Today Trips" value="48" delta="8 today" icon={BusFront} tone="warning" />
        <StatCard label="Top Route" value="Hyd → Bang" delta="32 trips · ₹3,24,560" icon={Trophy} tone="navy" />
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
              placeholder="Search by route, city or bus…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="size-4 text-muted-foreground hidden sm:block" />
            <Select value={srcFilter} onValueChange={setSrcFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dstFilter} onValueChange={setDstFilter}>
              <SelectTrigger className="h-11 w-[160px] rounded-xl bg-background">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Destinations</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 w-[140px] rounded-xl bg-background">
                <SelectValue placeholder="Bus Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.keys(fareFieldsForType).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[140px] rounded-xl bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1250px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="px-6 py-3.5 font-semibold">Route ID</th>
                <th className="px-6 py-3.5 font-semibold">Route</th>
                <th className="px-6 py-3.5 font-semibold">Assigned Bus</th>
                <th className="px-6 py-3.5 font-semibold">Departure</th>
                <th className="px-6 py-3.5 font-semibold">Arrival</th>
                <th className="px-6 py-3.5 font-semibold">Boarding Points</th>
                <th className="px-6 py-3.5 font-semibold">Dropping Points</th>
                <th className="px-6 py-3.5 font-semibold">Fare</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <Skeleton className="h-5 w-full max-w-[140px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-border transition-colors hover:bg-brand/[0.04] group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-1 rounded-md group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                          {r.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <RoutePath src={r.src} dst={r.dst} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center shrink-0 group-hover:bg-brand/10 group-hover:border-brand/30 transition-colors">
                            <BusFront className={cn("size-5", r.busColor)} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground">{r.busNo}</div>
                            <div className="text-xs text-muted-foreground">{r.busName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                        {formatTime(r.dep)}
                        <div className="text-xs font-normal text-muted-foreground mt-0.5">
                          {formatDay(r.depDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                        {formatTime(r.arr)}
                        <div className="text-xs font-normal text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          {formatDay(r.arrDate)}
                          {isNextDay(r) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand">
                              +1 day
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <div className="text-foreground">
                            {r.boarding.slice(0, 2).join(", ")}
                          </div>
                          {r.boarding.length > 2 && (
                            <button className="text-brand hover:underline font-medium mt-0.5">
                              +{r.boarding.length - 2} more
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <div className="text-foreground">
                            {r.dropping.slice(0, 2).join(", ")}
                          </div>
                          {r.dropping.length > 2 && (
                            <button className="text-brand hover:underline font-medium mt-0.5">
                              +{r.dropping.length - 2} more
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {fareFieldsForType[r.busType].map((f) => (
                            <div
                              key={f.key}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="text-muted-foreground">{f.label}</span>
                              <span className="font-semibold text-foreground">
                                ₹{(r.fares[f.key] ?? 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={liveStatus(r, now)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            aria-label="View"
                            onClick={() => setViewing(r)}
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-slate-100 hover:text-slate-700 transition-all hover:scale-110"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            aria-label="Edit"
                            onClick={() => openEdit(r)}
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            aria-label="Delete"
                            onClick={() => handleDelete(r)}
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-110"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-muted-foreground">
                    <RouteIcon className="size-10 mx-auto mb-2 opacity-40" />
                    No routes match your filters.
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
            <span className="font-medium text-foreground">156</span> routes
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

      {/* View Route slide-over */}
      <Sheet open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          {viewing && (
            <>
              <SheetHeader className="p-6 border-b border-border">
                <SheetTitle className="text-xl">
                  {viewing.src} → {viewing.dst}
                </SheetTitle>
                <SheetDescription>Route {viewing.id}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={liveStatus(viewing, now)} />
                </div>
                <Detail label="Assigned Bus">
                  {viewing.busNo} · {viewing.busName}
                  <div className="text-xs text-muted-foreground">{viewing.busType}</div>
                </Detail>
                <Detail label="Departure">
                  {formatDay(viewing.depDate)}, {formatTime(viewing.dep)}
                </Detail>
                <Detail label="Arrival">
                  {formatDay(viewing.arrDate)}, {formatTime(viewing.arr)}
                </Detail>
                <Detail label="Boarding Points">{viewing.boarding.join(", ") || "—"}</Detail>
                <Detail label="Dropping Points">{viewing.dropping.join(", ") || "—"}</Detail>
                <Detail label="Fares">
                  {fareFieldsForType[viewing.busType].map((f) => (
                    <div key={f.key} className="flex justify-between gap-6">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-semibold">
                        ₹{(viewing.fares[f.key] ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </Detail>
              </div>
              <SheetFooter className="p-6 border-t border-border bg-muted/20 flex-row gap-3 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setViewing(null)}
                  className="h-11 rounded-xl px-5 flex-1 sm:flex-none"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    openEdit(viewing);
                    setViewing(null);
                  }}
                  className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none"
                >
                  <Pencil className="size-4" />
                  Edit Route
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Route slide-over */}
      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          {editing && (
            <>
              <SheetHeader className="p-6 border-b border-border">
                <SheetTitle className="text-xl">Edit Route</SheetTitle>
                <SheetDescription>
                  {editing.id} · {editing.src} → {editing.dst}
                </SheetDescription>
              </SheetHeader>
              <form
                key={editing.id}
                id="edit-route-form"
                className="flex-1 overflow-y-auto p-6 space-y-5"
                onSubmit={handleUpdate}
              >
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Source" required>
                    <Input name="src" defaultValue={editing.src} required className="h-11 rounded-xl" />
                  </Field>
                  <Field label="Destination" required>
                    <Input name="dst" defaultValue={editing.dst} required className="h-11 rounded-xl" />
                  </Field>
                </div>
                <Field label="Assigned Bus" required>
                  <Select value={editBusNo} onValueChange={setEditBusNo}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* A bus that is no longer in the fleet list stays selectable for this route. */}
                      {!busByNo(editing.busNo) && (
                        <SelectItem value={editing.busNo}>
                          {editing.busNo} — {editing.busName}
                        </SelectItem>
                      )}
                      {busFleet.map((b) => (
                        <SelectItem key={b.no} value={b.no}>
                          {b.no} — {b.name} ({b.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Departure Date" required>
                    <Input name="depDate" type="date" defaultValue={editing.depDate} required className="h-11 rounded-xl" />
                  </Field>
                  <Field label="Departure Time" required>
                    <Input name="dep" type="time" defaultValue={to24h(editing.dep)} required className="h-11 rounded-xl" />
                  </Field>
                  <Field label="Arrival Date" required>
                    <Input name="arrDate" type="date" defaultValue={editing.arrDate} required className="h-11 rounded-xl" />
                  </Field>
                  <Field label="Arrival Time" required>
                    <Input name="arr" type="time" defaultValue={to24h(editing.arr)} required className="h-11 rounded-xl" />
                  </Field>
                </div>
                <Field label="Boarding Points (comma separated)">
                  <Input name="boarding" defaultValue={editing.boarding.join(", ")} className="h-11 rounded-xl" />
                </Field>
                <Field label="Dropping Points (comma separated)">
                  <Input name="dropping" defaultValue={editing.dropping.join(", ")} className="h-11 rounded-xl" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  {fareFieldsForType[busByNo(editBusNo)?.type ?? editing.busType].map((f) => (
                    <Field key={f.key} label={`${f.label} Fare (₹)`} required>
                      <Input
                        name={`fare_${f.key}`}
                        type="number"
                        min={1}
                        step={1}
                        defaultValue={editing.fares[f.key]}
                        required
                        className="h-11 rounded-xl"
                      />
                    </Field>
                  ))}
                </div>
                <Field label="Status" required>
                  <Select name="status" defaultValue={editing.status}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    An Active route shows In Transit after departure and Completed after arrival by
                    itself.
                  </p>
                </Field>
              </form>
              <SheetFooter className="p-6 border-t border-border bg-muted/20 flex-row gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                  className="h-11 rounded-xl px-5 flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-route-form"
                  className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none"
                >
                  <Save className="size-4" />
                  Save Changes
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Route slide-over */}
      <Sheet open={openAdd} onOpenChange={setOpenAdd}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Navigation className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-xl">Add New Route</SheetTitle>
                <SheetDescription>Create a new travel route for your fleet</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form
            className="flex-1 overflow-y-auto p-6 space-y-5"
            id="add-route-form"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const src = String(fd.get("src") || "");
              const dst = String(fd.get("dst") || "");
              const busNo = String(fd.get("bus") || "TBD");
              const bus = busByNo(busNo);
              const busType = bus?.type ?? "Seater (2+2)";
              const fares: Partial<Record<FareKey, number>> = {};
              for (const f of fareFieldsForType[busType]) {
                const v = Number(fd.get(`fare_${f.key}`) || 0);
                if (v > 0) fares[f.key] = v;
              }
              handleSave({
                id: `RTE-${1000 + rows.length + 1}`,
                src,
                dst,
                busNo,
                busName: bus?.name ?? "Assigned Bus",
                busColor: bus?.color ?? "text-brand",
                busType,
                dep: String(fd.get("dep") || "—"),
                depDate: String(fd.get("depDate") || ""),
                arr: String(fd.get("arr") || "—"),
                arrDate: String(fd.get("arrDate") || ""),
                boarding: collect(fd, "boarding"),
                dropping: collect(fd, "dropping"),
                fares,
                status: (fd.get("status") as Status) || "Active",
              });
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Source City" required>
                <Select name="src">
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Destination City" required>
                <Select name="dst">
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Boarding Points" required>
              <PointsInput name="boarding" placeholder="e.g. Ameerpet" />
            </Field>

            <Field label="Dropping Points" required>
              <PointsInput name="dropping" placeholder="e.g. Gachibowli" />
            </Field>

            <DateTimeField label="Departure" dateName="depDate" timeName="dep" />
            <DateTimeField label="Arrival" dateName="arrDate" timeName="arr" />
            <p className="text-xs text-muted-foreground">
              For overnight journeys pick the arrival date on day 2 — it is marked
              with a +1 day badge in the table.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Distance (km)">
                <Input name="distance" placeholder="e.g. 569" className="h-11 rounded-xl" />
              </Field>
              <Field label="Estimated Duration">
                <Input name="duration" placeholder="e.g. 9h 30m" className="h-11 rounded-xl" />
              </Field>
            </div>

            <Field label="Assign Bus" required>
              <Select
                value={assignedBusNo}
                onValueChange={(v) => setAssignedBusNo(v)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {busFleet.map((b) => (
                    <SelectItem key={b.no} value={b.no}>
                      {b.no} · {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="bus" value={assignedBusNo} />
              {assignedBusNo && busByNo(assignedBusNo) && (
                <p className="text-xs text-brand mt-1.5">
                  {busByNo(assignedBusNo)!.type} ·{" "}
                  {busByNo(assignedBusNo)!.seats} seats
                </p>
              )}
            </Field>
            {assignedBusNo && busByNo(assignedBusNo) && (
              <FareSection type={busByNo(assignedBusNo)!.type} />
            )}
            {!assignedBusNo && (
              <Field label="Ticket Fare (₹)">
                <p className="text-sm text-muted-foreground">
                  Select an assigned bus above to configure the fares for its seat types.
                </p>
              </Field>
            )}

            <Field label="Route Status" required>
              <Select name="status" defaultValue="Active">
                <SelectTrigger className="h-11 rounded-xl border-brand/40 focus:border-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" /> Active
                    </span>
                  </SelectItem>
                  <SelectItem value="Maintenance">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-orange-500" /> Maintenance
                    </span>
                  </SelectItem>
                  <SelectItem value="Inactive">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500" /> Inactive
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </form>

          <SheetFooter className="p-6 border-t border-border bg-muted/20 flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenAdd(false)}
              className="h-11 rounded-xl px-5 flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-route-form"
              className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all"
            >
              <Save className="size-4" />
              Save Route
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FareSection({ type }: { type: BusType }) {
  const fields = fareFieldsForType[type];
  return (
    <Field label={`Ticket Fare (₹) — ${type}`} required>
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} required>
            <Input
              name={`fare_${f.key}`}
              type="number"
              min={0}
              placeholder={`e.g. ${f.key === "doubleBed" ? "900" : f.key === "singleBed" ? "1400" : "850"}`}
              className="h-11 rounded-xl"
            />
          </Field>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Fares are set per seat type of the assigned bus.
      </p>
    </Field>
  );
}

function DateTimeField({
  label,
  dateName,
  timeName,
}: {
  label: string;
  dateName: string;
  timeName: string;
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Field label={label} required>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl flex-1 justify-start font-normal border-border min-w-0"
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{format(date, "dd MMM yyyy")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0 pointer-events-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) setDate(d);
                setOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          name={timeName}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="h-11 rounded-xl w-[118px] shrink-0"
        />
      </div>
      <input type="hidden" name={dateName} value={format(date, "yyyy-MM-dd")} />
      <p className="text-xs text-muted-foreground">{format(date, "EEEE, dd MMMM")}</p>
    </Field>
  );
}

function PointsInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  const [points, setPoints] = useState<string[]>([""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const add = () => {
    setPoints((p) => [...p, ""]);
  };

  const remove = (i: number) => {
    setPoints((p) => (p.length === 1 ? [""] : p.filter((_, idx) => idx !== i)));
  };

  const focusNew = (i: number) => {
    requestAnimationFrame(() => refs.current[i]?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i === points.length - 1) add();
      focusNew(i + 1);
    }
    if (e.key === "Backspace" && points[i] === "" && points.length > 1) {
      e.preventDefault();
      remove(i);
      focusNew(i - 1);
    }
  };

  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            ref={(el) => {
              refs.current[i] = el;
            }}
            name={name}
            value={p}
            required
            onChange={(e) => {
              const v = e.target.value;
              setPoints((prev) =>
                prev.map((item, idx) => (idx === i ? v : item)),
              );
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
            placeholder={i === 0 ? placeholder : "Add another point"}
            className="h-11 rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Remove point"
            disabled={points.length === 1}
            onClick={() => remove(i)}
            className="size-11 shrink-0 rounded-xl border-border"
          >
            <X className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          add();
          focusNew(points.length);
        }}
        className="w-full h-10 rounded-xl border-dashed border-border text-muted-foreground hover:text-brand hover:border-brand/40"
      >
        <Plus className="size-4" />
        Add Point
      </Button>
      <p className="text-xs text-muted-foreground">
        Press Enter or the + button to add another point.
      </p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t border-border pt-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
