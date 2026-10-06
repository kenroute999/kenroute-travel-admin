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
import { busFleet, type BusType } from "@/lib/buses";

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
  col: number; // 0 = single (left), 1 = aisle (only used by the back bench), 2 & 3 = double (right)
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

// ---------- Bus catalog (shared with the Buses page) ----------
type LayoutId = "sleeper-2-1" | "seater-2-2" | "seater-sleeper-2-1";
type SeatArrangement = "2-1" | "2-2";

interface DeckSideSpec {
  rows: number; // rows filled on this side
  kind: SeatKind; // sleeper bed or seater seat
}

interface DeckSpec {
  single: DeckSideSpec | null; // left side (single bed / left pair)
  pair: DeckSideSpec | null; // right side (double beds / right pair)
  backBench: boolean;
  price: number;
}

interface LayoutSpec {
  id: LayoutId;
  label: BusType;
  arrangement: SeatArrangement;
  lower: DeckSpec;
  upper: DeckSpec | null;
}

const LAYOUT_BY_TYPE: Record<BusType, LayoutId> = {
  "Sleeper (2+1)": "sleeper-2-1",
  "Seater (2+2)": "seater-2-2",
  "Seater/Sleeper (2+1)": "seater-sleeper-2-1",
};

const LAYOUTS: Record<LayoutId, LayoutSpec> = {
  // Sleeper: 6 single beds + 6x2 double beds per deck, bed icons
  "sleeper-2-1": {
    id: "sleeper-2-1",
    label: "Sleeper (2+1)",
    arrangement: "2-1",
    lower: {
      single: { rows: 6, kind: "sleeper" },
      pair: { rows: 6, kind: "sleeper" },
      backBench: false,
      price: 1250,
    },
    upper: {
      single: { rows: 6, kind: "sleeper" },
      pair: { rows: 6, kind: "sleeper" },
      backBench: false,
      price: 1400,
    },
  },
  // Seater: 10 rows of 4 + a 5-seat back bench = 45 seats (lower deck only)
  "seater-2-2": {
    id: "seater-2-2",
    label: "Seater (2+2)",
    arrangement: "2-2",
    lower: {
      single: { rows: 10, kind: "seater" },
      pair: { rows: 10, kind: "seater" },
      backBench: true,
      price: 650,
    },
    upper: null,
  },
  // Seater/Sleeper: upper deck full sleeper, lower deck beds (single side) + 12x2 seater
  "seater-sleeper-2-1": {
    id: "seater-sleeper-2-1",
    label: "Seater/Sleeper (2+1)",
    arrangement: "2-1",
    lower: {
      single: { rows: 6, kind: "sleeper" },
      pair: { rows: 12, kind: "seater" },
      backBench: false,
      price: 800,
    },
    upper: {
      single: { rows: 6, kind: "sleeper" },
      pair: { rows: 6, kind: "sleeper" },
      backBench: false,
      price: 1300,
    },
  },
};

// Buses come straight from the shared fleet used on the Buses page.
const BUSES = busFleet.map((b) => ({
  id: b.no.replace(/\s+/g, ""),
  name: b.no,
  model: `${b.name} · ${b.type}`,
  layout: LAYOUT_BY_TYPE[b.type],
}));

// Indian layout (right-hand traffic, driver on the right, door on the left):
//  2+1: [ single ] [ aisle ] [ double ] [ double ]
//  2+2: [ double] [ double ] [ aisle ] [ double ] [ double ]
const SINGLE_COL = 0;
const AISLE_COL = 1;
const AISLE_COL_22 = 2;
const DOUBLE_COLS = [2, 3];
const PAIR_COLS_22 = [0, 1, 3, 4];

// Uniform sizing so every bus type has the SAME outer width (224px inner body)
// and every bed is the SAME size (58x78 single, 130x78 double) on every bus/deck:
//  2+1: [ single 58 ] [ aisle 24 ] [ double 130 ]
//  2+2: [ seat 44 ] [ seat 44 ] [ aisle 24 ] [ seat 44 ] [ seat 44 ]
const SEAT_W = 44; // px - single seater seat
const SINGLE_W = 58; // px - single bed column (uniform bed width, slightly reduced)
const DOUBLE_W = 130; // px - double bed column (spans 2 seat widths)
const AISLE_W = 24; // px
const BED_H = 78; // px - uniform bed height for every bed in every bus/deck
const GRID_GAP = 6; // px
const GRID_COLS_22 = `${SEAT_W}px ${SEAT_W}px ${AISLE_W}px ${SEAT_W}px ${SEAT_W}px`;
const GRID_WIDTH_21 = SINGLE_W + AISLE_W + DOUBLE_W + GRID_GAP * 2;
const GRID_WIDTH_22 = SEAT_W * 4 + AISLE_W + GRID_GAP * 4;

