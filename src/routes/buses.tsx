import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/buses")({
  head: () => ({
    meta: [
      { title: "Bus Management — KenRoute" },
      { name: "description", content: "Manage your bus fleet: types, capacity, operator and status." },
    ],
  }),
  component: BusesPage,
});

const rows = [
  { no: "TS 09 AB 1234", type: "Sleeper", seats: 40, op: "KenRoute Travels", status: "Active" },
  { no: "TS 09 CD 5678", type: "Seater", seats: 45, op: "KenRoute Travels", status: "Active" },
  { no: "TS 09 EF 9101", type: "Sleeper", seats: 36, op: "KenRoute Travels", status: "Maintenance" },
  { no: "TS 09 GH 1122", type: "Seater", seats: 50, op: "KenRoute Travels", status: "Active" },
  { no: "TS 09 IJ 3344", type: "Sleeper", seats: 40, op: "KenRoute Travels", status: "Inactive" },
];

function BusesPage() {
  return (
    <>
      <PageHeader
        title="Bus Management"
        breadcrumb="Buses"
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:opacity-90">
            <Plus className="size-4" /> Add Bus
          </button>
        }
      />

      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search buses..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Bus Number</th>
                <th className="px-6 py-3 font-medium">Bus Type</th>
                <th className="px-6 py-3 font-medium">Seats</th>
                <th className="px-6 py-3 font-medium">Operator</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.no} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.no}</td>
                  <td className="px-6 py-4">{r.type}</td>
                  <td className="px-6 py-4">{r.seats}</td>
                  <td className="px-6 py-4">{r.op}</td>
                  <td className="px-6 py-4"><StatusPill status={r.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-brand">
                        <Pencil className="size-4" />
                      </button>
                      <button className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-1 p-4 border-t border-border">
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              className={`size-8 rounded-md text-sm font-medium ${p === 1 ? "bg-brand text-brand-foreground" : "hover:bg-muted"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
