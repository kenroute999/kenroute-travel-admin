import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Armchair,
  Ban,
  CheckCircle2,
  CircleUser,
  LayoutGrid,
  Lock,
  Maximize2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  User,
  X,
  ZoomIn,
  ZoomOut,
  DoorOpen,
  Bus as BusIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/seat-layouts")({
  head: () => ({
    meta: [
      { title: "Seat Layout Management — KenRoute" },
      {
        name: "description",
        content:
          "Configure and manage bus seat layouts, statuses, and pricing across your fleet.",
      },
    ],
  }),
  component: SeatLayoutsPage,
});

// ---------- Types ----------
type SeatStatus = "available" | "booked" | "female" | "blocked";
type SeatKind = "sleeper" | "seater";
type DeckKey = "lower" | "upper";

interface Seat {
  id: string;
  label: string;
  row: number;
  col: number;
  deck: DeckKey;
  kind: SeatKind;
  status: SeatStatus;
  price: number;
  passenger?: string;
  bookingId?: string;
  bookingDate?: string;
  boarding?: string;
  dropping?: string;
  gender?: "Male" | "Female" | "Any";
}

// ---------- Mock data ----------
const BUSES = [
  { id: "TS09AB1234", name: "TS 09 AB 1234", model: "Volvo B11R · Sleeper (2+1)" },
  { id: "TS09CD5678", name: "TS 09 CD 5678", model: "Scania Metrolink · Seater (2+2)" },
  { id: "AP12EF9012", name: "AP 12 EF 9012", model: "Mercedes Multi-Axle · Sleeper (2+1)" },
];

const COLS_LOWER = 6; // 6 berth columns + aisle
const ROWS_LOWER = 2;
const COLS_BACK = 6;
const ROWS_BACK = 2;

function seedSeats(busId: string): Seat[] {
  // Deterministic-ish seed based on busId
  const hash = busId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const statuses: SeatStatus[] = ["available", "booked", "female", "blocked"];
  const pick = (i: number): SeatStatus => {
    const r = (hash + i * 7) % 11;
    if (r < 6) return "available";
    if (r < 8) return "booked";
    if (r < 10) return "female";
    return "blocked";
  };

  const passengers = ["Priya Sharma", "Rahul Verma", "Anita Rao", "Vikram Singh", "Neha Patel", "Arjun Mehta"];
  const seats: Seat[] = [];
  let n = 1;

  // Lower deck front
  for (let r = 0; r < ROWS_LOWER; r++) {
    for (let c = 0; c < COLS_LOWER; c++) {
      const id = `L${n}`;
      const status = pick(n);
      seats.push({
        id,
        label: id,
        row: r,
        col: c,
        deck: "lower",
        kind: "sleeper",
        status,
        price: 1250,
        gender: status === "female" ? "Female" : "Any",
        passenger: status === "booked" || status === "female" ? passengers[n % passengers.length] : undefined,
        bookingId: status === "booked" || status === "female" ? `KR-${10400 + n}` : undefined,
        bookingDate: status === "booked" || status === "female" ? "20 May 2025, 06:00 AM" : undefined,
        boarding: "Ameerpet",
        dropping: "Bangalore (Silk Board)",
      });
      n++;
    }
  }
  // Lower deck back
  for (let r = 0; r < ROWS_BACK; r++) {
    for (let c = 0; c < COLS_BACK; c++) {
      const id = `L${n}`;
      const status = pick(n + 3);
      seats.push({
        id,
        label: id,
        row: r + ROWS_LOWER + 1, // gap row for aisle/door
        col: c,
        deck: "lower",
        kind: "sleeper",
        status,
        price: 1100,
        gender: status === "female" ? "Female" : "Any",
        passenger: status === "booked" || status === "female" ? passengers[(n + 1) % passengers.length] : undefined,
        bookingId: status === "booked" || status === "female" ? `KR-${10400 + n}` : undefined,
        bookingDate: status === "booked" || status === "female" ? "20 May 2025, 06:00 AM" : undefined,
        boarding: "Ameerpet",
        dropping: "Bangalore (Silk Board)",
      });
      n++;
    }
  }

  // Upper deck
  let u = 1;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const id = `U${u}`;
      const status = pick(u + 17);
      seats.push({
        id,
        label: id,
        row: r,
        col: c,
        deck: "upper",
        kind: "sleeper",
        status,
        price: 1400,
        gender: status === "female" ? "Female" : "Any",
        passenger: status === "booked" || status === "female" ? passengers[u % passengers.length] : undefined,
        bookingId: status === "booked" || status === "female" ? `KR-${10500 + u}` : undefined,
        bookingDate: status === "booked" || status === "female" ? "20 May 2025, 06:00 AM" : undefined,
        boarding: "Ameerpet",
        dropping: "Bangalore (Silk Board)",
      });
      u++;
    }
  }
  return seats;
}

