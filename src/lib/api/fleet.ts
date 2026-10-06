import type { ACType, Bus, BusStatus, BusType, FareKey } from "@/lib/buses";
import { api } from "./client";

// ---------------------------------------------------------------- buses

type Seating = "SLEEPER" | "SEATER" | "SEATER_SLEEPER";
type ApiStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

const TYPE_OF: Record<Seating, BusType> = {
  SLEEPER: "Sleeper (2+1)",
  SEATER: "Seater (2+2)",
  SEATER_SLEEPER: "Seater/Sleeper (2+1)",
};
const SEATING_OF: Record<BusType, Seating> = {
  "Sleeper (2+1)": "SLEEPER",
  "Seater (2+2)": "SEATER",
  "Seater/Sleeper (2+1)": "SEATER_SLEEPER",
};
const STATUS_OF: Record<ApiStatus, BusStatus> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
};
const COLOR_OF: Record<BusStatus, string> = {
  Active: "text-emerald-500",
  Maintenance: "text-amber-500",
  Inactive: "text-rose-500",
};

interface ApiBus {
  id: string;
  registrationNo: string;
  name: string | null;
  isAc: boolean;
  seating: Seating;
  status: ApiStatus;
  seats: number;
}

/** A bus from the database, in the shape the screens already use. */
export interface FleetBus extends Bus {
  id: string;
}

export type BusInput = Omit<Bus, "color">;

function toFleetBus(b: ApiBus): FleetBus {
  const status = STATUS_OF[b.status];
  return {
    id: b.id,
    no: b.registrationNo,
    name: b.name ?? "",
    type: TYPE_OF[b.seating],
    ac: b.isAc ? "AC" : "Non-AC",
    seats: b.seats,
    status,
    color: COLOR_OF[status],
  };
}

function toApiBus(b: BusInput) {
  return {
    registrationNo: b.no,
    name: b.name,
    seating: SEATING_OF[b.type],
    isAc: (b.ac satisfies ACType) === "AC",
    seats: b.seats,
    status: b.status.toUpperCase(),
  };
}

export const fleetKeys = {
  buses: ["buses"] as const,
  schedules: ["schedules"] as const,
};

export const listBuses = () =>
  api<{ items: ApiBus[] }>("/buses").then((r) => r.items.map(toFleetBus));

export const createBus = (bus: BusInput) =>
  api<ApiBus>("/buses", { method: "POST", body: toApiBus(bus) }).then(toFleetBus);

export const updateBus = (id: string, bus: BusInput) =>
  api<ApiBus>(`/buses/${id}`, { method: "PATCH", body: toApiBus(bus) }).then(toFleetBus);

export const deleteBus = (id: string) => api<void>(`/buses/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------- schedules (the Routes screen)

/** One trip with its route, as the Routes screen lists it. */
export interface Schedule {
  id: string;
  departureAt: string;
  arrivalAt: string;
  /** Lowest fare on the trip, as a decimal string. */
  fare: string;
  fares: Partial<Record<FareKey, number>> | null;
  status: "SCHEDULED" | "BOARDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "MAINTENANCE";
  route: {
    id: string;
    origin: string;
    destination: string;
    boardingPoints: string[];
    droppingPoints: string[];
  };
  bus: { id: string; registrationNo: string; name: string | null; isAc: boolean; seating: Seating };
  conductor: { id: string; name: string } | null;
  _count: { seats: number; bookings: number };
}

export interface ScheduleInput {
  origin: string;
  destination: string;
  busId: string;
  /** ISO date-times. */
  departureAt: string;
  arrivalAt: string;
  boardingPoints: string[];
  droppingPoints: string[];
  fares: Partial<Record<FareKey, number>>;
  status: ApiStatus;
}

export const scheduleBusType = (s: Schedule) => TYPE_OF[s.bus.seating];

export const listSchedules = () => api<{ items: Schedule[] }>("/schedules").then((r) => r.items);

export const createSchedule = (body: ScheduleInput) =>
  api<Schedule>("/schedules", { method: "POST", body });

export const updateSchedule = (id: string, body: Partial<ScheduleInput>) =>
  api<Schedule>(`/schedules/${id}`, { method: "PATCH", body });

export const deleteSchedule = (id: string) => api<void>(`/schedules/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------- seats of one trip (the Seat Layouts screen)

/** One seat on a trip, with the ticket that holds it now (if any). */
export interface TripSeat {
  id: string;
  seatNumber: string;
  deck: "LOWER" | "UPPER";
  row: number;
  col: number;
  seatType: string;
  /** Decimal string. */
  fare: string;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED";
  booking: {
    id: string;
    pnr: string;
    createdAt: string;
    boardingPoint: string | null;
    droppingPoint: string | null;
    agent: { name: string } | null;
    passenger: { name: string; gender: "MALE" | "FEMALE" | "OTHER" | null } | null;
  } | null;
}

export const tripSeatsKey = (tripId: string) => ["schedules", tripId, "seats"] as const;

export const listTripSeats = (tripId: string) =>
  api<{ seats: TripSeat[] }>(`/schedules/${tripId}/seats`).then((r) => r.seats);

export const setSeatBlocked = (tripId: string, seatId: string, blocked: boolean) =>
  api<{ id: string; status: string }>(`/schedules/${tripId}/seats/${seatId}`, {
    method: "PATCH",
    body: { blocked },
  });
