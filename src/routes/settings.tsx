import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSession } from "@/lib/session";
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

function Field({
  label,
  value,
  type = "text",
  placeholder,
  numeric = false,
  maxLength,
}: {
  label: string;
  value?: string;
  type?: string;
  placeholder?: string;
  numeric?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        inputMode={numeric ? "numeric" : undefined}
        maxLength={maxLength}
        onInput={
          numeric
            ? (e) => {
                const el = e.currentTarget;
                el.value = el.value.replace(/\D/g, "").slice(0, maxLength ?? 10);
              }
            : undefined
        }
        className="mt-1.5 w-full h-11 rounded-lg border border-border bg-background px-4 text-sm outline-none focus:border-brand placeholder:text-muted-foreground"
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
  const { session } = useSession();
  const company = session?.user.operatorName?.trim();
  const role = session?.user.role === "OWNER" ? "Owner" : "Admin";
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
              <div className="font-semibold">{company || "Company name"}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
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
              <Field label="Company Name" placeholder="Enter company name" />
              <Field label="GSTIN" placeholder="Enter GSTIN" />
              <Field label="Contact Email" placeholder="Enter contact email" type="email" />
              <Field label="Phone" placeholder="Enter phone number" type="tel" numeric maxLength={10} />
              <Field label="Currency" placeholder="Enter currency" />
              <Field label="Timezone" placeholder="Enter timezone" />
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