// ---------- Helpers ----------
const STATUS_META: Record<SeatStatus, { label: string; dot: string; chip: string; seat: string; selected: string }> = {
  available: {
    label: "Available",
    dot: "bg-success",
    chip: "bg-success/15 text-success border-success/25",
    seat:
      "bg-gradient-to-b from-success/20 to-success/10 border-success/40 text-success hover:from-success/30 hover:to-success/15",
    selected: "ring-2 ring-chart-5 ring-offset-2 ring-offset-background",
  },
  booked: {
    label: "Booked",
    dot: "bg-danger",
    chip: "bg-danger/15 text-danger border-danger/25",
    seat:
      "bg-gradient-to-b from-danger/25 to-danger/15 border-danger/40 text-danger hover:from-danger/35 hover:to-danger/20",
    selected: "ring-2 ring-chart-5 ring-offset-2 ring-offset-background",
  },
  female: {
    label: "Female Reserved",
    dot: "bg-pink-500",
    chip: "bg-pink-100 text-pink-600 border-pink-200",
    seat:
      "bg-gradient-to-b from-pink-200/70 to-pink-100/60 border-pink-300 text-pink-600 hover:from-pink-300/70 hover:to-pink-200/60",
    selected: "ring-2 ring-chart-5 ring-offset-2 ring-offset-background",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-muted-foreground",
    chip: "bg-muted text-muted-foreground border-border",
    seat:
      "bg-gradient-to-b from-muted to-muted/60 border-border text-muted-foreground hover:from-muted",
    selected: "ring-2 ring-chart-5 ring-offset-2 ring-offset-background",
  },
};