function seedSeats(busId: string, layoutId: LayoutId): Seat[] {
  const spec = LAYOUTS[layoutId];
  // Deterministic-ish seed based on busId
  const hash = busId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
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
  const bookingBase = 10400;
  const singleCols = spec.arrangement === "2-1" ? [SINGLE_COL] : [0, 1];
  const pairCols = spec.arrangement === "2-1" ? [...DOUBLE_COLS] : [3, 4];

  const buildDeck = (deck: DeckKey, ds: DeckSpec, pickOffset: number) => {
    const prefix = deck === "lower" ? "L" : "U";
    const maxRows =
      Math.max(ds.single?.rows ?? 0, ds.pair?.rows ?? 0) + (ds.backBench ? 1 : 0);

    const addSeat = (r: number, c: number, kind: SeatKind) => {
      const status = pick(n + pickOffset);
      const reserved = status === "booked" || status === "female";
      seats.push({
        id: `${prefix}${n}`,
        label: String(n),
        row: r,
        col: c,
        deck,
        kind,
        status,
        price: ds.price,
        gender: status === "female" ? "Female" : "Any",
        passenger: reserved ? passengers[n % passengers.length] : undefined,
        bookingId: reserved ? `KR-${bookingBase + n}` : undefined,
        bookingDate: reserved ? "20 May 2025, 06:00 AM" : undefined,
        boarding: "Ameerpet",
        dropping: "Bangalore (Silk Board)",
      });
      n++;
    };

    if (ds.single) {
      for (let r = 0; r < ds.single.rows; r++) {
        for (const c of singleCols) addSeat(r, c, ds.single.kind);
      }
    }
    if (ds.pair) {
      for (let r = 0; r < ds.pair.rows; r++) {
        for (const c of pairCols) addSeat(r, c, ds.pair.kind);
      }
    }

    // Back bench: seats spanning the full width (the aisle position gets a seat too)
    if (ds.backBench) {
      const benchCols = spec.arrangement === "2-1" ? [DOUBLE_COLS[0], DOUBLE_COLS[1], AISLE_COL, SINGLE_COL] : [0, 1, 2, 3, 4];
      for (const c of benchCols) addSeat(maxRows - 1, c, ds.pair?.kind ?? "seater");
    }
  };

  buildDeck("lower", spec.lower, 0);
  if (spec.upper) buildDeck("upper", spec.upper, 17);

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
  const [layoutType, setLayoutType] = useState<LayoutId>(BUSES[0].layout);
  const [deck, setDeck] = useState<DeckKey>("lower");
  const [statusFilter, setStatusFilter] = useState<"all" | SeatStatus>("all");
  const [zoom, setZoom] = useState(1);
  const [seats, setSeats] = useState<Seat[]>(() => seedSeats(BUSES[0].id, BUSES[0].layout));
  const [selected, setSelected] = useState<string | null>(null);

  const currentBus = BUSES.find((b) => b.id === busId)!;
  const currentLayout = LAYOUTS[layoutType];
  const hasUpperDeck = currentLayout.upper != null;
  const availableDecks: DeckKey[] = hasUpperDeck ? ["lower", "upper"] : ["lower"];

  // Applies a layout to a bus: regenerates seats and makes sure the deck is valid
  const applyLayout = (id: string, layout: LayoutId) => {
    setLayoutType(layout);
    setSeats(seedSeats(id, layout));
    setSelected(null);
    setDeck("lower");
  };

  const onChangeBus = (id: string) => {
    const bus = BUSES.find((b) => b.id === id)!;
    setBusId(id);
    applyLayout(id, bus.layout);
  };

  const onChangeLayout = (layout: LayoutId) => {
    if (layout === layoutType) return;
    applyLayout(busId, layout);
    const spec = LAYOUTS[layout];
    toast.info(
      spec.upper
        ? `${spec.label} layout loaded: lower and upper deck`
        : `${spec.label} layout loaded: lower deck only`,
    );
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

  // All seats of the current deck (filter only dims, so the layout keeps its shape)
  const deckSeats = seats.filter((s) => s.deck === deck);

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
              <Select value={layoutType} onValueChange={(v) => onChangeLayout(v as LayoutId)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => (
                    <SelectItem key={id} value={id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{LAYOUTS[id].label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {LAYOUTS[id].upper ? "Lower + Upper deck" : "Lower deck only"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deck Type</label>
              <Select value={deck} onValueChange={(v) => setDeck(v as DeckKey)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower">Lower Deck</SelectItem>
                  <SelectItem value="upper" disabled={!hasUpperDeck}>
                    Upper Deck{!hasUpperDeck ? " (not available)" : ""}
                  </SelectItem>
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
                  applyLayout(busId, currentBus.layout);
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
                {availableDecks.map((d) => (
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

            {/* Bus shell (vertical, front of the bus at the top) */}
            <div className="relative overflow-auto rounded-2xl border-2 border-border bg-gradient-to-b from-muted/40 to-background p-4">
              <div
                className="relative mx-auto transition-transform origin-top"
                style={{ transform: `scale(${zoom})`, width: "fit-content" }}
              >
                <div className="relative rounded-t-[2.5rem] rounded-b-2xl border-2 border-navy/15 bg-card shadow-inner px-6 pt-5 pb-4">
                  {/* Body decorations: side windows */}
                  <div className="absolute inset-y-12 left-1 w-1 rounded-full bg-navy/10" />
                  <div className="absolute inset-y-12 right-1 w-1 rounded-full bg-navy/10" />

                  <div className="mx-auto" style={{ width: currentLayout.arrangement === "2-1" ? GRID_WIDTH_21 : GRID_WIDTH_22 }}>
                    {/* Front: Entry (left) and Driver (right) */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="rounded-lg bg-brand/10 border border-brand/30 px-2 py-1 flex flex-col items-center gap-0.5 text-[9px] text-brand">
                        <DoorOpen className="size-4" />
                        Entry
                      </div>
                      <div
                        className="size-10 rounded-lg border-2 border-navy/30 bg-card grid place-items-center text-navy"
                        title="Driver"
                      >
                        <SteeringWheel className="size-6" />
                      </div>
                    </div>

                    {/* Seats grid */}
                    <SeatGrid
                      seats={deckSeats}
                      deck={deck}
                      arrangement={currentLayout.arrangement}
                      statusFilter={statusFilter}
                      selectedId={selected}
                      onSelect={setSelected}
                    />

                    <div className="mt-3 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
                      Back of bus
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
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
          <SeatDetailsCard seat={selectedSeat} bus={currentBus} arrangement={currentLayout.arrangement} onToggleBlock={toggleBlock} onClear={() => setSelected(null)} />
        </aside>
      </div>

      {/* Mobile/tablet sheet */}
      <Sheet open={!!selected && typeof window !== "undefined" && window.innerWidth < 1280} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-5 border-b">
            <SheetTitle>Seat Details</SheetTitle>
          </SheetHeader>
          <div className="p-5">
            <SeatDetailsCard seat={selectedSeat} bus={currentBus} arrangement={currentLayout.arrangement} onToggleBlock={toggleBlock} onClear={() => setSelected(null)} embedded />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------- Components ----------
function SteeringWheel({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M3.2 10.5c3 .4 5.2.9 6.6 1.5M20.8 10.5c-3 .4-5.2.9-6.6 1.5M12 14.2V21" />
    </svg>
  );
}

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
  arrangement,
  statusFilter,
  selectedId,
  onSelect,
}: {
  seats: Seat[];
  deck: DeckKey;
  arrangement: SeatArrangement;
  statusFilter: "all" | SeatStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const isTwoTwo = arrangement === "2-2";
  const isDimmed = (seat: Seat) => statusFilter !== "all" && seat.status !== statusFilter;

  if (isTwoTwo) {
    return <SeaterGrid seats={seats} deck={deck} statusFilter={statusFilter} selectedId={selectedId} onSelect={onSelect} />;
  }

  // 2+1: two independent columns so beds / seats always span the same bus height.
  const singleSeats = seats.filter((s) => s.col === SINGLE_COL).sort((a, b) => a.row - b.row);
  const doubleSeats = seats.filter((s) => s.col === DOUBLE_COLS[0] || s.col === DOUBLE_COLS[1]);
  const doubleRows = Array.from(new Set(doubleSeats.map((s) => s.row)))
    .sort((a, b) => a - b)
    .map((r) => {
      const a = doubleSeats.find((s) => s.row === r && s.col === DOUBLE_COLS[0]);
      const b = doubleSeats.find((s) => s.row === r && s.col === DOUBLE_COLS[1]);
      return { r, seats: [a, b].filter(Boolean) as Seat[] };
    });

  return (
    <div className="flex flex-col" style={{ gap: GRID_GAP }}>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground px-0.5">
        <span>Single</span>
        <span>{deck === "lower" ? "Lower Deck" : "Upper Deck"}</span>
        <span>Double</span>
      </div>

      <div className="flex items-stretch" style={{ gap: GRID_GAP }}>
        {/* Single / bed side */}
        <div className="flex flex-col" style={{ width: SINGLE_W, gap: GRID_GAP }}>
          {singleSeats.map((seat) => {
            const selected = seat.id === selectedId;
            if (seat.kind === "sleeper") {
              return <BedCell key={seat.id} seat={seat} selected={selected} dimmed={isDimmed(seat)} onSelect={onSelect} />;
            }
            return <SeatCell key={seat.id} seat={seat} selected={selected} dimmed={isDimmed(seat)} onSelect={onSelect} />;
          })}
        </div>

        {/* Aisle */}
        <div style={{ width: AISLE_W }} />

        {/* Double / seater side */}
        <div className="flex flex-col" style={{ width: DOUBLE_W, gap: GRID_GAP }}>
          {doubleRows.map((row) => {
            const sleeperPair = row.seats.length === 2 && row.seats[0].kind === "sleeper";
            if (sleeperPair) {
              return (
                <DoubleBedCell key={row.r} seats={row.seats} selectedId={selectedId} isDimmed={isDimmed} onSelect={onSelect} />
              );
            }
            return (
              <div key={row.r} className="flex" style={{ gap: GRID_GAP }}>
                {row.seats.map((seat) => (
                  <SeatCell key={seat.id} seat={seat} selected={seat.id === selectedId} dimmed={isDimmed(seat)} onSelect={onSelect} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SeaterGrid({
  seats,
  deck,
  statusFilter,
  selectedId,
  onSelect,
}: {
  seats: Seat[];
  deck: DeckKey;
  statusFilter: "all" | SeatStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rows = Array.from(new Set(seats.map((s) => s.row))).sort((a, b) => a - b);
  const isDimmed = (seat: Seat) => statusFilter !== "all" && seat.status !== statusFilter;

  return (
    <div className="flex flex-col" style={{ gap: GRID_GAP }}>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground px-0.5">
        <span>Left seats</span>
        <span>{deck === "lower" ? "Lower Deck" : "Upper Deck"}</span>
        <span>Right seats</span>
      </div>

      {/* Front row (lower deck only): storage on the left, washrooms on the right */}
      {deck === "lower" && (
        <div className="grid" style={{ gridTemplateColumns: GRID_COLS_22, gap: GRID_GAP }}>
          <div className="h-9 rounded-lg bg-muted/80 border border-border" title="Unavailable area" />
          <div className="h-9 rounded-lg bg-muted/80 border border-border" title="Unavailable area" />
          <div />
          <WashroomCell />
          <WashroomCell />
        </div>
      )}

      {rows.map((r) => {
        const rowSeats = seats.filter((s) => s.row === r);

        // Back bench: seats spanning the full width (including the aisle position)
        const isBackBench = rowSeats.some((s) => s.col === AISLE_COL_22);
        if (isBackBench) {
          const benchCols = [0, 1, AISLE_COL_22, 3, 4];
          return (
            <div key={r} className="grid" style={{ gridTemplateColumns: `repeat(${benchCols.length}, 1fr)`, gap: GRID_GAP }}>
              {benchCols.map((c) => {
                const seat = rowSeats.find((s) => s.col === c);
                if (!seat) return <div key={c} className="h-9" />;
                return <SeatCell key={seat.id} seat={seat} selected={seat.id === selectedId} dimmed={isDimmed(seat)} onSelect={onSelect} />;
              })}
            </div>
          );
        }

        return (
          <div key={r} className="grid" style={{ gridTemplateColumns: GRID_COLS_22, gap: GRID_GAP }}>
            {Array.from({ length: 5 }).map((_, c) => {
              if (c === AISLE_COL_22) return <div key={c} />;
              const seat = rowSeats.find((s) => s.col === c);
              if (!seat) return <div key={c} className="h-9" />;
              return <SeatCell key={seat.id} seat={seat} selected={seat.id === selectedId} dimmed={isDimmed(seat)} onSelect={onSelect} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

function WashroomCell() {
  return (
    <div
      className="h-9 flex-1 rounded-lg border-2 border-border bg-card grid place-items-center text-[9px] font-semibold text-muted-foreground"
      title="Washroom"
    >
      WC
    </div>
  );
}

// Rectangular bunk for a single sleeper berth - uniform size on every bus/deck
function BedCell({
  seat,
  selected,
  dimmed,
  onSelect,
}: {
  seat: Seat;
  selected: boolean;
  dimmed?: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = STATUS_META[seat.status];
  return (
    <button
      onClick={() => onSelect(seat.id)}
      title={`${seat.label} · ${meta.label} · ₹${seat.price}`}
      className={cn(
        "group relative w-full rounded-lg border-2 px-1 text-[11px] font-semibold transition-all duration-150",
        "flex flex-col items-center justify-center gap-1",
        "hover:-translate-y-0.5 hover:shadow-md",
        meta.seat,
        selected && meta.selected,
        dimmed && "opacity-25",
      )}
      style={{ height: BED_H }}
    >
      {/* Pillow */}
      <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
      <span className="leading-none">{seat.label}</span>
      {/* Foot end */}
      <span className="h-1.5 w-4/5 rounded-sm bg-current opacity-10" />

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy text-navy-foreground text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition shadow-lg z-10">
        {seat.label} · {meta.label} · ₹{seat.price}
      </span>
    </button>
  );
}

// One wide rectangle representing a double bed, split into two clickable berths -
// same height as every other bed in the application
function DoubleBedCell({
  seats,
  selectedId,
  isDimmed,
  onSelect,
}: {
  seats: Seat[];
  selectedId: string | null;
  isDimmed: (seat: Seat) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border-2" style={{ height: BED_H }}>
      {seats.map((seat, i) => {
        const meta = STATUS_META[seat.status];
        return (
          <button
            key={seat.id}
            onClick={() => onSelect(seat.id)}
            title={`${seat.label} · ${meta.label} · ₹${seat.price}`}
            className={cn(
              "group relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all duration-150",
              i > 0 && "border-l-2 border-border/60",
              "hover:-translate-y-0.5 hover:shadow-md",
              meta.seat,
              seat.id === selectedId && meta.selected,
              isDimmed(seat) && "opacity-25",
            )}
          >
            <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
            <span className="leading-none">{seat.label}</span>
            <span className="h-1.5 w-4/5 rounded-sm bg-current opacity-10" />
          </button>
        );
      })}
    </div>
  );
}

function SeatCell({
  seat,
  selected,
  dimmed,
  onSelect,
}: {
  seat: Seat;
  selected: boolean;
  dimmed?: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = STATUS_META[seat.status];
  return (
    <button
      onClick={() => onSelect(seat.id)}
      title={`${seat.label} · ${meta.label} · ₹${seat.price}`}
      className={cn(
        "group relative h-9 w-full flex-1 rounded-t-xl rounded-b-md border-2 px-0.5 text-[11px] font-semibold transition-all duration-150",
        "flex items-center justify-center gap-0.5 cursor-pointer",
        "shadow-[inset_0_-3px_0_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:shadow-md",
        meta.seat,
        selected && meta.selected,
        dimmed && "opacity-25",
      )}
    >
      {/* Armrests */}
      <span className="pointer-events-none absolute -left-1 top-2 h-4 w-1 rounded-full bg-current opacity-30" />
      <span className="pointer-events-none absolute -right-1 top-2 h-4 w-1 rounded-full bg-current opacity-30" />

      <span className="leading-none">{seat.label}</span>
      {seat.status === "booked" && <User className="size-2.5 opacity-80" />}
      {seat.status === "female" && <CircleUser className="size-2.5 opacity-80" />}
      {seat.status === "blocked" && <X className="size-2.5 opacity-70" />}

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy text-navy-foreground text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition shadow-lg z-10">
        {seat.label} · {meta.label} · ₹{seat.price}
      </span>
    </button>
  );
}

function SeatDetailsCard({
  seat,
  bus,
  arrangement,
  onToggleBlock,
  onClear,
  embedded,
}: {
  seat: Seat | null;
  bus: { name: string; model: string };
  arrangement: SeatArrangement;
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
  const position = (() => {
    if (arrangement === "2-2") {
      if (seat.col === AISLE_COL_22) return "Back bench";
      return seat.col < AISLE_COL_22 ? "Left pair" : "Right pair";
    }
    if (seat.col === SINGLE_COL) return "Single side";
    if (seat.col === AISLE_COL) return "Back bench";
    return "Double side";
  })();

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
          <Row label="Position" value={position} />
          <Row label="Price" value={`₹${seat.price.toLocaleString("en-IN")}`} strong />
          <Row
            label="Status"
            valueNode={
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border", meta.chip)}>
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