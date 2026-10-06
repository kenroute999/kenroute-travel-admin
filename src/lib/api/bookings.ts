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

export const cancelBooking = (id: string) =>
  api<{ id: string; status: string }>(`/bookings/${id}/cancel`, { method: "POST" });

/** What a ticket's QR code holds: PNR plus seat, unique per ticket and free of personal details. */
export const ticketCode = (pnr: string, seat: string) => `${pnr}-${seat}`;
