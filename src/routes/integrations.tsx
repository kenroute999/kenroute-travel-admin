import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plug,
  Settings2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Route as RouteIcon,
  Bus,
  Armchair,
  Tag,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  ArrowUpRight,
  CircleDot,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "OTA Integrations — KenRoute" },
      {
        name: "description",
        content:
          "Manage redBus and AbhiBus OTA integrations, sync activity, and channel performance from one control center.",
      },
    ],
  }),
  component: IntegrationsPage,
});

// ───────────────────────────── Types & mock data ────────────────────────────

type IntegrationStatus = "Ready" | "Pending" | "Configured" | "Connected" | "Error";
type IntegrationId = "redbus" | "abhibus";

interface Integration {
  id: IntegrationId;
  name: string;
  tagline: string;
  status: IntegrationStatus;
  todaysBookings: number;
  revenueToday: number;
  lastSync: string;
  accent: string;
  tint: string;
  border: string;
  initials: string;
}

const INITIAL: Integration[] = [
  {
    id: "redbus",
    name: "redBus",
    tagline: "World's largest online bus ticketing platform",
    status: "Ready",
    todaysBookings: 0,
    revenueToday: 0,
    lastSync: "Not synced yet",
    accent: "text-danger",
    tint: "bg-danger/10",
    border: "border-danger/30",
    initials: "rB",
  },
  {
    id: "abhibus",
    name: "AbhiBus",
    tagline: "India's leading bus booking & travel marketplace",
    status: "Ready",
    todaysBookings: 0,
    revenueToday: 0,
    lastSync: "Not synced yet",
    accent: "text-chart-5",
    tint: "bg-chart-5/10",
    border: "border-chart-5/30",
    initials: "aB",
  },
];

const READINESS = [
  { label: "Routes Configured", value: 42, total: 42, icon: RouteIcon, ready: true },
  { label: "Buses Configured", value: 28, total: 28, icon: Bus, ready: true },
  { label: "Seat Layouts Ready", value: 18, total: 20, icon: Armchair, ready: true },
  { label: "Pricing Ready", value: 36, total: 42, icon: Tag, ready: false },
  { label: "API Credentials", value: 0, total: 2, icon: KeyRound, ready: false },
];

const CHANNELS = [
  {
    id: "redbus",
    name: "redBus",
    bookings: 0,
    revenue: 0,
    growth: 0,
    projected: { bookings: 1240, revenue: 1860000 },
    accent: "bg-danger",
    text: "text-danger",
  },
  {
    id: "abhibus",
    name: "AbhiBus",
    bookings: 0,
    revenue: 0,
    growth: 0,
    projected: { bookings: 860, revenue: 1290000 },
    accent: "bg-chart-5",
    text: "text-chart-5",
  },
];

interface SyncEvent {
  id: string;
  channel: "redBus" | "AbhiBus" | "System";
  message: string;
  type: "info" | "success" | "warning" | "error";
  time: string;
}

const SEED_LOG: SyncEvent[] = [
  { id: "1", channel: "System", message: "Integration workspace initialized for OTA partners.", type: "info", time: "Today · 09:12 AM" },
  { id: "2", channel: "redBus", message: "Inventory mapping prepared for 28 buses across 42 routes.", type: "success", time: "Today · 09:14 AM" },
  { id: "3", channel: "AbhiBus", message: "API credentials pending — awaiting partner approval.", type: "warning", time: "Yesterday · 06:40 PM" },
  { id: "4", channel: "redBus", message: "Seat layout validation completed for 18 / 20 buses.", type: "success", time: "Yesterday · 04:22 PM" },
];

// ───────────────────────────── Config schema ────────────────────────────────

const baseShape = {
  environment: z.enum(["sandbox", "production"]),
  webhookUrl: z
    .string()
    .trim()
    .min(1, "Webhook URL is required")
    .max(500, "Webhook URL is too long")
    .url("Must be a valid https URL")
    .refine((v) => v.startsWith("https://"), "Webhook URL must use HTTPS"),
  autoSync: z.boolean(),
  syncIntervalSec: z.coerce.number().int().min(30, "Minimum 30 seconds").max(3600, "Maximum 3600 seconds"),
};

