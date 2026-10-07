import { api } from "./client";

export interface BusOption {
  id: string;
  registrationNo: string;
  name: string | null;
}

/** One bus on one route at one date and time. */
export interface TripOption {
  id: string;
  departureAt: string;
  arrivalAt: string;
  bus: BusOption;
  route: { id: string; origin: string; destination: string };
}

export interface UpcomingTrip extends TripOption {
  conductor: { id: string; name: string } | null;
  driver: { id: string; name: string } | null;
}

export interface Conductor {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  /** Next upcoming trip this conductor is assigned to. */
  trip: TripOption | null;
  createdAt: string;
}

export interface ConductorInput {
  name: string;
  phone: string;
  password: string;
  isActive: boolean;
}

/** tripId null clears the assignment. */
export type ConductorUpdate = Partial<ConductorInput> & { tripId?: string | null };

export const conductorKeys = {
  list: ["conductors"] as const,
  buses: ["buses", "options"] as const,
  allTrips: ["trips", "upcoming"] as const,
};

// ponytail: one page of 100 and search in the browser; move to server search + paging when an operator has more conductors than that.
export const listConductors = () =>
  api<{ items: Conductor[] }>("/conductors?limit=100").then((r) => r.items);

export const createConductor = (body: ConductorInput) =>
  api<Conductor>("/conductors", { method: "POST", body });

export const updateConductor = (id: string, body: ConductorUpdate) =>
  api<Conductor>(`/conductors/${id}`, { method: "PATCH", body });

export const deleteConductor = (id: string) => api<void>(`/conductors/${id}`, { method: "DELETE" });

export const listBusOptions = () => api<{ items: BusOption[] }>("/buses").then((r) => r.items);

// ponytail: the next 100 trips of the company in one go; the forms filter by bus in the
// browser. Ask the server per bus again if an operator schedules more than that ahead.
export const listUpcomingTrips = () =>
  api<{ items: UpcomingTrip[] }>("/trips?limit=100").then((r) => r.items);

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** e.g. "Tue, 06 Oct, 08:00 pm" in Indian time. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
