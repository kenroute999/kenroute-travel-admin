import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { Field } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NONE, TripAssignment } from "@/components/staff/TripAssignment";
import { errorMessage } from "@/lib/api/client";
import {
  conductorKeys,
  createConductor,
  deleteConductor,
  formatDateTime,
  listConductors,
  updateConductor,
  type Conductor,
} from "@/lib/api/conductors";

export const Route = createFileRoute("/conductors")({
  head: () => ({
    meta: [
      { title: "Conductors — KenRoute" },
      { name: "description", content: "Manage conductors and the trips they are assigned to." },
    ],
  }),
  component: ConductorsPage,
});

function ConductorsPage() {
  const queryClient = useQueryClient();
  const {
    data: rows = [],
    isPending,
    isError,
    error,
  } = useQuery({ queryKey: conductorKeys.list, queryFn: listConductors });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Conductor | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // The bus follows the chosen trip, so these two are controlled together.
  const [assigned, setAssigned] = useState({ busId: NONE, tripId: NONE });
  const tripId = assigned.tripId;

  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const password = String(fd.get("password"));
      const fields = {
        name: String(fd.get("name")).trim(),
        phone: String(fd.get("phone")).trim(),
        isActive: fd.get("status") !== "Inactive",
      };
      if (!editing) {
        // The login is created first; the trip is then given like any later change.
        const created = await createConductor({ ...fields, password });
        return tripId === NONE ? created : updateConductor(created.id, { tripId });
      }
      return updateConductor(editing.id, {
        ...fields,
        ...(password && { password }),
        tripId: tripId === NONE ? null : tripId,
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Conductor updated" : "Conductor added");
      setOpen(false);
      // Trip lists and the Buses page show who is assigned, so they are stale too.
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      return queryClient.invalidateQueries({ queryKey: conductorKeys.list });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: deleteConductor,
    onSuccess: () => {
      toast.success("Conductor deleted");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      return queryClient.invalidateQueries({ queryKey: conductorKeys.list });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(q));
  }, [rows, query]);

  const openAdd = () => {
    setEditing(null);
    setAssigned({ busId: NONE, tripId: NONE });
    setShowPassword(false);
    setOpen(true);
  };

  const openEdit = (row: Conductor) => {
    setEditing(row);
    setAssigned({ busId: row.trip?.bus.id ?? NONE, tripId: row.trip?.id ?? NONE });
    setShowPassword(false);
    setOpen(true);
  };

  const handleDelete = (row: Conductor) => {
    if (window.confirm(`Delete conductor "${row.name}"?`)) remove.mutate(row.id);
  };

  return (
    <>
      <PageHeader
        title="Conductors"
        breadcrumb="Conductors"
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:opacity-90"
          >
            <Plus className="size-4" /> Add Conductor
          </button>
        }
      />
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conductors..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Mobile</th>
                <th className="px-6 py-3 font-medium">Assigned Bus</th>
                <th className="px-6 py-3 font-medium">Assigned Route</th>
                <th className="px-6 py-3 font-medium">Date &amp; Time</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.name}</td>
                  <td className="px-6 py-4">{r.phone}</td>
                  {r.trip ? (
                    <>
                      <td className="px-6 py-4">
                        <div className="font-medium">{r.trip.bus.registrationNo}</div>
                        <div className="text-xs text-muted-foreground">{r.trip.bus.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {r.trip.route.origin} → {r.trip.route.destination}
                      </td>
                      <td className="px-6 py-4">
                        <div>{formatDateTime(r.trip.departureAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          Arrives {formatDateTime(r.trip.arrivalAt)}
                        </div>
                      </td>
                    </>
                  ) : (
                    <td colSpan={3} className="px-6 py-4 text-muted-foreground">
                      Not assigned
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <StatusPill status={r.isActive ? "Active" : "Inactive"} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        aria-label="Edit"
                        onClick={() => openEdit(r)}
                        className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-brand"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label="Delete"
                        disabled={remove.isPending}
                        onClick={() => handleDelete(r)}
                        className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                    <Ticket className="size-10 mx-auto mb-2 opacity-40" />
                    {isPending
                      ? "Loading conductors…"
                      : isError
                        ? errorMessage(error)
                        : rows.length === 0
                          ? "No conductors yet. Use Add Conductor to create the first one."
                          : "No conductors match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-xl">
              {editing ? "Edit Conductor" : "Add New Conductor"}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? "Update details and assign a route, time and bus"
                : "Create the conductor's login, share the password, and assign a trip"}
            </SheetDescription>
          </SheetHeader>

          <form
            key={editing?.id ?? "new"}
            id="conductor-form"
            className="flex-1 overflow-y-auto p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(new FormData(e.currentTarget));
            }}
          >
            <Field label="Conductor Name" required>
              <Input
                name="name"
                defaultValue={editing?.name}
                placeholder="Enter conductor name"
                required
                minLength={2}
                maxLength={60}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field
              label="Mobile Number"
              required
              hint="The conductor signs in with this mobile number."
            >
              <Input
                name="phone"
                defaultValue={editing?.phone}
                placeholder="10-digit mobile number"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="Enter a 10-digit mobile number"
                maxLength={10}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field
              label={editing ? "New Password" : "Password"}
              required={!editing}
              hint={
                editing
                  ? "Leave blank to keep the current password."
                  : "At least 8 characters. Share it with the conductor."
              }
            >
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={editing ? "Enter a new password" : "Create a password"}
                  required={!editing}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  className="h-11 rounded-xl pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <TripAssignment
              role="conductor"
              selfId={editing?.id}
              current={editing?.trip ?? null}
              busId={assigned.busId}
              tripId={assigned.tripId}
              onChange={setAssigned}
            />

            <Field label="Status" required>
              <Select
                name="status"
                defaultValue={editing?.isActive === false ? "Inactive" : "Active"}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </form>

          <SheetFooter className="p-6 border-t border-border bg-muted/20 flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl px-5 flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="conductor-form"
              disabled={save.isPending}
              className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all"
            >
              {!editing && <Plus className="size-4" />}
              {save.isPending ? "Saving…" : editing ? "Save Changes" : "Save Conductor"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