// ---------- Page ----------
function SeatLayoutsPage() {
  const [busId, setBusId] = useState(BUSES[0].id);
  const [layoutType, setLayoutType] = useState("sleeper-2-1");
  const [deck, setDeck] = useState<DeckKey>("lower");
  const [statusFilter, setStatusFilter] = useState<"all" | SeatStatus>("all");
  const [zoom, setZoom] = useState(1);
  const [seats, setSeats] = useState<Seat[]>(() => seedSeats(BUSES[0].id));
  const [selected, setSelected] = useState<string | null>(null);

  const currentBus = BUSES.find((b) => b.id === busId)!;

  const onChangeBus = (id: string) => {
    setBusId(id);
    setSeats(seedSeats(id));
    setSelected(null);
  };

  const stats = useMemo(() => {
    const total = seats.length;
    const counts = seats.reduce(
      (acc, s) => {
        acc[s.status]++;
        return acc;
      },
      { available: 0, booked: 0, female: 0, blocked: 0 } as Record<SeatStatus, number>,
    );
    const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
    return {
      total,
      available: counts.available,
      booked: counts.booked,
      female: counts.female,
      blocked: counts.blocked,
      pct,
    };
  }, [seats]);

  const deckSeats = seats.filter(
    (s) => s.deck === deck && (statusFilter === "all" || s.status === statusFilter),
  );

  const selectedSeat = seats.find((s) => s.id === selected) ?? null;

  const updateSeat = (id: string, patch: Partial<Seat>) => {
    setSeats((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const toggleBlock = (id: string) => {
    const s = seats.find((x) => x.id === id);
    if (!s) return;
    const next: SeatStatus = s.status === "blocked" ? "available" : "blocked";
    updateSeat(id, { status: next, passenger: undefined, bookingId: undefined });
    toast.success(`Seat ${s.label} ${next === "blocked" ? "blocked" : "released"}`);
  };

  return (
    <>
      <PageHeader
        title="Seat Layout Management"
        breadcrumb={`Seat Layouts › ${currentBus.name}`}
        subtitle="Configure layouts, manage seat states, and review live booking status"
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <LayoutGrid className="size-4" /> Layout Templates
            </Button>
            <Button className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="size-4" /> New Layout
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Seats" value={String(stats.total)} delta={stats.pct(stats.total)} icon={Armchair} tone="brand" />
        <StatCard label="Available Seats" value={String(stats.available)} delta={stats.pct(stats.available)} icon={CheckCircle2} tone="brand" />
        <StatCard label="Booked Seats" value={String(stats.booked)} delta={stats.pct(stats.booked)} icon={User} tone="danger" />
        <StatCard label="Female Reserved" value={String(stats.female)} delta={stats.pct(stats.female)} icon={CircleUser} tone="info" />
        <StatCard label="Blocked Seats" value={String(stats.blocked)} delta={stats.pct(stats.blocked)} icon={Lock} tone="navy" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Main */}
        <div className="space-y-4 min-w-0">
          {/* Filters */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bus</label>
              <Select value={busId} onValueChange={onChangeBus}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{b.name}</span>
                        <span className="text-[11px] text-muted-foreground">{b.model}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Layout Type</label>
              <Select value={layoutType} onValueChange={setLayoutType}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sleeper-2-1">Sleeper (2+1)</SelectItem>
                  <SelectItem value="sleeper-2-2">Sleeper (2+2)</SelectItem>
                  <SelectItem value="seater-2-2">Seater (2+2)</SelectItem>
                  <SelectItem value="seater-2-3">Seater (2+3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deck Type</label>
              <Select value={deck} onValueChange={(v) => setDeck(v as DeckKey)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower">Lower Deck</SelectItem>
                  <SelectItem value="upper">Upper Deck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Seat Status</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="female">Female Reserved</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="h-11 w-full gap-2"
                onClick={() => {
                  setStatusFilter("all");
                  setDeck("lower");
                  setLayoutType("sleeper-2-1");
                }}
              >
                <RotateCcw className="size-4" /> Reset
              </Button>
            </div>
          </div>

          {/* Layout canvas */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
            {/* Deck tabs + legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="inline-flex rounded-lg bg-muted p-1">
                {(["lower", "upper"] as DeckKey[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDeck(d)}
                    className={cn(
                      "px-4 h-8 text-sm font-medium rounded-md transition",
                      deck === d
                        ? "bg-brand text-brand-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d === "lower" ? "Lower Deck" : "Upper Deck"}
                  </button>
                ))}
              </div>
              <Legend />
            </div>

            {/* Bus shell */}
            <div className="relative overflow-auto rounded-2xl border-2 border-border bg-gradient-to-b from-muted/40 to-background p-4">
              <div
                className="relative mx-auto transition-transform origin-top"
                style={{ transform: `scale(${zoom})`, width: "fit-content" }}
              >
                <div className="relative rounded-[3rem] border-2 border-navy/15 bg-card shadow-inner px-6 py-6">
                  {/* Bus body decorations: windows */}
                  <div className="absolute inset-x-12 top-1 h-1.5 rounded-full bg-navy/10" />
                  <div className="absolute inset-x-12 bottom-1 h-1.5 rounded-full bg-navy/10" />

                  <div className="flex gap-4">
                    {/* Driver + entry column */}
                    <div className="flex flex-col justify-between py-2 w-16 shrink-0">
                      <div className="rounded-xl bg-navy text-navy-foreground p-2 flex flex-col items-center gap-1 text-[10px]">
                        <div className="size-8 rounded-full border-2 border-brand/60 grid place-items-center">
                          <Settings2 className="size-4 text-brand" />
                        </div>
                        Driver
                      </div>
                      <div className="rounded-xl bg-brand/10 border border-brand/30 p-2 flex flex-col items-center gap-1 text-[10px] text-brand">
                        <DoorOpen className="size-5" />
                        Entry
                      </div>
                    </div>

                    {/* Seats grid */}
                    <div className="flex-1">
                      <SeatGrid
                        seats={deckSeats}
                        deck={deck}
                        selectedId={selected}
                        onSelect={setSelected}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}>
                <ZoomOut className="size-4" /> Zoom Out
              </Button>
              <div className="w-48 h-1.5 rounded-full bg-muted relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  style={{ width: `${((zoom - 0.6) / 0.8) * 100}%` }}
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}>
                <ZoomIn className="size-4" /> Zoom In
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setZoom(1)}>
                <Maximize2 className="size-4" /> Fit to View
              </Button>
            </div>
          </div>

          {/* Layout controls */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-brand" /> Layout Controls
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Add seat: pick a position on the grid")}>
                <Plus className="size-4" /> Add Seat
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => selected ? (setSeats((p) => p.filter((s) => s.id !== selected)), setSelected(null), toast.success("Seat removed")) : toast.error("Select a seat first")}>
                <Trash2 className="size-4" /> Remove Seat
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => selected ? toast.info("Open seat number editor") : toast.error("Select a seat first")}>
                <Pencil className="size-4" /> Edit Seat Number
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => selected ? toggleBlock(selected) : toast.error("Select a seat first")}>
                <Ban className="size-4" /> Change Status
              </Button>
              <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => toast.success("Layout saved successfully")}>
                <Save className="size-4" /> Save Layout
              </Button>
            </div>
          </div>
        </div>

        {/* Side panel (desktop) */}
        <aside className="hidden xl:block">
          <SeatDetailsCard seat={selectedSeat} bus={currentBus} onToggleBlock={toggleBlock} onClear={() => setSelected(null)} />
        </aside>
      </div>

      {/* Mobile/tablet sheet */}
      <Sheet open={!!selected && typeof window !== "undefined" && window.innerWidth < 1280} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-5 border-b">
            <SheetTitle>Seat Details</SheetTitle>
          </SheetHeader>
          <div className="p-5">
            <SeatDetailsCard seat={selectedSeat} bus={currentBus} onToggleBlock={toggleBlock} onClear={() => setSelected(null)} embedded />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------- Components ----------
function Legend() {
  const items: { k: SeatStatus | "selected"; label: string }[] = [
    { k: "available", label: "Available" },
    { k: "booked", label: "Booked" },
    { k: "female", label: "Female Reserved" },
    { k: "blocked", label: "Blocked" },
    { k: "selected", label: "Selected" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {items.map((it) => (
        <span key={it.k} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2.5 rounded-full",
              it.k === "selected" ? "bg-chart-5 ring-2 ring-chart-5/30" : STATUS_META[it.k as SeatStatus].dot,
            )}
          />
          <span className="text-muted-foreground">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

function SeatGrid({
  seats,
  deck,
  selectedId,
  onSelect,
}: {
  seats: Seat[];
  deck: DeckKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Group seats by row
  const rows = Array.from(new Set(seats.map((s) => s.row))).sort((a, b) => a - b);
  const maxCol = Math.max(0, ...seats.map((s) => s.col));

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground text-right pr-1">{deck === "lower" ? "Lower Deck" : "Upper Deck"}</div>
      {rows.map((r, idx) => {
        const rowSeats = seats.filter((s) => s.row === r);
        // Insert aisle gap between row groups when row index jumps
        const prevRow = rows[idx - 1];
        const showAisle = prevRow !== undefined && r - prevRow > 1;
        return (
          <div key={r}>
            {showAisle && (
              <div className="my-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="flex-1 border-t border-dashed border-border" />
                <span>Aisle</span>
                <div className="flex-1 border-t border-dashed border-border" />
              </div>
            )}
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${maxCol + 1}, minmax(56px, 1fr))` }}
            >
              {Array.from({ length: maxCol + 1 }).map((_, c) => {
                const seat = rowSeats.find((s) => s.col === c);
                if (!seat) return <div key={c} className="h-14" />;
                return <SeatCell key={seat.id} seat={seat} selected={seat.id === selectedId} onSelect={onSelect} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeatCell({ seat, selected, onSelect }: { seat: Seat; selected: boolean; onSelect: (id: string) => void }) {
  const meta = STATUS_META[seat.status];
  return (
    <button
      onClick={() => onSelect(seat.id)}
      title={`${seat.label} · ${meta.label} · ₹${seat.price}`}
      className={cn(
        "group relative h-14 rounded-xl border-2 px-2 py-1 text-xs font-semibold transition-all duration-150",
        "flex flex-col items-center justify-center gap-0.5 cursor-pointer",
        "shadow-[inset_0_-3px_0_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-md",
        meta.seat,
        selected && meta.selected,
      )}
    >
      <span className="leading-none">{seat.label}</span>
      {seat.status === "booked" && <User className="size-3 opacity-80" />}
      {seat.status === "female" && <CircleUser className="size-3 opacity-80" />}
      {seat.status === "blocked" && <X className="size-3 opacity-70" />}
      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy text-navy-foreground text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition shadow-lg z-10">
        {seat.label} · {meta.label} · ₹{seat.price}
      </span>
    </button>
  );
}

function SeatDetailsCard({
  seat,
  bus,
  onToggleBlock,
  onClear,
  embedded,
}: {
  seat: Seat | null;
  bus: { name: string; model: string };
  onToggleBlock: (id: string) => void;
  onClear: () => void;
  embedded?: boolean;
}) {
  if (!seat) {
    return (
      <div className={cn("bg-card border border-border rounded-2xl shadow-sm p-6 text-center", embedded && "border-0 shadow-none p-0")}>
        <div className="size-14 rounded-2xl bg-muted grid place-items-center mx-auto mb-3">
          <Armchair className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">No seat selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Click any seat in the layout to view its details, passenger info and quick actions.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-left">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Current Bus</p>
          <p className="text-sm font-medium">{bus.name}</p>
          <p className="text-xs text-muted-foreground">{bus.model}</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[seat.status];

  return (
    <div className={cn("bg-card border border-border rounded-2xl shadow-sm overflow-hidden", embedded && "border-0 shadow-none rounded-none")}>
      {!embedded && (
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-semibold">Seat Details</h3>
          <button onClick={onClear} className="size-7 grid place-items-center rounded-md hover:bg-muted cursor-pointer">
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <Badge variant="outline" className="rounded-full text-[10px] mb-2">Selected Seat</Badge>
            <p className="text-3xl font-bold tracking-tight">{seat.label}</p>
            <span className={cn("inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium border", meta.chip)}>
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </div>
          <div className={cn("size-20 rounded-2xl border-2 grid place-items-center", meta.seat)}>
            <Armchair className="size-9" />
          </div>
        </div>

        <dl className="divide-y divide-border text-sm">
          <Row label="Deck Type" value={seat.deck === "lower" ? "Lower Deck" : "Upper Deck"} />
          <Row label="Seat Type" value={seat.kind === "sleeper" ? "Sleeper" : "Seater"} />
          <Row label="Price" value={`₹${seat.price.toLocaleString("en-IN")}`} strong />
          <Row
            label="Status"
            valueNode={
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", `text-${seat.status === "female" ? "pink-600" : seat.status === "booked" ? "danger" : seat.status === "blocked" ? "muted-foreground" : "success"}`)}>
                <span className={cn("size-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            }
          />
          <Row label="Gender Restriction" value={seat.status === "female" ? "Female Only" : "None"} />
          <Row label="Availability" value={seat.status === "available" ? "Open" : seat.status === "blocked" ? "Unavailable" : "Reserved"} />
          {seat.passenger && <Row label="Passenger Name" value={seat.passenger} />}
          {seat.bookingId && <Row label="Booking ID" value={seat.bookingId} />}
          {seat.bookingDate && <Row label="Booking Date" value={seat.bookingDate} />}
          {seat.boarding && <Row label="Boarding Point" value={seat.boarding} />}
          {seat.dropping && <Row label="Dropping Point" value={seat.dropping} />}
        </dl>

        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onToggleBlock(seat.id)}
          >
            <Ban className="size-4" />
            {seat.status === "blocked" ? "Unblock Seat" : "Block Seat"}
          </Button>
          <Button
            className="gap-2 bg-danger text-white hover:bg-danger/90"
            onClick={() => onToggleBlock(seat.id)}
          >
            <X className="size-4" /> Release Seat
          </Button>
        </div>

        <Button variant="outline" className="w-full mt-2 gap-2">
          <BusIcon className="size-4" /> View Booking Details
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, valueNode, strong }: { label: string; value?: string; valueNode?: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", strong && "font-semibold")}>{valueNode ?? value}</dd>
    </div>
  );
}
