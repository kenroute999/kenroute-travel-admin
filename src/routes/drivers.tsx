import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserCog } from "lucide-react";
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

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — KenRoute" },
      { name: "description", content: "Manage driver assignments, licenses and availability." },
    ],
  }),
  component: DriversPage,
});

type Status = "Active" | "Inactive";

interface DriverRow {
  id: string;
  name: string;
  license: string;
  phone: string;
  experience: number;
  status: Status;
}

const initialRows: DriverRow[] = [
  { id: "1", name: "Ramesh Kumar", license: "TS-DL-2018-23145", phone: "9876543210", experience: 8, status: "Active" },
  { id: "2", name: "Suresh Babu", license: "TS-DL-2016-19872", phone: "9876543211", experience: 10, status: "Active" },
  { id: "3", name: "Mahesh Reddy", license: "AP-DL-2019-44521", phone: "9876543212", experience: 6, status: "Inactive" },
  { id: "4", name: "Venkat Rao", license: "TS-DL-2014-11234", phone: "9876543213", experience: 12, status: "Active" },
];

function DriversPage() {
  // Rows live in memory until the staff API is wired in.
  const [rows, setRows] = useState<DriverRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DriverRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.license.toLowerCase().includes(q) ||
        r.phone.includes(q),
    );
  }, [rows, query]);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: DriverRow) => {
    setEditing(row);
    setOpen(true);
  };

  const handleDelete = (row: DriverRow) => {
    if (!window.confirm(`Delete driver "${row.name}"?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Driver deleted");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const license = String(fd.get("license")).trim().toUpperCase();

    if (rows.some((r) => r.license === license && r.id !== editing?.id)) {
      toast.error("A driver with this licence number already exists");
      return;
    }

    const row: DriverRow = {
      id: editing?.id ?? crypto.randomUUID(),
      name: String(fd.get("name")).trim(),
      license,
      phone: String(fd.get("phone")).trim(),
      experience: Number(fd.get("experience")),
      status: (fd.get("status") as Status) || "Active",
    };

    setRows((prev) =>
      editing ? prev.map((r) => (r.id === editing.id ? row : r)) : [row, ...prev],
    );
    setOpen(false);
    toast.success(editing ? "Driver updated" : "Driver added");
  };

  return (
    <>
      <PageHeader
        title="Drivers"
        breadcrumb="Drivers"
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:opacity-90"
          >
            <Plus className="size-4" /> Add Driver
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
              placeholder="Search drivers..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">License No.</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Experience</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.name}</td>
                  <td className="px-6 py-4">{r.license}</td>
                  <td className="px-6 py-4">{r.phone}</td>
                  <td className="px-6 py-4">
                    {r.experience} {r.experience === 1 ? "yr" : "yrs"}
                  </td>
                  <td className="px-6 py-4"><StatusPill status={r.status} /></td>
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
                        onClick={() => handleDelete(r)}
                        className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <UserCog className="size-10 mx-auto mb-2 opacity-40" />
                    {rows.length === 0
                      ? "No drivers yet. Use Add Driver to create the first one."
                      : "No drivers match your search."}
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
            <SheetTitle className="text-xl">{editing ? "Edit Driver" : "Add New Driver"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update the driver's details" : "Enter driver details to add to your staff"}
            </SheetDescription>
          </SheetHeader>

          <form
            key={editing?.id ?? "new"}
            id="driver-form"
            className="flex-1 overflow-y-auto p-6 space-y-5"
            onSubmit={handleSubmit}
          >
            <Field label="Driver Name" required>
              <Input
                name="name"
                defaultValue={editing?.name}
                placeholder="Enter driver name"
                required
                minLength={2}
                maxLength={60}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="License Number" required>
              <Input
                name="license"
                defaultValue={editing?.license}
                placeholder="e.g. TS-DL-2018-23145"
                required
                minLength={5}
                maxLength={20}
                className="h-11 rounded-xl uppercase"
              />
            </Field>
            <Field label="Mobile Number" required>
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

            <div className="grid grid-cols-2 gap-4">
              <Field label="Experience (years)" required>
                <Input
                  name="experience"
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  defaultValue={editing?.experience}
                  placeholder="e.g. 8"
                  required
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Status" required>
                <Select name="status" defaultValue={editing?.status ?? "Active"}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
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
              form="driver-form"
              className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all"
            >
              {!editing && <Plus className="size-4" />}
              {editing ? "Save Changes" : "Save Driver"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
