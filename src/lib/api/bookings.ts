import { api } from "./client";

/** One booked seat, as the owner sees it: any channel, any agent. */
export interface OwnerBooking {
  id: string;
  pnr: string;
  status: "CREATED" | "CONFIRMED" | "BOARDED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  source: "AGENT" | "COUNTER" | "PHONE" | "CORPORATE" | "OTA";
  channel: "OWN_AGENT" | "REDBUS" | "ABHIBUS";
  /** Decimal string. */
  fare: string;
  paymentMode: "CASH" | "UPI" | null;
  boardingPoint: string | null;
  droppingPoint: string | null;
  createdAt: string;
  seatNumber: string;
  deck: "LOWER" | "UPPER";
  agent: { id: string; name: string; agentCode: string } | null;
  trip: {
    departureAt: string;
    arrivalAt: string;
    route: { origin: string; destination: string };
    bus: { registrationNo: string; name: string | null };
  };
  passenger: {
    name: string;
    age: number | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null;
    phone: string;
    idProofType: string | null;
    boarded: boolean;
  } | null;
}

export const bookingsKey = ["bookings"] as const;

export const listBookings = () => api<{ items: OwnerBooking[] }>("/bookings").then((r) => r.items);

export const ID_PROOFS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
] as const;

/** A ticket the owner sells at the counter. The fare comes from the seat, never from here. */
export interface NewBooking {
  tripId: string;
  source: "COUNTER";
  boardingPoint: string;
  droppingPoint: string;
  paymentMode: "CASH" | "UPI";
  passengers: {
    seatId: string;
    name: string;
    age: number;
    gender: "MALE" | "FEMALE" | "OTHER";
    phone: string;
    idProofType: (typeof ID_PROOFS)[number]["value"];
    idProofNumber: string;
  }[];
}

export const createBooking = (body: NewBooking) =>
  api<{ pnr: string; totalFare: string; bookings: { id: string; seatNumber: string }[] }>(
    "/bookings",
    {
      method: "POST",
      body,
    },
  );

export const cancelBooking = (id: string) =>
  api<{ id: string; status: string }>(`/bookings/${id}/cancel`, { method: "POST" });

/** What a ticket's QR code holds: PNR plus seat, unique per ticket and free of personal details. */
export const ticketCode = (pnr: string, seat: string) => `${pnr}-${seat}`;
