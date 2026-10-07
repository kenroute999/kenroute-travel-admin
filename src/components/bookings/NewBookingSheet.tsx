import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, TicketCheck } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { BusSeatMap } from "@/components/bookings/BusSeatMap";
import { errorMessage } from "@/lib/api/client";
import { bookingsKey, createBooking, ID_PROOFS, type NewBooking } from "@/lib/api/bookings";
import { fleetKeys, listSchedules, listTripSeats, tripSeatsKey } from "@/lib/api/fleet";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

type Passenger = NewBooking["passengers"][number];
const blank = {
  seatId: "",
  name: "",
  age: "",
  gender: "MALE" as Passenger["gender"],
  phone: "",
  idProofType: "AADHAAR" as Passenger["idProofType"],
  idProofNumber: "",
  boardingPoint: "",
  droppingPoint: "",
  paymentMode: "CASH" as NewBooking["paymentMode"],
};

/**
 * The owner books a ticket at the office counter: pick the trip and a free seat, enter the passenger.
 * ponytail: one passenger per booking; book again for the next seat, or add rows here if groups become common.
 */
export function NewBookingSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [tripId, setTripId] = useState("");
  const [form, setForm] = useState(blank);
  const set = (patch: Partial<typeof blank>) => setForm((f) => ({ ...f, ...patch }));

  const schedules = useQuery({
    queryKey: fleetKeys.schedules,
    queryFn: listSchedules,
    enabled: open,
  });
  const trips = (schedules.data ?? [])
    .filter((t) => t.status === "SCHEDULED" && new Date(t.departureAt) > new Date())
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  const trip = trips.find((t) => t.id === tripId);

  const seatsQuery = useQuery({
    queryKey: tripSeatsKey(tripId),
    queryFn: () => listTripSeats(tripId),
    enabled: open && !!trip,
    // Seats sold elsewhere while this form is open turn booked by themselves.
    refetchInterval: 5_000,
  });
  const allSeats = seatsQuery.data ?? [];
  const freeSeats = allSeats.filter((s) => s.status === "AVAILABLE");
  const seat = freeSeats.find((s) => s.id === form.seatId);

  const pickTrip = (id: string) => {
    setTripId(id);
    set({ seatId: "", boardingPoint: "", droppingPoint: "" });
  };

  const save = useMutation({
    mutationFn: () =>
      createBooking({
        tripId,
        source: "COUNTER",
        boardingPoint: form.boardingPoint.trim(),
        droppingPoint: form.droppingPoint.trim(),
        paymentMode: form.paymentMode,
        passengers: [
          {
            seatId: form.seatId,
            name: form.name.trim(),
            age: Number(form.age),
            gender: form.gender,
            phone: form.phone.trim(),
            idProofType: form.idProofType,
            idProofNumber: form.idProofNumber.trim(),
          },
        ],
      }),
    onSuccess: (ticket) => {
      toast.success(
        `Booked. PNR ${ticket.pnr}, seat ${ticket.bookings[0]?.seatNumber}, ₹${Number(ticket.totalFare).toLocaleString("en-IN")}`,
      );
      queryClient.invalidateQueries({ queryKey: bookingsKey });
      queryClient.invalidateQueries({ queryKey: fleetKeys.schedules });
      queryClient.invalidateQueries({ queryKey: tripSeatsKey(tripId) });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setForm(blank);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      queryClient.invalidateQueries({ queryKey: tripSeatsKey(tripId) });
    },
  });

  const ready =
    !!trip &&
    !!seat &&
    form.name.trim().length >= 2 &&
    Number(form.age) >= 1 &&
    /^\d{10}$/.test(form.phone.trim()) &&
    form.idProofNumber.trim().length >= 5 &&
    !!form.boardingPoint.trim() &&
    !!form.droppingPoint.trim();

  const stop = (field: "boardingPoint" | "droppingPoint", label: string, options: string[]) => (
    <Field label={label} required>
      {options.length > 0 ? (
        <select
          className={selectClass}
          value={form[field]}
          onChange={(e) => set({ [field]: e.target.value })}
        >
          <option value="">Choose</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <Input
          value={form[field]}
          maxLength={80}
          onChange={(e) => set({ [field]: e.target.value })}
        />
      )}
    </Field>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="p-5 border-b">
          <SheetTitle>New Booking</SheetTitle>
        </SheetHeader>
        <form
          className="flex-1 overflow-auto p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) save.mutate();
          }}
        >
          <Field
            label="Bus & Trip"
            required
            hint={
              trips.length === 0 && !schedules.isLoading
                ? "No upcoming trips. Add one on the Routes page."
                : undefined
            }
          >
            <select
              className={selectClass}
              value={tripId}
              onChange={(e) => pickTrip(e.target.value)}
            >
              <option value="">{schedules.isLoading ? "Loading…" : "Choose a trip"}</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.route.origin} → {t.route.destination} ·{" "}
                  {format(new Date(t.departureAt), "dd MMM, hh:mm a")} · {t.bus.registrationNo}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Seat"
            required
            hint={
              seat?.reservedFor
                ? `Beside a ${seat.reservedFor.toLowerCase()} passenger: ${seat.reservedFor.toLowerCase()} only`
                : undefined
            }
          >
            <p className="text-xs text-muted-foreground">
              {!trip
                ? "Choose a trip first"
                : seatsQuery.isLoading
                  ? "Loading…"
                  : `${freeSeats.length} of ${allSeats.length} seats free. Blue = booked by a man, pink = booked by a woman, grey = blocked.`}
            </p>
            {(["LOWER", "UPPER"] as const).map((deck) => {
              const onDeck = allSeats.filter((s) => s.deck === deck);
              if (onDeck.length === 0) return null;
              return (
                <BusSeatMap
                  key={deck}
                  deckLabel={deck === "UPPER" ? "Upper deck" : "Lower deck"}
                  seats={onDeck}
                  selectedId={form.seatId}
                  onPick={(seatId) => set({ seatId })}
                />
              );
            })}
          </Field>

          <Field label="Passenger Name" required>
            <Input
              value={form.name}
              maxLength={80}
              onChange={(e) => set({ name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" required>
              <Input
                type="number"
                min={1}
                max={120}
                value={form.age}
                onChange={(e) => set({ age: e.target.value })}
              />
            </Field>
            <Field label="Gender" required>
              <select
                className={selectClass}
                value={form.gender}
                onChange={(e) => set({ gender: e.target.value as Passenger["gender"] })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>
          <Field label="Mobile Number" required hint="10 digits">
            <Input
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID Proof" required>
              <select
                className={selectClass}
                value={form.idProofType}
                onChange={(e) => set({ idProofType: e.target.value as Passenger["idProofType"] })}
              >
                {ID_PROOFS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ID Number" required>
              <Input
                value={form.idProofNumber}
                maxLength={20}
                onChange={(e) => set({ idProofNumber: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stop("boardingPoint", "Boarding Point", trip?.route.boardingPoints ?? [])}
            {stop("droppingPoint", "Dropping Point", trip?.route.droppingPoints ?? [])}
          </div>
          <Field label="Payment" required>
            <select
              className={selectClass}
              value={form.paymentMode}
              onChange={(e) => set({ paymentMode: e.target.value as NewBooking["paymentMode"] })}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">Amount to collect</span>
            <span className="text-lg font-bold">
              {seat ? `₹${Number(seat.fare).toLocaleString("en-IN")}` : "—"}
            </span>
          </div>
          <Button
            type="submit"
            disabled={!ready || save.isPending}
            className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TicketCheck className="size-4" />
            )}{" "}
            Confirm Booking
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
