import { useQuery } from "@tanstack/react-query";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  conductorKeys,
  formatDateTime,
  listBusOptions,
  listUpcomingTrips,
  type TripOption,
} from "@/lib/api/conductors";

// Radix Select cannot hold an empty value, so "no assignment" needs its own token.
export const NONE = "none";

interface Props {
  /** Whose seat on the trip is being filled. */
  role: "conductor" | "driver";
  /** The person being edited; undefined while adding a new one. */
  selfId?: string;
  /** Their current assignment, kept in the lists while they load. */
  current: TripOption | null;
  busId: string;
  tripId: string;
  onChange: (next: { busId: string; tripId: string }) => void;
}

/**
 * The two dropdowns that put a driver or conductor on a trip. "Route & Time" lists every
 * upcoming trip (the same route appears once per departure); choosing one fills in its bus.
 * Choosing a bus first narrows the list to that bus.
 */
export function TripAssignment({ role, selfId, current, busId, tripId, onChange }: Props) {
  const { data: buses = [] } = useQuery({ queryKey: conductorKeys.buses, queryFn: listBusOptions });
  const { data: allTrips = [], isFetching } = useQuery({
    queryKey: conductorKeys.allTrips,
    queryFn: () => listUpcomingTrips(),
  });

  const trips = busId === NONE ? allTrips : allTrips.filter((t) => t.bus.id === busId);
  const hint = isFetching
    ? "Loading trips…"
    : allTrips.length === 0
      ? "No upcoming trips. Add one on the Routes page."
      : trips.length === 0
        ? "This bus has no upcoming trips."
        : undefined;

  return (
    <>
      <Field label="Assigned Route & Time" hint={hint}>
        <Select
          value={tripId}
          onValueChange={(value) => {
            const picked = allTrips.find((t) => t.id === value);
            // A trip already has its bus, so the bus follows the trip.
            onChange({ tripId: value, busId: picked ? picked.bus.id : busId });
          }}
        >
          <SelectTrigger className="h-auto min-h-11 rounded-xl py-2 text-left">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not assigned</SelectItem>
            {current && tripId === current.id && !trips.some((t) => t.id === current.id) && (
              <SelectItem value={current.id}>
                {current.route.origin} → {current.route.destination} ·{" "}
                {formatDateTime(current.departureAt)}
              </SelectItem>
            )}
            {trips.map((t) => {
              const holder = t[role];
              const takenBy = holder && holder.id !== selfId ? holder.name : null;
              return (
                <SelectItem key={t.id} value={t.id} disabled={takenBy !== null}>
                  {t.route.origin} → {t.route.destination} · {formatDateTime(t.departureAt)}
                  {busId === NONE ? ` · ${t.bus.registrationNo}` : ""}
                  {takenBy ? ` (assigned to ${takenBy})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Assigned Bus" hint={buses.length === 0 ? "No buses saved yet." : undefined}>
        <Select
          value={busId}
          onValueChange={(value) => {
            const stillFits = allTrips.some((t) => t.id === tripId && t.bus.id === value);
            onChange({ busId: value, tripId: stillFits ? tripId : NONE });
          }}
        >
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not assigned</SelectItem>
            {current && busId === current.bus.id && !buses.some((b) => b.id === current.bus.id) && (
              <SelectItem value={current.bus.id}>{current.bus.registrationNo}</SelectItem>
            )}
            {buses.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.registrationNo}
                {b.name ? ` — ${b.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