const redbusSchema = z.object({
  apiKey: z.string().trim().min(8, "API Key must be at least 8 characters").max(200),
  apiSecret: z.string().trim().min(8, "API Secret must be at least 8 characters").max(200),
  agentId: z
    .string()
    .trim()
    .min(3, "Agent ID is required")
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Only letters, numbers, dash and underscore"),
  ...baseShape,
});

const abhibusSchema = z.object({
  partnerId: z
    .string()
    .trim()
    .min(3, "Partner ID is required")
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Only letters, numbers, dash and underscore"),
  username: z.string().trim().min(3, "Username is required").max(60),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  ...baseShape,
});

type RedbusConfig = z.infer<typeof redbusSchema>;
type AbhibusConfig = z.infer<typeof abhibusSchema>;
type AnyConfig = RedbusConfig | AbhibusConfig;

const STORAGE_KEY = "kenroute.ota.configs.v1";

interface StoredConfig {
  configuredAt: string;
  data: AnyConfig;
}

type ConfigStore = Partial<Record<IntegrationId, StoredConfig>>;

function loadConfigs(): ConfigStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfigStore) : {};
  } catch {
    return {};
  }
}

function saveConfigs(store: ConfigStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ─────────────────────────────── Helpers ────────────────────────────────────

const inr = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const map: Record<IntegrationStatus, { cls: string; icon: typeof CheckCircle2; label: string }> = {
    Ready: { cls: "bg-warning/15 text-warning border-warning/30", icon: Clock, label: "Ready to Connect" },
    Configured: { cls: "bg-chart-5/15 text-chart-5 border-chart-5/30", icon: Settings2, label: "Configured" },
    Pending: { cls: "bg-muted text-muted-foreground border-border", icon: CircleDot, label: "Pending Approval" },
    Connected: { cls: "bg-success/15 text-success border-success/30", icon: CheckCircle2, label: "Connected" },
    Error: { cls: "bg-danger/15 text-danger border-danger/30", icon: XCircle, label: "Error" },
  };
  const { cls, icon: Icon, label } = map[status];
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium gap-1.5 px-2.5 py-1 border", cls)}>
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}

