import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BusFront,
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
import { cn } from "@/lib/utils";

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

type Status = "Active" | "Inactive" | "Maintenance";

interface RouteRow {
  id: string;
  src: string;
  dst: string;
  busNo: string;
  busName: string;
  busColor: string;
  busType: "Sleeper" | "Seater";
  dep: string;
  arr: string;
  boarding: string[];
  fare: number;
  status: Status;
}

const initialRows: RouteRow[] = [
  {
    id: "RTE-1001",
    src: "Hyderabad",
    dst: "Bangalore",
    busNo: "TS 09 AB 1234",
    busName: "Volvo B11R",
    busColor: "text-emerald-500",
    busType: "Sleeper",
    dep: "08:00 PM",
    arr: "05:30 AM",
    boarding: ["Ameerpet", "LB Nagar", "Kothapet", "Mehdipatnam", "Shamshabad"],
    fare: 1200,
    status: "Active",
  },
  {
    id: "RTE-1002",
    src: "Hyderabad",
    dst: "Vijayawada",
    busNo: "TS 09 CD 5678",
    busName: "Scania Metrolink",
    busColor: "text-slate-700",
    busType: "Seater",
    dep: "06:00 AM",
    arr: "11:15 AM",
    boarding: ["Ameerpet", "Miyapur", "JNTU", "Kukatpally", "Uppal", "LB Nagar"],
    fare: 850,
    status: "Active",
  },
  {
    id: "RTE-1003",
    src: "Bangalore",
    dst: "Chennai",
    busNo: "KA 01 AB 2222",
    busName: "Volvo B11R",
    busColor: "text-emerald-500",
    busType: "Sleeper",
    dep: "07:00 PM",
    arr: "02:15 AM",
    boarding: ["Silk Board", "Marathahalli", "Hosur Road", "Electronic City", "Madiwala"],
    fare: 1100,
    status: "Active",
  },
  {
    id: "RTE-1004",
    src: "Hyderabad",
    dst: "Chennai",
    busNo: "TS 09 EF 9101",
    busName: "Benz Dreamz",
    busColor: "text-amber-500",
    busType: "Sleeper",
    dep: "09:00 PM",
    arr: "07:30 AM",
    boarding: ["Ameerpet", "LB Nagar", "Sagar Road", "Dilsukhnagar", "Hayathnagar", "Uppal", "Kothapet"],
    fare: 1000,
    status: "Active",
  },
  {
    id: "RTE-1005",
    src: "Visakhapatnam",
    dst: "Hyderabad",
    busNo: "AP 39 GH 1122",
    busName: "Volvo B8R",
    busColor: "text-sky-600",
    busType: "Seater",
    dep: "08:30 PM",
    arr: "07:50 AM",
    boarding: ["MVP Colony", "Maddilapalem", "Anakapalle", "Tuni", "Rajahmundry", "Vijayawada"],
    fare: 950,
    status: "Active",
  },
  {
    id: "RTE-1006",
    src: "Hyderabad",
    dst: "Tirupati",
    busNo: "TS 09 IJ 3344",
    busName: "Benz AC Sleeper",
    busColor: "text-rose-500",
    busType: "Sleeper",
    dep: "06:30 AM",
    arr: "12:45 PM",
    boarding: ["Ameerpet", "Kukatpally", "Yadadri", "Kurnool", "Chittoor"],
    fare: 900,
    status: "Inactive",
  },
];

const statusStyles: Record<Status, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  Maintenance:
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400",
  Inactive:
    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400",
};

const statusDot: Record<Status, string> = {
  Active: "bg-emerald-500",
  Maintenance: "bg-orange-500",
  Inactive: "bg-rose-500",
};

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
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
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchQ && matchSrc && matchDst && matchType && matchStatus;
    });
  }, [rows, query, srcFilter, dstFilter, typeFilter, statusFilter]);

  const handleSave = (row: RouteRow) => {
    setRows((prev) => [row, ...prev]);
    setOpenAdd(false);
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
                <SelectItem value="Sleeper">Sleeper</SelectItem>
                <SelectItem value="Seater">Seater</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[140px] rounded-xl bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="px-6 py-3.5 font-semibold">Route ID</th>
                <th className="px-6 py-3.5 font-semibold">Route</th>
                <th className="px-6 py-3.5 font-semibold">Assigned Bus</th>
                <th className="px-6 py-3.5 font-semibold">Departure</th>
                <th className="px-6 py-3.5 font-semibold">Arrival</th>
                <th className="px-6 py-3.5 font-semibold">Boarding Points</th>
                <th className="px-6 py-3.5 font-semibold">Fare</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 9 }).map((__, j) => (
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
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{r.dep}</td>
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{r.arr}</td>
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
                        <span className="font-semibold text-foreground">
                          ₹{r.fare.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            aria-label="View"
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-slate-100 hover:text-slate-700 transition-all hover:scale-110"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            aria-label="Edit"
                            className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-brand/10 hover:text-brand transition-all hover:scale-110"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            aria-label="Delete"
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
                  <td colSpan={9} className="px-6 py-16 text-center text-muted-foreground">
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
              handleSave({
                id: `RTE-${1000 + rows.length + 1}`,
                src,
                dst,
                busNo: String(fd.get("bus") || "TBD"),
                busName: "Assigned Bus",
                busColor: "text-brand",
                busType: "Sleeper",
                dep: String(fd.get("dep") || "—"),
                arr: String(fd.get("arr") || "—"),
                boarding: String(fd.get("boarding") || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                fare: Number(fd.get("fare") || 0),
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
              <Input
                name="boarding"
                placeholder="Add boarding points"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Add multiple points separated by comma
              </p>
            </Field>

            <Field label="Dropping Points" required>
              <Input
                name="dropping"
                placeholder="Add dropping points"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Add multiple points separated by comma
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Departure Time" required>
                <Input name="dep" type="time" className="h-11 rounded-xl" />
              </Field>
              <Field label="Arrival Time" required>
                <Input name="arr" type="time" className="h-11 rounded-xl" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Distance (km)">
                <Input name="distance" placeholder="e.g. 569" className="h-11 rounded-xl" />
              </Field>
              <Field label="Estimated Duration">
                <Input name="duration" placeholder="e.g. 9h 30m" className="h-11 rounded-xl" />
              </Field>
            </div>

            <Field label="Assign Bus" required>
              <Select name="bus">
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {initialRows.map((r) => (
                    <SelectItem key={r.busNo} value={r.busNo}>
                      {r.busNo} · {r.busName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Ticket Fare (₹)" required>
              <Input
                name="fare"
                type="number"
                min={0}
                placeholder="e.g. 1200"
                className="h-11 rounded-xl"
              />
            </Field>

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
