import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — KenRoute" },
      { name: "description", content: "Manage driver assignments, licenses and availability." },
    ],
  }),
  component: DriversPage,
});

const rows = [
  { name: "Ramesh Kumar", license: "TS-DL-2018-23145", phone: "9876543210", exp: "8 yrs", status: "Active" },
  { name: "Suresh Babu", license: "TS-DL-2016-19872", phone: "9876543211", exp: "10 yrs", status: "Active" },
  { name: "Mahesh Reddy", license: "AP-DL-2019-44521", phone: "9876543212", exp: "6 yrs", status: "Inactive" },
  { name: "Venkat Rao", license: "TS-DL-2014-11234", phone: "9876543213", exp: "12 yrs", status: "Active" },
];

function DriversPage() {
  return (
    <>
      <PageHeader title="Drivers" breadcrumb="Drivers" />
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-muted-foreground">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">License No.</th>
              <th className="px-6 py-3 font-medium">Phone</th>
              <th className="px-6 py-3 font-medium">Experience</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.license} className="border-t border-border hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">{r.name}</td>
                <td className="px-6 py-4">{r.license}</td>
                <td className="px-6 py-4">{r.phone}</td>
                <td className="px-6 py-4">{r.exp}</td>
                <td className="px-6 py-4"><StatusPill status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
