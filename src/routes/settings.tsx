import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import logo from "@/assets/kenroute-logo.png";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — KenRoute" },
      { name: "description", content: "Manage company profile, preferences and notification settings." },
    ],
  }),
  component: SettingsPage,
});

function Field({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        defaultValue={value}
        className="mt-1.5 w-full h-11 rounded-lg border border-border bg-background px-4 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function Toggle({ label, desc, on = false }: { label: string; desc: string; on?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <button
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand" : "bg-muted"}`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" breadcrumb="Settings" subtitle="Manage your account and operational preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-xl bg-navy flex items-center justify-center p-2">
              <img src={logo} alt="KenRoute" className="size-full object-contain" />
            </div>
            <div>
              <div className="font-semibold">KenRoute Travels</div>
              <div className="text-xs text-muted-foreground">Super Admin · Hyderabad</div>
            </div>
          </div>
          <nav className="mt-6 space-y-1 text-sm">
            {["Company Profile", "Notifications", "Security", "Billing", "API & Webhooks"].map((s, i) => (
              <a key={s} href="#" className={`block px-3 py-2 rounded-lg ${i === 0 ? "bg-brand/10 text-brand font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                {s}
              </a>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-5">Company Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name" value="KenRoute Travels Pvt. Ltd." />
              <Field label="GSTIN" value="36ABCDE1234F1Z5" />
              <Field label="Contact Email" value="ops@kenroute.com" type="email" />
              <Field label="Phone" value="+91 98765 43210" />
              <Field label="Currency" value="INR (₹)" />
              <Field label="Timezone" value="Asia/Kolkata" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancel</button>
              <button className="px-4 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90">Save Changes</button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Notifications</h2>
            <div>
              <Toggle label="Booking confirmations" desc="Email customers when a booking is confirmed" on />
              <Toggle label="Cancellation alerts" desc="Notify ops team of cancellations in real time" on />
              <Toggle label="Daily revenue summary" desc="Email a daily revenue and bookings recap" />
              <Toggle label="Agent commission reports" desc="Weekly agent commission payouts summary" on />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
