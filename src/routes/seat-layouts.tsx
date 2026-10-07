import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Armchair,
  Ban,
  CheckCircle2,
  CircleUser,
  Mars,
  Venus,
  Lock,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Sparkles,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/client";
import { bookingsKey, cancelBooking } from "@/lib/api/bookings";
import {
  fleetKeys,
  listSchedules,
  listTripSeats,
  scheduleBusType,
  setSeatBlocked,
  setSeatLadiesOnly,
  tripSeatsKey,
  type Schedule,
  type TripSeat,
} from "@/lib/api/fleet";

export const Route = createFileRoute("/seat-layouts")({
  head: () => ({
    meta: [
      { title: "Seat Layout Management — KenRoute" },
      {
        name: "description",
        content: "Configure and manage bus seat layouts, statuses, and pricing across your fleet.",
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
  /** Free, but kept for this gender because the seat beside it is taken. */
  reservedFor?: "male" | "female";
  /** The owner keeps this seat for women on this trip. */
  ladiesOnly?: boolean;
  passenger?: string;
  /** PNR of the ticket holding the seat. */
  bookingId?: string;
  /** Database id of that ticket, for cancelling it. */
  ticketId?: string;
  agent?: string;
  bookingDate?: string;
  boarding?: string;
  dropping?: string;
  gender?: "Male" | "Female" | "Any";
}

type SeatArrangement = "2-1" | "2-2";

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

/** A seat as saved for the trip, in the shape this screen draws. */
function toSeat(s: TripSeat): Seat {
  const b = s.booking;
  const status: SeatStatus =
    s.status === "AVAILABLE"
      ? "available"
      : s.status === "BOOKED"
        ? b?.passenger?.gender === "FEMALE"
          ? "female"
          : "booked"
        : "blocked";
  return {
    id: s.id,
    label: s.seatNumber,
    row: s.row,
    col: s.col,
    deck: s.deck === "UPPER" ? "upper" : "lower",
    kind: s.seatType.includes("SLEEPER") ? "sleeper" : "seater",
    status,
    price: Number(s.fare),
    ladiesOnly: s.ladiesOnly,
    ...(s.reservedFor && {
      reservedFor: s.reservedFor === "FEMALE" ? ("female" as const) : ("male" as const),
    }),
    gender:
      b?.passenger?.gender === "FEMALE"
        ? "Female"
        : b?.passenger?.gender === "MALE"
          ? "Male"
          : "Any",
    passenger: b?.passenger?.name,
    bookingId: b?.pnr,
    ticketId: b?.id,
    agent: b?.agent?.name,
    bookingDate: b ? format(new Date(b.createdAt), "dd MMM yyyy, hh:mm a") : undefined,
    boarding: b?.boardingPoint ?? undefined,
    dropping: b?.droppingPoint ?? undefined,
  };
}

const tripLabel = (t: Schedule) =>
  `${t.bus.registrationNo} · ${t.route.origin} → ${t.route.destination}`;
const tripWhen = (t: Schedule) => format(new Date(t.departureAt), "EEE, dd MMM yyyy, hh:mm a");

// ---------- Helpers ----------
const STATUS_META: Record<
  SeatStatus,
  { label: string; dot: string; chip: string; seat: string; selected: string }
> = {
  available: {
    label: "Available",
    dot: "bg-success",
    chip: "bg-success/15 text-success border-success/25",
    seat: "bg-gradient-to-b from-success/20 to-success/10 border-success/40 text-success hover:from-success/30 hover:to-success/15",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
  booked: {
    label: "Booked (Male)",
    dot: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 border-blue-200",
    seat: "bg-gradient-to-b from-blue-500/20 to-blue-400/10 border-blue-500/40 text-blue-600 hover:from-blue-500/30 hover:to-blue-400/15",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
  female: {
    label: "Booked (Female)",
    dot: "bg-pink-500",
    chip: "bg-pink-100 text-pink-600 border-pink-200",
    seat: "bg-gradient-to-b from-pink-200/70 to-pink-100/60 border-pink-300 text-pink-600 hover:from-pink-300/70 hover:to-pink-200/60",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-gray-400",
    chip: "bg-gray-100 text-gray-600 border-gray-200",
    seat: "bg-gradient-to-b from-gray-400/15 to-gray-400/5 border-dashed border-gray-300/70 text-gray-500 hover:from-gray-400/20 hover:to-gray-400/10",
    selected:
      "ring-[3px] ring-chart-5 ring-offset-2 ring-offset-background shadow-lg shadow-chart-5/20 brightness-110",
  },
};

// A free seat kept for one gender (the seat beside it is taken) gets a dashed border in that colour.
const MALE_ONLY_SEAT =
  "bg-gradient-to-b from-blue-500/10 to-blue-400/5 border-dashed border-blue-400/60 text-blue-500 hover:from-blue-500/15";
const FEMALE_ONLY_SEAT =
  "bg-gradient-to-b from-pink-200/40 to-pink-100/30 border-dashed border-pink-300/70 text-pink-500 hover:from-pink-300/50";
function seatStyle(seat: Seat): string {
  if (seat.reservedFor === "male") return MALE_ONLY_SEAT;
  if (seat.reservedFor === "female") return FEMALE_ONLY_SEAT;
  return STATUS_META[seat.status].seat;
}
const seatHint = (seat: Seat) =>
  `${seat.label} · ${STATUS_META[seat.status].label}${seat.reservedFor ? ` · ${seat.reservedFor === "male" ? "Male" : "Female"} only` : ""} · ₹${seat.price}`;

function GenderMark({ seat }: { seat: Seat }) {
  if (seat.status === "female" || seat.reservedFor === "female")
    return <Venus className="size-3 opacity-80" />;
  if (seat.status === "booked" || seat.reservedFor === "male")
    return <Mars className="size-3 opacity-80" />;
  return null;
}

// ---------- Page ----------
function SeatLayoutsPage() {
  const queryClient = useQueryClient();
  const [pickedTrip, setPickedTrip] = useState<string | null>(null);
  const [deck, setDeck] = useState<DeckKey>("lower");
  const [statusFilter, setStatusFilter] = useState<"all" | SeatStatus>("all");
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  // Trips still to depart come first (soonest on top), then the ones already gone.
  const schedulesQuery = useQuery({ queryKey: fleetKeys.schedules, queryFn: listSchedules });
  const trips = useMemo(() => {
    const now = Date.now();
    const live = (schedulesQuery.data ?? []).filter((t) => t.status !== "CANCELLED");
    const at = (t: Schedule) => new Date(t.departureAt).getTime();
    return [
      ...live.filter((t) => at(t) >= now).sort((a, b) => at(a) - at(b)),
      ...live.filter((t) => at(t) < now).sort((a, b) => at(b) - at(a)),
    ];
  }, [schedulesQuery.data]);
  const trip = trips.find((t) => t.id === pickedTrip) ?? trips[0];
  const tripId = trip?.id ?? "";

  // Re-read every 5 seconds, so a seat an agent just sold turns booked here by itself.
  const seatsQuery = useQuery({
    queryKey: tripSeatsKey(tripId),
    queryFn: () => listTripSeats(tripId),
    enabled: !!trip,
    refetchInterval: 5_000,
  });
  const seats = useMemo(() => (seatsQuery.data ?? []).map(toSeat), [seatsQuery.data]);

  const arrangement: SeatArrangement = trip?.bus.seating === "SEATER" ? "2-2" : "2-1";
  const currentBus = {
    name: trip ? tripLabel(trip) : "No trip",
    model: trip
      ? `${trip.bus.name ?? "Bus"} · ${scheduleBusType(trip)} · ${tripWhen(trip)}`
      : "Add a route on the Routes page first",
  };
  const hasUpperDeck = seats.some((s) => s.deck === "upper");
  const availableDecks: DeckKey[] = hasUpperDeck ? ["lower", "upper"] : ["lower"];

  const onChangeTrip = (id: string) => {
    setPickedTrip(id);
    setSelected(null);
    setDeck("lower");
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: tripSeatsKey(tripId) });
    queryClient.invalidateQueries({ queryKey: fleetKeys.schedules });
    queryClient.invalidateQueries({ queryKey: bookingsKey });
  };
  const blockMutation = useMutation({
    mutationFn: (seat: Seat) => setSeatBlocked(tripId, seat.id, seat.status !== "blocked"),
    onSuccess: (_, seat) => {
      toast.success(`Seat ${seat.label} ${seat.status === "blocked" ? "released" : "blocked"}`);
      refresh();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      refresh();
    },
  });
  const ladiesMutation = useMutation({
    mutationFn: (seat: Seat) => setSeatLadiesOnly(tripId, seat.id, !seat.ladiesOnly),
    onSuccess: (_, seat) => {
      toast.success(
        seat.ladiesOnly
          ? `Seat ${seat.label} is open to everyone`
          : `Seat ${seat.label} is now for women only`,
      );
      refresh();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      refresh();
    },
  });
  // Keep a free seat for women, or open it to everyone again.
  const toggleLadies = (id: string) => {
    const s = seats.find((x) => x.id === id);
    if (s) ladiesMutation.mutate(s);
  };
  const cancelMutation = useMutation({
    mutationFn: (seat: Seat) => cancelBooking(seat.ticketId!),
    onSuccess: (_, seat) => {
      toast.success(`Ticket cancelled, seat ${seat.label} is free again`);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const busy = blockMutation.isPending || cancelMutation.isPending || ladiesMutation.isPending;

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

  // Block a free seat, or put a blocked one back on sale.
  const toggleBlock = (id: string) => {
    const s = seats.find((x) => x.id === id);
    if (!s) return;
    if (s.status === "booked" || s.status === "female") {
      toast.error("This seat is sold. Cancel the ticket to free it.");
      return;
    }
    blockMutation.mutate(s);
  };

  // Free a seat: a blocked one is unblocked, a sold one has its ticket cancelled.
  const release = (id: string) => {
    const s = seats.find((x) => x.id === id);
    if (!s || s.status === "available") return;
    if (s.status === "blocked") return blockMutation.mutate(s);
    if (!s.ticketId) return;
    if (
      window.confirm(
        `Cancel ticket ${s.bookingId} of ${s.passenger ?? "this passenger"} and free seat ${s.label}?`,
      )
    ) {
      cancelMutation.mutate(s);
    }
  };

  return (
    <>
      <PageHeader
        title="Seat Layout Management"
        breadcrumb={`Seat Layouts › ${currentBus.name}`}
        subtitle="See which seats are sold on each trip, live, and block or free seats"
        actions={
          <Button variant="outline" className="gap-2" onClick={refresh} disabled={!trip}>
            <RefreshCw className={cn("size-4", seatsQuery.isFetching && "animate-spin")} /> Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Seats"
          value={String(stats.total)}
          delta={stats.pct(stats.total)}
          icon={Armchair}
          tone="brand"
        />
        <StatCard
          label="Available Seats"
          value={String(stats.available)}
          delta={stats.pct(stats.available)}
          icon={CheckCircle2}
          tone="brand"
        />
        <StatCard
          label="Booked Seats"
          value={String(stats.booked)}
          delta={stats.pct(stats.booked)}
          icon={User}
          tone="danger"
        />
        <StatCard
          label="Booked (Female)"
          value={String(stats.female)}
          delta={stats.pct(stats.female)}
          icon={CircleUser}
          tone="info"
        />
        <StatCard
          label="Blocked Seats"
          value={String(stats.blocked)}
          delta={stats.pct(stats.blocked)}
          icon={Lock}
          tone="navy"
        />
      </div>

      {(schedulesQuery.error || seatsQuery.error) && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not load seats: {errorMessage(schedulesQuery.error ?? seatsQuery.error)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Main */}
        <div className="space-y-4 min-w-0">
          {/* Filters */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Bus &amp; Trip
              </label>
              <Select value={tripId} onValueChange={onChangeTrip} disabled={trips.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue
                    placeholder={schedulesQuery.isLoading ? "Loading…" : "No trips yet"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{tripLabel(t)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {tripWhen(t)} · {scheduleBusType(t)} · {t._count.bookings} of{" "}
                          {t._count.seats} sold
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Deck Type
              </label>
              <Select value={deck} onValueChange={(v) => setDeck(v as DeckKey)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower">Lower Deck</SelectItem>
                  <SelectItem value="upper" disabled={!hasUpperDeck}>
                    Upper Deck{!hasUpperDeck ? " (not available)" : ""}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Seat Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
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
                  setSelected(null);
                  setZoom(1);
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

                  <div
                    className="mx-auto"
                    style={{ width: arrangement === "2-1" ? GRID_WIDTH_21 : GRID_WIDTH_22 }}
                  >
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
                      arrangement={arrangement}
                      statusFilter={statusFilter}
                      selectedId={selected}
                      onSelect={setSelected}
                    />

                    {seats.length === 0 && (
                      <p className="py-10 text-center text-xs text-muted-foreground">
                        {!trip
                          ? "No trips yet. Add one on the Routes page."
                          : seatsQuery.isLoading
                            ? "Loading seats…"
                            : "This trip has no seats."}
                      </p>
                    )}

                    <div className="mt-3 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
                      Back of bus
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
              >
                <ZoomOut className="size-4" /> Zoom Out
              </Button>
              <div className="w-48 h-1.5 rounded-full bg-muted relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  style={{ width: `${((zoom - 0.6) / 0.8) * 100}%` }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
              >
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
              <Sparkles className="size-4 text-brand" /> Seat Controls
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={busy}
                onClick={() =>
                  selected ? toggleBlock(selected) : toast.error("Select a seat first")
                }
              >
                <Ban className="size-4" /> Block / Unblock Seat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={busy}
                onClick={() => (selected ? release(selected) : toast.error("Select a seat first"))}
              >
                <X className="size-4" /> Release Seat
              </Button>
            </div>
          </div>
        </div>

        {/* Side panel (desktop) */}
        <aside className="hidden xl:block">
          <SeatDetailsCard
            seat={selectedSeat}
            bus={currentBus}
            arrangement={arrangement}
            busy={busy}
            onToggleBlock={toggleBlock}
            onRelease={release}
            onToggleLadies={toggleLadies}
            onClear={() => setSelected(null)}
          />
        </aside>
      </div>

      {/* Mobile/tablet sheet */}
      <Sheet
        open={!!selected && typeof window !== "undefined" && window.innerWidth < 1280}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-5 border-b">
            <SheetTitle>Seat Details</SheetTitle>
          </SheetHeader>
          <div className="p-5">
            <SeatDetailsCard
              seat={selectedSeat}
              bus={currentBus}
              arrangement={arrangement}
              busy={busy}
              onToggleBlock={toggleBlock}
              onRelease={release}
              onToggleLadies={toggleLadies}
              onClear={() => setSelected(null)}
              embedded
            />
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
  const items: { k: SeatStatus | "selected" | "maleOnly" | "femaleOnly"; label: string }[] = [
    { k: "available", label: "Available" },
    { k: "booked", label: "Booked (Male)" },
    { k: "female", label: "Booked (Female)" },
    { k: "maleOnly", label: "Male Only" },
    { k: "femaleOnly", label: "Female Only" },
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
              it.k === "selected"
                ? "bg-chart-5 ring-2 ring-chart-5/30"
                : it.k === "maleOnly"
                  ? "border-2 border-dashed border-blue-500/70"
                  : it.k === "femaleOnly"
                    ? "border-2 border-dashed border-pink-400"
                    : STATUS_META[it.k].dot,
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
    return (
      <SeaterGrid
        seats={seats}
        deck={deck}
        statusFilter={statusFilter}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
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
              return (
                <BedCell
                  key={seat.id}
                  seat={seat}
                  selected={selected}
                  dimmed={isDimmed(seat)}
                  onSelect={onSelect}
                />
              );
            }
            return (
              <SeatCell
                key={seat.id}
                seat={seat}
                selected={selected}
                dimmed={isDimmed(seat)}
                onSelect={onSelect}
              />
            );
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
                <DoubleBedCell
                  key={row.r}
                  seats={row.seats}
                  selectedId={selectedId}
                  isDimmed={isDimmed}
                  onSelect={onSelect}
                />
              );
            }
            return (
              <div key={row.r} className="flex" style={{ gap: GRID_GAP }}>
                {row.seats.map((seat) => (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    selected={seat.id === selectedId}
                    dimmed={isDimmed(seat)}
                    onSelect={onSelect}
                  />
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

      {rows.map((r) => {
        const rowSeats = seats.filter((s) => s.row === r);

        // Back bench: seats spanning the full width (including the aisle position)
        const isBackBench = rowSeats.some((s) => s.col === AISLE_COL_22);
        if (isBackBench) {
          const benchCols = [0, 1, AISLE_COL_22, 3, 4];
          return (
            <div
              key={r}
              className="grid"
              style={{ gridTemplateColumns: `repeat(${benchCols.length}, 1fr)`, gap: GRID_GAP }}
            >
              {benchCols.map((c) => {
                const seat = rowSeats.find((s) => s.col === c);
                if (!seat) return <div key={c} className="h-9" />;
                return (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    selected={seat.id === selectedId}
                    dimmed={isDimmed(seat)}
                    onSelect={onSelect}
                  />
                );
              })}
            </div>
          );
        }

        return (
          <div
            key={r}
            className="grid"
            style={{ gridTemplateColumns: GRID_COLS_22, gap: GRID_GAP }}
          >
            {Array.from({ length: 5 }).map((_, c) => {
              if (c === AISLE_COL_22) return <div key={c} />;
              const seat = rowSeats.find((s) => s.col === c);
              if (!seat) return <div key={c} className="h-9" />;
              return (
                <SeatCell
                  key={seat.id}
                  seat={seat}
                  selected={seat.id === selectedId}
                  dimmed={isDimmed(seat)}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        );
      })}
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
      title={seatHint(seat)}
      className={cn(
        "group relative w-full rounded-lg border-2 px-1 text-[11px] font-semibold transition-all duration-150",
        "flex flex-col items-center justify-center gap-1",
        "hover:-translate-y-0.5 hover:shadow-md",
        seatStyle(seat),
        selected && meta.selected,
        dimmed && "opacity-25",
      )}
      style={{ height: BED_H }}
    >
      {/* Pillow */}
      <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
      <span className="leading-none flex items-center gap-1 text-foreground">
        {seat.label}
        <GenderMark seat={seat} />
      </span>
      {/* Foot end */}
      <span className="h-1.5 w-4/5 rounded-sm bg-current opacity-10" />

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy text-navy-foreground text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition shadow-lg z-10">
        {seatHint(seat)}
      </span>
    </button>
  );
}

// One wide rectangle representing a double bed, split into two clickable berths -
// each berth carries the same border styling as a single bed
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
    <div className="flex" style={{ height: BED_H, gap: GRID_GAP }}>
      {seats.map((seat) => {
        const meta = STATUS_META[seat.status];
        return (
          <button
            key={seat.id}
            onClick={() => onSelect(seat.id)}
            title={seatHint(seat)}
            className={cn(
              "group relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all duration-150",
              "rounded-lg border-2",
              "hover:-translate-y-0.5 hover:shadow-md",
              seatStyle(seat),
              seat.id === selectedId && meta.selected,
              isDimmed(seat) && "opacity-25",
            )}
          >
            <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
            <span className="leading-none flex items-center gap-1 text-foreground">
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
      title={seatHint(seat)}
      className={cn(
        "group relative h-9 w-full flex-1 rounded-t-xl rounded-b-md border-2 px-0.5 text-[11px] font-semibold transition-all duration-150",
        "flex items-center justify-center gap-0.5 cursor-pointer",
        "shadow-[inset_0_-3px_0_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:shadow-md",
        seatStyle(seat),
        selected && meta.selected,
        dimmed && "opacity-25",
      )}
    >
      {/* Armrests */}
      <span className="pointer-events-none absolute -left-1 top-2 h-4 w-1 rounded-full bg-current opacity-30" />
      <span className="pointer-events-none absolute -right-1 top-2 h-4 w-1 rounded-full bg-current opacity-30" />

      <span className="leading-none flex items-center gap-1 text-foreground">
        {seat.label}
        <GenderMark seat={seat} />
      </span>
      {seat.status === "booked" && <User className="size-2.5 opacity-80" />}
      {seat.status === "female" && <CircleUser className="size-2.5 opacity-80" />}
      {seat.status === "blocked" && <X className="size-2.5 opacity-70" />}

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy text-navy-foreground text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition shadow-lg z-10">
        {seatHint(seat)}
      </span>
    </button>
  );
}

function SeatDetailsCard({
  seat,
  bus,
  arrangement,
  busy,
  onToggleBlock,
  onRelease,
  onToggleLadies,
  onClear,
  embedded,
}: {
  seat: Seat | null;
  bus: { name: string; model: string };
  arrangement: SeatArrangement;
  busy: boolean;
  onToggleBlock: (id: string) => void;
  onRelease: (id: string) => void;
  onToggleLadies: (id: string) => void;
  onClear: () => void;
  embedded?: boolean;
}) {
  if (!seat) {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-2xl shadow-sm p-6 text-center",
          embedded && "border-0 shadow-none p-0",
        )}
      >
        <div className="size-14 rounded-2xl bg-muted grid place-items-center mx-auto mb-3">
          <Armchair className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">No seat selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Click any seat in the layout to view its details, passenger info and quick actions.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-left">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Current Trip
          </p>
          <p className="text-sm font-medium">{bus.name}</p>
          <p className="text-xs text-muted-foreground">{bus.model}</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[seat.status];
  const sold = seat.status === "booked" || seat.status === "female";
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
    <div
      className={cn(
        "bg-card border border-border rounded-2xl shadow-sm overflow-hidden",
        embedded && "border-0 shadow-none rounded-none",
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-semibold">Seat Details</h3>
          <button
            onClick={onClear}
            className="size-7 grid place-items-center rounded-md hover:bg-muted cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <Badge variant="outline" className="rounded-full text-[10px] mb-2">
              Selected Seat
            </Badge>
            <p className="text-3xl font-bold tracking-tight">{seat.label}</p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium border",
                meta.chip,
              )}
            >
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
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                  meta.chip,
                )}
              >
                <span className={cn("size-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            }
          />

          <Row
            label="Gender Restriction"
            value={
              seat.reservedFor === "female"
                ? "Female Only"
                : seat.reservedFor === "male"
                  ? "Male Only"
                  : "None"
            }
          />
          <Row
            label="Availability"
            value={
              seat.status === "available"
                ? "Open"
                : seat.status === "blocked"
                  ? "Unavailable"
                  : "Reserved"
            }
          />
          {seat.passenger && <Row label="Passenger Name" value={seat.passenger} />}
          {seat.gender && seat.passenger && <Row label="Gender" value={seat.gender} />}
          {seat.bookingId && <Row label="PNR" value={seat.bookingId} />}
          {seat.agent && <Row label="Booked By" value={seat.agent} />}
          {seat.bookingDate && <Row label="Booking Date" value={seat.bookingDate} />}
          {seat.boarding && <Row label="Boarding Point" value={seat.boarding} />}
          {seat.dropping && <Row label="Dropping Point" value={seat.dropping} />}
        </dl>

        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button
            variant="outline"
            className="gap-2"
            disabled={busy || sold}
            onClick={() => onToggleBlock(seat.id)}
          >
            <Ban className="size-4" />
            {seat.status === "blocked" ? "Unblock Seat" : "Block Seat"}
          </Button>
          <Button
            className="gap-2 bg-danger text-white hover:bg-danger/90"
            disabled={busy || seat.status === "available"}
            onClick={() => onRelease(seat.id)}
          >
            <X className="size-4" /> {sold ? "Cancel Ticket" : "Release Seat"}
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full mt-2 gap-2"
          disabled={busy || sold || seat.status === "blocked"}
          onClick={() => onToggleLadies(seat.id)}
        >
          <Venus className="size-4" />
          {seat.ladiesOnly ? "Open to Everyone" : "Keep for Women Only"}
        </Button>

        {sold && (
          <Button asChild variant="outline" className="w-full mt-2 gap-2">
            <Link to="/bookings">
              <BusIcon className="size-4" /> View Booking Details
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueNode,
  strong,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", strong && "font-semibold")}>{valueNode ?? value}</dd>
    </div>
  );
}
