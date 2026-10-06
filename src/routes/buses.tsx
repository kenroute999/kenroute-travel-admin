import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Bus,
  BusFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  XCircle,
  Armchair,
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

export const Route = createFileRoute("/buses")({
  head: () => ({
    meta: [
      { title: "Bus Management — KenRoute" },
      {
        name: "description",
        content: "Manage your bus fleet: types, capacity, operator and status.",
      },
    ],
  }),
  component: BusesPage,
});

type BusType = "Sleeper (2+1)" | "Seater (2+2)" | "Seater/Sleeper (2+1)";
type ACType = "AC" | "Non-AC";
type Status = "Active" | "Maintenance" | "Inactive";

interface BusRow {
  no: string;
  name: string;
  type: BusType;
  ac: ACType;
  seats: number;
  status: Status;
  color: string;
}

const initialRows: BusRow[] = [
  { no: "TS 09 AB 1234", name: "KenRoute Volvo", type: "Sleeper (2+1)", ac: "AC", seats: 40, status: "Active", color: "text-emerald-500" },
  { no: "TS 09 CD 5678", name: "KenRoute Scania", type: "Seater (2+2)", ac: "AC", seats: 45, status: "Active", color: "text-slate-700" },
  { no: "TS 09 EF 9101", name: "KenRoute Benz", type: "Sleeper (2+1)", ac: "Non-AC", seats: 36, status: "Maintenance", color: "text-amber-500" },
  { no: "TS 09 GH 1122", name: "KenRoute Starz", type: "Seater/Sleeper (2+1)", ac: "AC", seats: 50, status: "Active", color: "text-sky-600" },
  { no: "TS 09 IJ 3344", name: "KenRoute Deluxe", type: "Seater (2+2)", ac: "AC", seats: 40, status: "Inactive", color: "text-rose-500" },
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

const typeStyles: Record<BusType, string> = {
  "Sleeper (2+1)": "bg-blue-50 text-blue-700 border border-blue-100",
  "Seater (2+2)": "bg-violet-50 text-violet-700 border border-violet-100",
  "Seater/Sleeper (2+1)": "bg-teal-50 text-teal-700 border border-teal-100",
};

const acStyles: Record<ACType, string> = {
  AC: "bg-sky-50 text-sky-700 border border-sky-100",
  "Non-AC": "bg-amber-50 text-amber-700 border border-amber-100",
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

function TypeBadge({ type }: { type: BusType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium",
        typeStyles[type],
      )}
    >
      {type}
    </span>
  );
}

function AcBadge({ ac }: { ac: ACType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium",
        acStyles[ac],
      )}
    >
      {ac}
    </span>
  );
}

function BusesPage() {
  const [rows, setRows] = useState<BusRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.trim().toLowerCase();
      const matchesQ =
        !q ||
        r.no.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q);
      const matchesT = typeFilter === "all" || r.type === typeFilter;
      const matchesS = statusFilter === "all" || r.status === statusFilter;
      return matchesQ && matchesT && matchesS;
    });
  }, [rows, query, typeFilter, statusFilter]);

  const handleSave = (row: BusRow) => {
    setRows((prev) => [row, ...prev]);
    setOpenAdd(false);
  };

  return (
    <>
      <PageHeader
        title="Bus Management"
        breadcrumb="Buses"
        actions={
          <Button
            onClick={() => setOpenAdd(true)}
            className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-10 px-4 rounded-xl"
          >
            <Plus className="size-4" />
            Add Bus
          </Button>
        }
      />

      {/* Table card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buses by number or name…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground hidden sm:block" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
                  <SelectValue placeholder="Bus Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Sleeper (2+1)">Sleeper (2+1)</SelectItem>
                  <SelectItem value="Seater (2+2)">Seater (2+2)</SelectItem>
                  <SelectItem value="Seater/Sleeper (2+1)">
                    Seater/Sleeper (2+1)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[150px] rounded-xl bg-background">
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
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="px-6 py-3.5 font-semibold">Bus Number</th>
                <th className="px-6 py-3.5 font-semibold">Type</th>
                <th className="px-6 py-3.5 font-semibold">AC</th>
                <th className="px-6 py-3.5 font-semibold">Seats</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <Skeleton className="h-5 w-full max-w-[140px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((r) => (
                    <tr
                      key={r.no}
                      className="border-t border-border transition-colors hover:bg-brand/[0.04] group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center shrink-0 group-hover:bg-brand/10 group-hover:border-brand/30 transition-colors">
                            <BusFront className={cn("size-5", r.color)} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground">{r.no}</div>
                            <div className="text-xs text-muted-foreground">{r.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <TypeBadge type={r.type} />
                      </td>
                      <td className="px-6 py-4">
                        <AcBadge ac={r.ac} />
                      </td>
                      <td className="px-6 py-4 font-medium">{r.seats}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
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
                  <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                    <Bus className="size-10 mx-auto mb-2 opacity-40" />
                    No buses match your filters.
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
            <span className="font-medium text-foreground">25</span> results
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
        <StatCard label="Total Buses" value="156" delta="12 this month" icon={Bus} tone="brand" />
        <StatCard label="Active Buses" value="122" delta="78% of total" icon={CheckCircle2} tone="brand" />
        <StatCard label="Maintenance" value="18" delta="12% of total" icon={Wrench} tone="warning" />
        <StatCard label="Inactive Buses" value="16" delta="10% of total" icon={XCircle} tone="danger" />
        <StatCard label="Total Seats" value="6,156" delta="256 this month" icon={Armchair} tone="info" />
      </div>

      {/* Add Bus slide-over */}
      <Sheet open={openAdd} onOpenChange={setOpenAdd}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-xl">Add New Bus</SheetTitle>
            <SheetDescription>Enter bus details to add to your fleet</SheetDescription>
          </SheetHeader>

          <form
            className="flex-1 overflow-y-auto p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave({
                no: String(fd.get("no") || ""),
                name: String(fd.get("name") || ""),
                type: (fd.get("type") as BusType) || "Sleeper (2+1)",
                ac: (fd.get("ac") as ACType) || "AC",
                seats: Number(fd.get("seats") || 0),
                status: (fd.get("status") as Status) || "Active",
                color: "text-brand",
              });
            }}
            id="add-bus-form"
          >
            <Field label="Bus Number" required>
              <Input name="no" placeholder="Enter bus number" required className="h-11 rounded-xl" />
            </Field>
            <Field label="Bus Name" required>
              <Input name="name" placeholder="Enter bus name" required className="h-11 rounded-xl" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Bus Type" required>
                <Select name="type" defaultValue="Sleeper (2+1)">
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sleeper (2+1)">Sleeper (2+1)</SelectItem>
                    <SelectItem value="Seater (2+2)">Seater (2+2)</SelectItem>
                    <SelectItem value="Seater/Sleeper (2+1)">
                      Seater/Sleeper (2+1)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="AC Type" required>
                <Select name="ac" defaultValue="AC">
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="Non-AC">Non-AC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Total Seats" required>
              <Input
                name="seats"
                type="number"
                min={1}
                placeholder="Enter total seats"
                required
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Status" required>
              <Select name="status" defaultValue="Active">
                <SelectTrigger className="h-11 rounded-xl border-brand/40 focus:border-brand"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
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
              form="add-bus-form"
              className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="size-4" />
              Save Bus
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