function formatTime(d: Date) {
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─────────────────────────────── Page ───────────────────────────────────────

function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>(INITIAL);
  const [store, setStore] = useState<ConfigStore>({});
  const [log, setLog] = useState<SyncEvent[]>(SEED_LOG);
  const [configFor, setConfigFor] = useState<Integration | null>(null);
  const [connectFor, setConnectFor] = useState<Integration | null>(null);

  // Hydrate from storage
  useEffect(() => {
    const loaded = loadConfigs();
    setStore(loaded);
    setItems((prev) =>
      prev.map((it) => {
        const cfg = loaded[it.id];
        if (!cfg) return it;
        return {
          ...it,
          status: "Configured",
          lastSync: `Configured · ${new Date(cfg.configuredAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}`,
        };
      }),
    );
  }, []);

  const readinessPct = useMemo(() => {
    const credsDone = Object.keys(store).length;
    const adjusted = READINESS.map((r) =>
      r.label === "API Credentials" ? { ...r, value: credsDone } : r,
    );
    const total = adjusted.reduce((a, r) => a + r.total, 0);
    const done = adjusted.reduce((a, r) => a + r.value, 0);
    return { pct: Math.round((done / total) * 100), rows: adjusted };
  }, [store]);

  function pushLog(channel: SyncEvent["channel"], message: string, type: SyncEvent["type"]) {
    setLog((prev) => [
      { id: crypto.randomUUID(), channel, message, type, time: `Today · ${formatTime(new Date()).split(", ")[1] ?? ""}` },
      ...prev,
    ]);
  }

  function handleSaveConfig(id: IntegrationId, data: AnyConfig) {
    const next: ConfigStore = { ...store, [id]: { configuredAt: new Date().toISOString(), data } };
    setStore(next);
    saveConfigs(next);

    const name = id === "redbus" ? "redBus" : "AbhiBus";
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "Configured",
              lastSync: `Configured · ${formatTime(new Date())}`,
            }
          : i,
      ),
    );
    pushLog(name, `Credentials saved (${data.environment}). Ready to send connection request.`, "success");
    toast.success(`${name} configuration saved`, {
      description: "Credentials stored securely. You can now request a connection.",
    });
    setConfigFor(null);
  }

  function handleConnect(id: IntegrationId) {
    setConnectFor(null);
    const name = id === "redbus" ? "redBus" : "AbhiBus";
    toast.info("Connection request queued", {
      description: "Awaiting OTA partner approval. You'll be notified once credentials are issued.",
    });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Pending", lastSync: "Awaiting partner approval" } : i)),
    );
    pushLog(name, "Connection request sent to partner — awaiting approval.", "info");
  }

  return (
    <div>
      <PageHeader
        title="OTA Integrations"
        breadcrumb="OTA Integrations"
        subtitle="Manage external travel marketplaces and channel performance from a single control center."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Activity className="size-4" />
              Health Check
            </Button>
            <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
              <Plug className="size-4" />
              Request New Channel
            </Button>
          </>
        }
      />

      {/* Future Integration Banner */}
      <div className="mb-6 relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-r from-navy via-navy to-navy-muted text-navy-foreground p-5 md:p-6">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute right-20 bottom-0 size-32 rounded-full bg-brand/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-brand/20 text-brand flex items-center justify-center shrink-0">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Ready to connect with OTA partners after API approval</h3>
                <Badge variant="outline" className="border-brand/40 bg-brand/15 text-brand rounded-full">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-sm text-white/70 mt-1 max-w-2xl">
                Your inventory, seat layouts and pricing are being prepared. Once redBus and AbhiBus issue API credentials,
                KenRoute will sync bookings, availability and cancellations in real time.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-white/50">Readiness</div>
              <div className="text-2xl font-bold">{readinessPct.pct}%</div>
            </div>
            <div className="w-32">
              <Progress value={readinessPct.pct} className="h-2 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {items.map((it) => {
          const isConfigured = it.status === "Configured" || it.status === "Connected";
          return (
            <Card key={it.id} className="overflow-hidden">
              <div className={cn("h-1 w-full", it.accent.replace("text-", "bg-"))} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "size-14 rounded-2xl flex items-center justify-center font-bold text-xl border",
                        it.tint,
                        it.accent,
                        it.border,
                      )}
                    >
                      {it.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{it.name}</h3>
                        <StatusBadge status={it.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{it.tagline}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Metric label="Today's Bookings" value={it.todaysBookings.toString()} />
                  <Metric label="Revenue Generated" value={inr(it.revenueToday)} />
                  <Metric label="Last Sync" value={it.lastSync} small />
                </div>

                <Separator className="my-5" />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className={cn("size-4", isConfigured ? "text-success" : "text-warning")} />
                    {isConfigured
                      ? "Credentials saved · ready for handshake"
                      : "Add credentials to enable connection"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setConfigFor(it)}>
                      <Settings2 className="size-4" />
                      Configure
                    </Button>
                    <Button
                      size="sm"
                      disabled={it.status === "Pending" || !isConfigured}
                      title={!isConfigured ? "Configure credentials first" : undefined}
                      className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                      onClick={() => setConnectFor(it)}
                    >
                      <Plug className="size-4" />
                      {it.status === "Pending" ? "Awaiting Approval" : "Connect"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Readiness + Channel performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Integration Readiness</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configuration progress required before going live on OTAs.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full bg-brand/10 text-brand border-brand/30">
              {readinessPct.pct}% Complete
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {readinessPct.rows.map((r) => {
              const pct = Math.round((r.value / r.total) * 100);
              const ready = pct === 100;
              return (
                <div key={r.label} className="rounded-xl border border-border p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-9 rounded-lg flex items-center justify-center",
                          ready ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                        )}
                      >
                        <r.icon className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{r.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.value} of {r.total} ready
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className={cn("text-xs font-semibold tabular-nums", ready ? "text-success" : "text-warning")}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comparison will populate once integrations go live.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHANNELS.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", c.accent)} />
                    <span className="font-semibold text-sm">{c.name}</span>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px] bg-muted text-muted-foreground">
                    Awaiting Data
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Bookings</div>
                    <div className="text-base font-bold tabular-nums">{c.bookings}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Revenue</div>
                    <div className="text-base font-bold tabular-nums">{inr(c.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Growth</div>
                    <div className="text-base font-bold tabular-nums flex items-center gap-1 text-muted-foreground">
                      {c.growth >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      {c.growth}%
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/70 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Projected / month</span>
                  <span className={cn("font-semibold", c.text)}>
                    {c.projected.bookings.toLocaleString("en-IN")} · {inr(c.projected.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sync timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sync Activity Timeline</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Recent integration events and synchronization logs.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-border pl-6 space-y-5">
            {log.map((e) => {
              const tone =
                e.type === "success"
                  ? "bg-success/15 text-success"
                  : e.type === "warning"
                  ? "bg-warning/15 text-warning"
                  : e.type === "error"
                  ? "bg-danger/15 text-danger"
                  : "bg-muted text-muted-foreground";
              const Icon =
                e.type === "success" ? CheckCircle2 : e.type === "warning" ? AlertTriangle : e.type === "error" ? XCircle : ArrowUpRight;
              return (
                <li key={e.id} className="relative">
                  <span className={cn("absolute -left-[34px] size-7 rounded-full flex items-center justify-center ring-4 ring-background", tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{e.channel}</span>
                        <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0 bg-muted text-muted-foreground border-border">
                          {e.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{e.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{e.time}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Configure dialog */}
      <ConfigureDialog
        integration={configFor}
        existing={configFor ? store[configFor.id]?.data : undefined}
        onClose={() => setConfigFor(null)}
        onSave={handleSaveConfig}
      />

      {/* Connect dialog */}
      <Dialog open={!!connectFor} onOpenChange={(o) => !o && setConnectFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {connectFor?.name}?</DialogTitle>
            <DialogDescription>
              KenRoute will submit a connection request and begin syncing once the partner approves your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-warning/30 bg-warning/10 text-warning p-3 text-sm flex gap-2">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            No live data will be exchanged until API approval is confirmed.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectFor(null)}>
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => connectFor && handleConnect(connectFor.id)}
            >
              Send Connection Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/70 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-bold tabular-nums mt-1", small ? "text-sm" : "text-lg")}>{value}</div>
    </div>
  );
}

// ────────────────────────── Configure Dialog ────────────────────────────────

type FormErrors = Partial<Record<string, string>>;

function defaultsFor(id: IntegrationId, existing?: AnyConfig): Record<string, string | boolean | number> {
  if (id === "redbus") {
    const e = existing as RedbusConfig | undefined;
    return {
      apiKey: e?.apiKey ?? "",
      apiSecret: e?.apiSecret ?? "",
      agentId: e?.agentId ?? "",
      environment: e?.environment ?? "sandbox",
      webhookUrl: e?.webhookUrl ?? "https://api.kenroute.com/ota/redbus/webhook",
      autoSync: e?.autoSync ?? true,
      syncIntervalSec: e?.syncIntervalSec ?? 60,
    };
  }
  const e = existing as AbhibusConfig | undefined;
  return {
    partnerId: e?.partnerId ?? "",
    username: e?.username ?? "",
    password: e?.password ?? "",
    environment: e?.environment ?? "sandbox",
    webhookUrl: e?.webhookUrl ?? "https://api.kenroute.com/ota/abhibus/webhook",
    autoSync: e?.autoSync ?? true,
    syncIntervalSec: e?.syncIntervalSec ?? 60,
  };
}

function ConfigureDialog({
  integration,
  existing,
  onClose,
  onSave,
}: {
  integration: Integration | null;
  existing?: AnyConfig;
  onClose: () => void;
  onSave: (id: IntegrationId, data: AnyConfig) => void;
}) {
  const open = !!integration;
  const id = integration?.id;
  const [form, setForm] = useState<Record<string, string | boolean | number>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      setForm(defaultsFor(id, existing));
      setErrors({});
      setShowSecret(false);
    }
  }, [id, existing, open]);

  if (!integration || !id) return null;
  const safeId: IntegrationId = id;

  const set = (k: string, v: string | boolean | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  function fieldError(k: string) {
    return errors[k];
  }

  function handleSubmit() {
    const schema = id === "redbus" ? redbusSchema : abhibusSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const out: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !out[key]) out[key] = issue.message;
      }
      setErrors(out);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    const targetId = id;
    setTimeout(() => {
      setSaving(false);
      onSave(targetId, parsed.data as AnyConfig);
    }, 350);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-brand" />
            Configure {integration.name}
          </DialogTitle>
          <DialogDescription>
            Enter partner API credentials. Settings are validated and saved locally — they activate once the channel is connected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto pr-1">
          {id === "redbus" ? (
            <>
              <Field label="API Key" error={fieldError("apiKey")} htmlFor="apiKey">
                <Input
                  id="apiKey"
                  value={String(form.apiKey ?? "")}
                  onChange={(e) => set("apiKey", e.target.value)}
                  placeholder="rb_live_xxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="API Secret" error={fieldError("apiSecret")} htmlFor="apiSecret">
                <SecretInput
                  id="apiSecret"
                  value={String(form.apiSecret ?? "")}
                  onChange={(v) => set("apiSecret", v)}
                  show={showSecret}
                  onToggle={() => setShowSecret((s) => !s)}
                />
              </Field>
              <Field label="Agent ID" error={fieldError("agentId")} htmlFor="agentId">
                <Input
                  id="agentId"
                  value={String(form.agentId ?? "")}
                  onChange={(e) => set("agentId", e.target.value)}
                  placeholder="KENROUTE-AGT"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Partner ID" error={fieldError("partnerId")} htmlFor="partnerId">
                <Input
                  id="partnerId"
                  value={String(form.partnerId ?? "")}
                  onChange={(e) => set("partnerId", e.target.value)}
                  placeholder="ABHI-KEN-001"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Username" error={fieldError("username")} htmlFor="username">
                <Input
                  id="username"
                  value={String(form.username ?? "")}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="kenroute_api"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Password" error={fieldError("password")} htmlFor="password">
                <SecretInput
                  id="password"
                  value={String(form.password ?? "")}
                  onChange={(v) => set("password", v)}
                  show={showSecret}
                  onToggle={() => setShowSecret((s) => !s)}
                />
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Environment" error={fieldError("environment")} htmlFor="environment">
              <Select
                value={String(form.environment ?? "sandbox")}
                onValueChange={(v) => set("environment", v)}
              >
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sync Interval (sec)" error={fieldError("syncIntervalSec")} htmlFor="syncIntervalSec">
              <Input
                id="syncIntervalSec"
                type="number"
                min={30}
                max={3600}
                value={Number(form.syncIntervalSec ?? 60)}
                onChange={(e) => set("syncIntervalSec", e.target.value === "" ? "" as unknown as number : Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Webhook URL" error={fieldError("webhookUrl")} htmlFor="webhookUrl">
            <Input
              id="webhookUrl"
              value={String(form.webhookUrl ?? "")}
              onChange={(e) => set("webhookUrl", e.target.value)}
              placeholder="https://api.kenroute.com/ota/webhook"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Auto-sync inventory</div>
              <div className="text-xs text-muted-foreground">
                Push seat availability automatically at the chosen interval.
              </div>
            </div>
            <Switch
              checked={Boolean(form.autoSync)}
              onCheckedChange={(v) => set("autoSync", v)}
            />
          </div>

          <div className="rounded-lg border border-brand/30 bg-brand/5 text-xs text-muted-foreground p-3 flex gap-2">
            <ShieldCheck className="size-4 text-brand mt-0.5 shrink-0" />
            Credentials are stored on this device only. No live data is exchanged until API approval is confirmed.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving…" : existing ? "Update Configuration" : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertTriangle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function SecretInput({
  id,
  value,
  onChange,
  show,
  onToggle,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••••••"
        autoComplete="off"
        spellCheck={false}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide secret" : "Show secret"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
