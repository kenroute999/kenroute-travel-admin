import { Check, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TripSeat } from "@/lib/api/fleet";

const isBed = (seat: TripSeat) => seat.seatType.includes("SLEEPER");

function seatClass(seat: TripSeat, picked: boolean) {
  if (picked) return "bg-amber-200 ring-2 ring-amber-500 text-amber-900";
  if (seat.status === "AVAILABLE") {
    // Free, but beside a booked seat: only a passenger of the same gender may take it.
    if (seat.reservedFor === "FEMALE")
      return "bg-pink-50 outline-2 outline-dashed outline-pink-400 text-pink-700 hover:bg-pink-100";
    if (seat.reservedFor === "MALE")
      return "bg-blue-50 outline-2 outline-dashed outline-blue-400 text-blue-700 hover:bg-blue-100";
    return "bg-emerald-100 ring-1 ring-emerald-400 text-emerald-900 hover:ring-2";
  }
  if (seat.status === "BOOKED") {
    return seat.booking?.passenger?.gender === "FEMALE"
      ? "bg-pink-200 ring-1 ring-pink-400 text-pink-900 cursor-not-allowed"
      : "bg-blue-200 ring-1 ring-blue-400 text-blue-900 cursor-not-allowed";
  }
  return "bg-slate-200 ring-1 ring-slate-300 text-slate-500 cursor-not-allowed";
}

function seatTitle(seat: TripSeat) {
  const what = `${seat.seatType === "DOUBLE_SLEEPER" ? "Double bed" : isBed(seat) ? "Single bed" : "Seat"} ${seat.seatNumber}`;
  if (seat.status === "AVAILABLE") {
    const only = seat.reservedFor
      ? ` · ${seat.reservedFor === "FEMALE" ? "Female" : "Male"} passenger only`
      : "";
    return `${what} · Available${only} · ₹${Number(seat.fare).toLocaleString("en-IN")}`;
  }
  if (seat.status === "BOOKED")
    return `${what} · Booked${seat.booking?.passenger ? ` by ${seat.booking.passenger.name}` : ""}`;
  return `${what} · Blocked`;
}

/**
 * One deck of the bus, drawn the same way the Agent app draws it: lengthwise with the
 * driver on the left. A seat's `row` runs front to back (left to right here) and its
 * `col` runs across the width; a column with no seats is the aisle. A bed is as long
 * as two seats.
 */
export function BusSeatMap({
  deckLabel,
  seats,
  selectedId,
  onPick,
}: {
  deckLabel: string;
  seats: TripSeat[];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  const widest = Math.max(0, ...seats.map((s) => s.col));
  const used = new Set(seats.map((s) => s.col));
  const tracks = Array.from({ length: widest + 1 }, (_, col) =>
    used.has(col) ? "2.75rem" : "0.75rem",
  );

  return (
    <div className="relative mt-3 rounded-2xl border-2 border-slate-300 bg-slate-50 p-3 pt-4">
      <div className="absolute -top-2.5 left-4 rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
        {deckLabel}
      </div>
      <div className="flex gap-3">
        <div className="flex w-12 shrink-0 flex-col items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5 text-[9px] font-medium text-slate-500">
          <div className="flex flex-col items-center gap-1">
            <div className="size-7 rounded-full border-[3px] border-slate-400" />
            Driver
          </div>
          <span className="text-center leading-tight">Entry →</span>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div
            className="grid auto-cols-[2.1rem] grid-flow-col gap-1.5 p-0.5"
            style={{ gridTemplateRows: tracks.join(" ") }}
          >
            {seats.map((seat) => {
              const picked = seat.id === selectedId;
              const free = seat.status === "AVAILABLE";
              const bed = isBed(seat);
              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={!free}
                  title={seatTitle(seat)}
                  aria-pressed={picked}
                  onClick={() => onPick(picked ? "" : seat.id)}
                  style={{
                    gridColumn: bed ? `${seat.row * 2 + 1} / span 2` : `${seat.row + 1}`,
                    gridRowStart: seat.col + 1,
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md text-[10px] font-semibold leading-tight transition",
                    seatClass(seat, picked),
                  )}
                >
                  <span>
                    {seat.seatNumber}
                    {free && seat.reservedFor && (seat.reservedFor === "FEMALE" ? " ♀" : " ♂")}
                  </span>
                  {picked && <Check className="size-3" />}
                  {!picked && free && (
                    <span className="text-[8px] font-medium opacity-70">
                      ₹{Number(seat.fare).toLocaleString("en-IN")}
                    </span>
                  )}
                  {seat.status === "BOOKED" && <User className="size-3" />}
                  {(seat.status === "BLOCKED" || seat.status === "HELD") && (
                    <X className="size-3" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
