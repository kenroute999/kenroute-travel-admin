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
  Mars,
  Venus,
  Ticket,
  TicketCheck,
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
  component: SeatLayoutsRoute,
});

interface SeatLayoutsPageProps {
  initialBusId?: string;
  initialPassenger?: string;
  initialBookingMode?: boolean;
  onBooked?: (info: {
    busId: string;
    busName: string;
    seats: string[];
    passenger: string;
    gender: PassengerGender;
    bookingId: string;
  }) => void;
}

export function SeatLayoutsPage(props: SeatLayoutsPageProps = {}) {
  return <SeatLayoutsPageImpl {...props} />;
}

function SeatLayoutsRoute() {
  return <SeatLayoutsPage />;
}

// ---------- Types ----------
type SeatStatus = "available" | "booked" | "female" | "blocked";
type SeatKind = "sleeper" | "seater";
type DeckKey = "lower" | "upper";
type PassengerGender = "male" | "female";

interface Seat {
  id: string;
  label: string;
  row: number;
  col: number; // 0 = single (left), 1 = aisle (only used by the back bench), 2 & 3 = double (right)
  deck: DeckKey;
  kind: SeatKind;
  status: SeatStatus;
  price: number;
  reservedFor?: "male" | "female"; // seat is held for this gender only (its pair partner is occupied)
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

// ---------- Booking rules (gender-based adjacency) ----------
// A "pair" is the berth/seat unit a passenger is spread across:
//  - 2+1: single side is on its own; the two double berths of a row share a pair.
//  - 2+2: left pair (cols 0,1) and right pair (cols 3,4) share a row; a back-bench
//    seat is paired with its immediate left/right neighbours.
function pairPartners(seat: Seat, all: Seat[], arrangement: SeatArrangement): Seat[] {
  if (arrangement === "2-1") {
    if (seat.col === SINGLE_COL) return [];
    return all.filter(
      (x) => x.deck === seat.deck && x.row === seat.row && x.id !== seat.id && (x.col === DOUBLE_COLS[0] || x.col === DOUBLE_COLS[1]),
    );
  }
  if (seat.col === AISLE_COL_22) {
    return all.filter((x) => x.deck === seat.deck && x.row === seat.row && Math.abs(x.col - seat.col) === 1);
  }
  const base = seat.col < AISLE_COL_22 ? 0 : 3;
  return all.filter((x) => x.deck === seat.deck && x.row === seat.row && x.id !== seat.id && x.col >= base && x.col <= base + 1);
}

// Why a passenger of the given gender cannot take this seat (null = allowed).
function blockBookingReason(
  seat: Seat | undefined,
  gender: PassengerGender,
  all: Seat[],
  arrangement: SeatArrangement,
): string | null {
  if (!seat) return "Seat not found";
  if (seat.status === "blocked") return `Seat ${seat.label} is blocked`;
  if (seat.status === "booked") return `Seat ${seat.label} is already booked`;
  if (seat.status === "female" && gender !== "female") return `Seat ${seat.label} is reserved for female passengers`;
  if (seat.status === "available" && seat.reservedFor === "male" && gender !== "male")
    return `Seat ${seat.label} is reserved for male passengers`;
  if (seat.status === "available" && seat.reservedFor === "female" && gender !== "female")
    return `Seat ${seat.label} is reserved for female passengers`;

  // A seat beside (pairing with) an occupied seat can only be taken by the same gender.
  for (const p of pairPartners(seat, all, arrangement)) {
    if (p.status === "booked" && gender !== "male")
      return `Seat ${p.label} beside it is booked by a male passenger`;
    if (p.status === "female" && gender !== "female")
      return `Seat ${p.label} beside it is reserved for a female passenger`;
  }
  return null;
}

// After an available seat's pair partner is occupied by someone of gender G,
// the free seat is auto-held for the same gender (female -> pink reserved,
// male -> dashed-blue male-only). Occupied seats and their own data are untouched.
function propagateReservations(rows: Seat[], arrangement: SeatArrangement): Seat[] {
  return rows.map((s) => {
    if (s.status !== "available") return s;
    const occupation = pairPartners(s, rows, arrangement).find(
      (p) => p.status === "booked" || p.status === "female",
    );
    if (!occupation) return s;
    const gender: PassengerGender = occupation.status === "booked" ? "male" : "female";
    return {
      ...s,
      reservedFor: gender,
      status: gender === "female" ? "female" : "available",
    };
  });
}

// Rebuilds reservations from scratch based on who is currently occupying seats.
function refreshReservations(rows: Seat[], arrangement: SeatArrangement): Seat[] {
  const cleared = rows.map((s) => ({ ...s, reservedFor: undefined }));
  return propagateReservations(cleared, arrangement);
}

const DEMO_PASSENGER_NAMES = ["Priya Sharma", "Rahul Verma", "Sneha Rao", "Vikram Singh", "Neha Patel"];

// Indian layout (right-hand traffic, driver on the right, door on the left):
//  2+1: [ single ] [ aisle ] [ double ] [ double ]
//  2+2: [ double] [ double ] [ aisle ] [ double ] [ double ]
const SINGLE_COL = 0;
const AISLE_COL = 1;
const AISLE_COL_22 = 2;
const DOUBLE_COLS = [2, 3];
const PAIR_COLS_22 = [0, 1, 3, 4];

// Uniform sizing so every bus type has the SAME outer width (224px inner body)
// and every bed is the SAME size (52x78 single, 116x78 double) on every bus/deck;
// seats slightly narrower, aisle wider.
//  2+1: [ single 52 ] [ aisle 44 ] [ double 116 ]
//  2+2: [ seat 39 ] [ seat 39 ] [ aisle 44 ] [ seat 39 ] [ seat 39 ]
const SEAT_W = 39; // px - single seater seat
const SINGLE_W = 52; // px - single bed column (uniform bed width, slightly reduced)
const DOUBLE_W = 116; // px - double bed column (spans 2 seat widths)
const AISLE_W = 44; // px
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
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
  booked: {
    label: "Booked",
    dot: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 border-blue-200",
    seat:
      "bg-gradient-to-b from-blue-500/20 to-blue-400/10 border-blue-500/40 text-blue-600 hover:from-blue-500/30 hover:to-blue-400/15",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
  female: {
    label: "Female Reserved",
    dot: "bg-pink-500",
    chip: "bg-pink-100 text-pink-600 border-pink-200",
    seat:
      "bg-gradient-to-b from-pink-200/70 to-pink-100/60 border-pink-300 text-pink-600 hover:from-pink-300/70 hover:to-pink-200/60",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-gray-400",
    chip: "bg-gray-100 text-gray-600 border-gray-200",
    seat:
      "bg-gradient-to-b from-gray-400/15 to-gray-400/5 border-dashed border-gray-300/70 text-gray-500 hover:from-gray-400/20 hover:to-gray-400/10",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
};

// Available seat held for male passengers only (its pair partner is male-booked)
const MALE_RESERVED_SEAT =
  "bg-gradient-to-b from-blue-500/10 to-blue-400/5 border-dashed border-blue-400/50 text-blue-500 hover:from-blue-500/15 hover:to-blue-400/5";

// Available seat held for female passengers only (its pair partner is female-booked)
const FEMALE_RESERVED_SEAT =
  "bg-gradient-to-b from-pink-200/40 to-pink-100/30 border-dashed border-pink-300/50 text-pink-400 hover:from-pink-300/50 hover:to-pink-200/30";

// Held seats (beside an occupied pair partner) get a dotted border matching their gender;
// booked/available seats use the normal status styling.
function heldSeatStyle(seat: Seat, meta: { seat: string }): string {
  if (seat.status === "available" && seat.reservedFor === "male") return MALE_RESERVED_SEAT;
  if (seat.reservedFor === "female") return FEMALE_RESERVED_SEAT;
  return meta.seat;
}

// ---------- Legends ----------
const LEGEND_ITEMS: { k: SeatStatus | "selected" | "maleOnly"; label: string }[] = [
  { k: "available", label: "Available" },
  { k: "booked", label: "Booked" },
  { k: "female", label: "Female Reserved" },
  { k: "maleOnly", label: "Male Only" },
  { k: "blocked", label: "Blocked" },
  { k: "selected", label: "Selected / In cart" },
];

// ---------- Page ----------
function SeatLayoutsPageImpl({
  initialBusId,
  initialPassenger,
  initialBookingMode,
  onBooked,
}: {
  initialBusId?: string;
  initialPassenger?: string;
  initialBookingMode?: boolean;
  onBooked?: (info: {
    busId: string;
    busName: string;
    seats: string[];
    passenger: string;
    gender: PassengerGender;
    bookingId: string;
  }) => void;
} = {}) {
  const initialBus = BUSES.find((b) => b.id === initialBusId) ?? BUSES[0];
  const [busId, setBusId] = useState(initialBus.id);
  const [layoutType, setLayoutType] = useState<LayoutId>(initialBus.layout);
  const [deck, setDeck] = useState<DeckKey>("lower");
  const [statusFilter, setStatusFilter] = useState<"all" | SeatStatus>("all");
  const [zoom, setZoom] = useState(1);
  const [seats, setSeats] = useState<Seat[]>(() =>
    refreshReservations(seedSeats(initialBus.id, initialBus.layout), LAYOUTS[initialBus.layout].arrangement),
  );
  const [selected, setSelected] = useState<string | null>(null);

  // Booking simulation state
  const [bookingMode, setBookingMode] = useState(initialBookingMode ?? false);
  const [ticketCount, setTicketCount] = useState<1 | 2>(1);
  const [passengerGender, setPassengerGender] = useState<PassengerGender>("female");
  const [cart, setCart] = useState<string[]>([]);

  const currentBus = BUSES.find((b) => b.id === busId)!;
  const currentLayout = LAYOUTS[layoutType];
  const hasUpperDeck = currentLayout.upper != null;
  const availableDecks: DeckKey[] = hasUpperDeck ? ["lower", "upper"] : ["lower"];

  const seededSeats = (id: string, layout: LayoutId) =>
    refreshReservations(seedSeats(id, layout), LAYOUTS[layout].arrangement);

  // Applies a layout to a bus: regenerates seats and makes sure the deck is valid
  const applyLayout = (id: string, layout: LayoutId) => {
    setLayoutType(layout);
    setSeats(seededSeats(id, layout));
    setSelected(null);
    setCart([]);
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

  // Seats highlighted on the layout: booking cart in booking mode, the viewed seat otherwise.
  const highlightedIds = bookingMode ? cart : selected ? [selected] : [];

  const toggleBlock = (id: string) => {
    const s = seats.find((x) => x.id === id);
    if (!s) return;
    const next: SeatStatus = s.status === "blocked" ? "available" : "blocked";
    const patched = seats.map((x) =>
      x.id === id
        ? { ...x, status: next, passenger: undefined, bookingId: undefined, reservedFor: undefined }
        : x,
    );
    setSeats(refreshReservations(patched, currentLayout.arrangement));
    setCart([]);
    toast.success(`Seat ${s.label} ${next === "blocked" ? "blocked" : "released"}`);
  };

  // Click behaviour: view details in normal mode, add to a booking cart in booking mode.
  const handleSeatClick = (id: string) => {
    const seat = seats.find((s) => s.id === id);
    if (!seat) return;
    if (!bookingMode) {
      setSelected(id === selected ? null : id);
      return;
    }
    if (cart.includes(id)) {
      setCart((c) => c.filter((s) => s !== id));
      return;
    }
    if (cart.length >= ticketCount) {
      toast.info(`This booking has ${ticketCount} ticket${ticketCount > 1 ? "s" : ""}. Remove a seat or confirm first.`);
      return;
    }
    const reason = blockBookingReason(seat, passengerGender, seats, currentLayout.arrangement);
    if (reason) {
      toast.error(reason);
      return;
    }
    setSelected(id);
    setCart((c) => [...c, id]);
  };

  const confirmBooking = () => {
    if (cart.length === 0) {
      toast.error("Select at least one seat first");
      return;
    }
    for (const id of cart) {
      const seat = seats.find((s) => s.id === id);
      const reason = blockBookingReason(seat, passengerGender, seats, currentLayout.arrangement);
      if (reason) {
        toast.error(reason);
        return;
      }
    }
    const bookingId = `BKG-${Math.floor(100000 + Math.random() * 900000)}`;
    const passenger =
      initialPassenger ?? DEMO_PASSENGER_NAMES[Math.floor(Math.random() * DEMO_PASSENGER_NAMES.length)];
    const genderLabel = passengerGender === "female" ? "Female" : "Male";
    const next = seats.map((s) => {
      if (!cart.includes(s.id)) return s;
      return {
        ...s,
        status: (passengerGender === "female" ? "female" : "booked") as SeatStatus,
        reservedFor: undefined,
        passenger,
        bookingId,
        bookingDate: "06 Oct 2026",
      };
    });
    setSeats(refreshReservations(next, currentLayout.arrangement));
    const labels = cart.map((id) => seats.find((s) => s.id === id)!.label).join(", ");
    toast.success(`${genderLabel} booking confirmed for seat(s) ${labels} (${bookingId})`);
    setCart([]);
    setSelected(null);
    onBooked?.({ busId, busName: currentBus.name, seats: labels.split(", "), passenger, gender: passengerGender, bookingId });
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

          {/* Booking simulation */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-brand" />
                <p className="text-sm font-semibold text-foreground">Booking Simulation</p>
              </div>
              <button
                onClick={() => {
                  setBookingMode((m) => !m);
                  setCart([]);
                }}
                className={cn(
                  "px-4 h-8 rounded-lg text-sm font-medium border transition cursor-pointer",
                  bookingMode
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-card text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {bookingMode ? "Booking Mode: ON" : "Enable Booking Mode"}
              </button>
            </div>

            {bookingMode ? (
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tickets</label>
                  <div className="inline-flex rounded-lg bg-muted p-1 gap-0.5">
                    {([1, 2] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setTicketCount(n);
                          setCart([]);
                        }}
                        className={cn(
                          "px-4 h-8 text-sm font-medium rounded-md transition cursor-pointer",
                          ticketCount === n
                            ? "bg-brand text-brand-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {n === 1 ? "1 ticket" : "2 tickets"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Passenger</label>
                  <div className="inline-flex rounded-lg bg-muted p-1 gap-0.5">
                    <button
                      onClick={() => {
                        setPassengerGender("female");
                        setCart([]);
                      }}
                      className={cn(
                        "px-4 h-8 text-sm font-medium rounded-md transition inline-flex items-center gap-1.5 cursor-pointer",
                        passengerGender === "female"
                          ? "bg-brand text-brand-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <CircleUser className="size-3.5" /> Female
                    </button>
                    <button
                      onClick={() => {
                        setPassengerGender("male");
                        setCart([]);
                      }}
                      className={cn(
                        "px-4 h-8 text-sm font-medium rounded-md transition inline-flex items-center gap-1.5 cursor-pointer",
                        passengerGender === "male"
                          ? "bg-brand text-brand-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <User className="size-3.5" /> Male
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90" onClick={confirmBooking} disabled={cart.length === 0}>
                    <TicketCheck className="size-4" /> Confirm Booking
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setCart([])} disabled={cart.length === 0}>
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Enable booking mode to simulate passenger bookings. When a passenger books one seat of a
                double bed / side-by-side pair, the seat beside them is auto-reserved for the same gender only.
              </p>
            )}

            {bookingMode && cart.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">Cart ({cart.length}/{ticketCount}):</span>
                {cart.map((id) => {
                  const s = seats.find((x) => x.id === id)!;
                  return (
                    <button
                      key={id}
                      onClick={() => handleSeatClick(id)}
                      className="px-2.5 h-7 rounded-full bg-brand/10 border border-brand/25 text-brand font-semibold text-xs hover:bg-brand/20 cursor-pointer"
                      title="Remove from cart"
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
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
                      selectedIds={highlightedIds}
                      onSelect={handleSeatClick}
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
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {LEGEND_ITEMS.map((it) => (
        <span key={it.k} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2.5 rounded-full",
              it.k === "selected" && "bg-chart-5 ring-2 ring-chart-5/30",
              it.k === "maleOnly" && "border-2 border-dashed border-blue-500/60",
              (it.k === "available" || it.k === "booked" || it.k === "female" || it.k === "blocked") &&
                STATUS_META[it.k as SeatStatus].dot,
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
  selectedIds,
  onSelect,
}: {
  seats: Seat[];
  deck: DeckKey;
  arrangement: SeatArrangement;
  statusFilter: "all" | SeatStatus;
  selectedIds: string[];
  onSelect: (id: string) => void;
}) {
  const isTwoTwo = arrangement === "2-2";
  const isDimmed = (seat: Seat) => statusFilter !== "all" && seat.status !== statusFilter;
  const isSel = (id: string) => selectedIds.includes(id);

  if (isTwoTwo) {
    return <SeaterGrid seats={seats} deck={deck} statusFilter={statusFilter} selectedIds={selectedIds} onSelect={onSelect} />;
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
            const selected = isSel(seat.id);
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
                <DoubleBedCell key={row.r} seats={row.seats} selectedIds={selectedIds} isDimmed={isDimmed} onSelect={onSelect} />
              );
            }
            return (
              <div key={row.r} className="flex" style={{ gap: GRID_GAP }}>
                {row.seats.map((seat) => (
                  <SeatCell key={seat.id} seat={seat} selected={isSel(seat.id)} dimmed={isDimmed(seat)} onSelect={onSelect} />
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
  selectedIds,
  onSelect,
}: {
  seats: Seat[];
  deck: DeckKey;
  statusFilter: "all" | SeatStatus;
  selectedIds: string[];
  onSelect: (id: string) => void;
}) {
  const rows = Array.from(new Set(seats.map((s) => s.row))).sort((a, b) => a - b);
  const isDimmed = (seat: Seat) => statusFilter !== "all" && seat.status !== statusFilter;
  const isSel = (id: string) => selectedIds.includes(id);

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
            <div key={r} className="flex justify-center" style={{ gap: GRID_GAP }}>
              {benchCols.map((c) => {
                const seat = rowSeats.find((s) => s.col === c);
                if (!seat) return <div key={c} className="h-9" style={{ width: SEAT_W }} />;
                return (
                  <div key={seat.id} style={{ width: SEAT_W }}>
                    <SeatCell seat={seat} selected={isSel(seat.id)} dimmed={isDimmed(seat)} onSelect={onSelect} />
                  </div>
                );
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
              return <SeatCell key={seat.id} seat={seat} selected={isSel(seat.id)} dimmed={isDimmed(seat)} onSelect={onSelect} />;
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

// Marks a seat that is only for a specific gender (male-only dashed / female-reserved)
function GenderMark({ seat }: { seat: Seat }) {
  const female = seat.status === "female" || seat.reservedFor === "female";
  const male = seat.status === "available" && seat.reservedFor === "male";
  if (female) return <Venus className="size-3 opacity-80" />;
  if (male) return <Mars className="size-3 opacity-80" />;
  return null;
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
      title={`${seat.label} · ${meta.label}${seat.reservedFor ? ` · ${seat.reservedFor === "male" ? "Male" : "Female"} only` : ""} · ₹${seat.price}`}
      className={cn(
        "group relative w-full rounded-lg border-2 px-1 text-[11px] font-semibold transition-all duration-150",
        "flex flex-col items-center justify-center gap-1",
        "hover:-translate-y-0.5 hover:shadow-md",
        heldSeatStyle(seat, meta),
        selected && meta.selected,
        dimmed && "opacity-25",
      )}
      style={{ height: BED_H }}
    >
            {/* Pillow */}
      <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
      <span className="leading-none flex items-center gap-1">
        {seat.label}
        <GenderMark seat={seat} />
      </span>
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
// each berth carries the exact same border styling as a single bed
function DoubleBedCell({
  seats,
  selectedIds,
  isDimmed,
  onSelect,
}: {
  seats: Seat[];
  selectedIds: string[];
  isDimmed: (seat: Seat) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex" style={{ height: BED_H, gap: GRID_GAP }}>
      {seats.map((seat) => {
        const meta = STATUS_META[seat.status];
        return (
          <button
            key={seat.id}
            onClick={() => onSelect(seat.id)}
            title={`${seat.label} · ${meta.label}${seat.reservedFor ? ` · ${seat.reservedFor === "male" ? "Male" : "Female"} only` : ""} · ₹${seat.price}`}
            className={cn(
              "group relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all duration-150",
              "rounded-lg border-2",
              "hover:-translate-y-0.5 hover:shadow-md",
              heldSeatStyle(seat, meta),
              selectedIds.includes(seat.id) && meta.selected,
              isDimmed(seat) && "opacity-25",
            )}
          >
                        <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
            <span className="leading-none flex items-center gap-1">
              {seat.label}
              <GenderMark seat={seat} />
            </span>
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
      title={`${seat.label} · ${meta.label}${seat.reservedFor ? ` · ${seat.reservedFor === "male" ? "Male" : "Female"} only` : ""} · ₹${seat.price}`}
      className={cn(
        "group relative h-9 w-full flex-1 rounded-t-xl rounded-b-md border-2 px-0.5 text-[11px] font-semibold transition-all duration-150",
        "flex items-center justify-center gap-0.5 cursor-pointer",
        "shadow-[inset_0_-3px_0_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:shadow-md",
        heldSeatStyle(seat, meta),
        selected && meta.selected,
        dimmed && "opacity-25",
      )}
    >
            {/* Armrests */}
      <span className="pointer-events-none absolute -left-1 top-2 h-4 w-1 rounded-full bg-current opacity-30" />
      <span className="pointer-events-none absolute -right-1 top-2 h-4 w-1 rounded-full bg-current opacity-30" />

      <span className="leading-none flex items-center gap-1">
        {seat.label}
        <GenderMark seat={seat} />
      </span>
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

          <Row
            label="Gender Restriction"
            value={
              seat.status === "female" || seat.reservedFor === "female"
                ? "Female Only"
                : seat.reservedFor === "male"
                  ? "Male Only"
                  : "None"
            }
          />
          <Row
            label="Availability"
            value={
              seat.reservedFor === "male"
                ? "Reserved for male passenger"
                : seat.reservedFor === "female"
                  ? "Reserved for female passenger"
                  : seat.status === "available"
                    ? "Open"
                    : seat.status === "blocked"
                      ? "Unavailable"
                      : "Reserved"
            }
          />
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