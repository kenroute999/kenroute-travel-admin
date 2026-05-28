import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Management — KenRoute" },
      { name: "description", content: "Manage booking agents, balances, commissions and status." },
    ],
  }),
  component: AgentsPage,
});

const rows = [
  { name: "Ravi Travels", phone: "9988776655", email: "ravi@example.com", balance: "₹25,480", commission: "8%", status: "Active" },
  { name: "Sai Tour & Travels", phone: "9123456780", email: "sai@example.com", balance: "₹18,450", commission: "10%", status: "Active" },
  { name: "Prasad Tours", phone: "9900112233", email: "prasad@example.com", balance: "₹12,350", commission: "8%", status: "Active" },
  { name: "Balaji Travels", phone: "9345678901", email: "balaji@example.com", balance: "₹8,900", commission: "12%", status: "Inactive" },
];

function AgentsPage() {
  return (
    <>
      <PageHeader
        title="Agent Management"
        breadcrumb="Agents"
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:opacity-90">
            <Plus className="size-4" /> Add Agent
          </button>
        }
      />
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input placeholder="Search agents..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Agent Name</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Balance</th>
                <th className="px-6 py-3 font-medium">Commission</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.name}</td>
                  <td className="px-6 py-4">{r.phone}</td>
                  <td className="px-6 py-4">{r.email}</td>
                  <td className="px-6 py-4 font-medium">{r.balance}</td>
                  <td className="px-6 py-4">{r.commission}</td>
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
