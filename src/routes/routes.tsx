import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/routes")({
  head: () => ({
    meta: [
      { title: "Route Management — KenRoute" },
      { name: "description", content: "Manage travel routes, sources, destinations, distance and duration." },
    ],
  }),
  component: RoutesPage,
});

const rows = [
  { name: "Hyderabad - Bangalore", src: "Hyderabad", dst: "Bangalore", dist: "569 km", dur: "9h 30m", status: "Active" },
  { name: "Hyderabad - Vijayawada", src: "Hyderabad", dst: "Vijayawada", dist: "275 km", dur: "5h 15m", status: "Active" },
  { name: "Bangalore - Chennai", src: "Bangalore", dst: "Chennai", dist: "350 km", dur: "6h 45m", status: "Active" },
  { name: "Hyderabad - Chennai", src: "Hyderabad", dst: "Chennai", dist: "627 km", dur: "10h 30m", status: "Active" },
  { name: "Visakhapatnam - Hyderabad", src: "Visakhapatnam", dst: "Hyderabad", dist: "628 km", dur: "11h 20m", status: "Active" },
];

function RoutesPage() {
  return (
    <>
      <PageHeader
        title="Route Management"
        breadcrumb="Routes"
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:opacity-90">
            <Plus className="size-4" /> Add Route
          </button>
        }
      />

      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input placeholder="Search routes..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Route Name</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Destination</th>
                <th className="px-6 py-3 font-medium">Distance</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.name}</td>
                  <td className="px-6 py-4">{r.src}</td>
                  <td className="px-6 py-4">{r.dst}</td>
                  <td className="px-6 py-4">{r.dist}</td>
                  <td className="px-6 py-4">{r.dur}</td>
                  <td className="px-6 py-4"><StatusPill status={r.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-brand"><Pencil className="size-4" /></button>
                      <button className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-danger"><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
