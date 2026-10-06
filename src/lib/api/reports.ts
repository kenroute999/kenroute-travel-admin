import { api } from "./client";

interface Tally {
  bookings: number;
  revenue: number;
}

/** Figures for a range of days, added up on the server from saved bookings and trips. */
export interface Summary {
  range: { from: string; to: string; days: number };
  totals: Tally & {
    cancelled: number;
    averageFare: number;
    commission: number;
    trips: number;
    occupancyPct: number;
  };
  today: Tally;
  fleet: {
    activeBuses: number;
    activeRoutes: number;
    upcomingTrips: number;
    activeTrips: number;
    seatsAvailable: number;
    seatsSold: number;
    occupancyPct: number;
  };
  daily: (Tally & { date: string; cancelled: number; occupancyPct: number })[];
  bySource: (Tally & { source: string })[];
  byRoute: (Tally & { route: string; trips: number; occupancyPct: number })[];
  byBus: (Tally & { bus: string; name: string; trips: number; occupancyPct: number })[];
  byAgent: (Tally & { name: string; code: string; commission: number })[];
  recent: {
    pnr: string;
    seat: string;
    status: string;
    source: string;
    fare: number;
    createdAt: string;
    passenger: string;
    agent: string;
    route: string;
  }[];
}

/** Days are YYYY-MM-DD in India time. With no range the server gives the last 7 days. */
export const summaryKey = (from?: string, to?: string) =>
  ["reports", "summary", from ?? "", to ?? ""] as const;

export const getSummary = (from?: string, to?: string) =>
  api<Summary>(from && to ? `/reports/summary?from=${from}&to=${to}` : "/reports/summary");

export const SOURCE_COLORS: Record<string, string> = {
  redBus: "#e63946",
  AbhiBus: "#f4a261",
  Website: "var(--brand)",
  Agent: "var(--chart-5)",
  Counter: "var(--navy)",
};
