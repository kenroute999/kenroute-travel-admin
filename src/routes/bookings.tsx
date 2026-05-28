import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — KenRoute" },
      { name: "description", content: "View and manage all passenger bookings across routes." },
    ],
  }),
  component: BookingsPage,
});

const rows = [
  { id: "KR-10421", passenger: "Anil Kumar", route: "Hyderabad → Bangalore", date: "20 May 2025", seat: "L3", amount: "₹1,250", status: "Active" },
  { id: "KR-10422", passenger: "Sneha Rao", route: "Hyderabad → Vijayawada", date: "20 May 2025", seat: "U7", amount: "₹650", status: "Active" },
  { id: "KR-10423", passenger: "Vikram Singh", route: "Bangalore → Chennai", date: "21 May 2025", seat: "L1", amount: "₹890", status: "Maintenance" },
  { id: "KR-10424", passenger: "Pooja Reddy", route: "Hyderabad → Chennai", date: "21 May 2025", seat: "U4", amount: "₹1,420", status: "Inactive" },
  { id: "KR-10425", passenger: "Karthik Iyer", route: "Visakhapatnam → Hyderabad", date: "22 May 2025", seat: "L9", amount: "₹1,180", status: "Active" },
];

function BookingsPage() {
  return (
    <>
      <PageHeader title="Bookings" breadcrumb="Bookings" />
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input placeholder="Search bookings..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Booking ID</th>
                <th className="px-6 py-3 font-medium">Passenger</th>
                <th className="px-6 py-3 font-medium">Route</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Seat</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.id}</td>
                  <td className="px-6 py-4">{r.passenger}</td>
                  <td className="px-6 py-4">{r.route}</td>
                  <td className="px-6 py-4">{r.date}</td>
                  <td className="px-6 py-4">{r.seat}</td>
                  <td className="px-6 py-4 font-medium">{r.amount}</td>
                  <td className="px-6 py-4"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
