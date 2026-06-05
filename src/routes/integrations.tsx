import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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

type IntegrationStatus = "Ready" | "Pending" | "Connected" | "Error";

interface Integration {
  id: "redbus" | "abhibus";
  name: string;
  tagline: string;
  status: IntegrationStatus;
  todaysBookings: number;
  revenueToday: number;
  lastSync: string;
  accent: string; // tailwind text class
  tint: string; // soft bg
  border: string;
  initials: string;
}

const INTEGRATIONS: Integration[] = [
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
    status: "Pending",
    todaysBookings: 0,
    revenueToday: 0,
    lastSync: "Awaiting credentials",
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

const SYNC_LOG: SyncEvent[] = [
  {
    id: "1",
    channel: "System",
    message: "Integration workspace initialized for OTA partners.",
    type: "info",
    time: "Today · 09:12 AM",
  },
  {
    id: "2",
    channel: "redBus",
    message: "Inventory mapping prepared for 28 buses across 42 routes.",
    type: "success",
    time: "Today · 09:14 AM",
  },
  {
    id: "3",
    channel: "AbhiBus",
    message: "API credentials pending — awaiting partner approval.",
    type: "warning",
    time: "Yesterday · 06:40 PM",
  },
  {
    id: "4",
    channel: "redBus",
    message: "Seat layout validation completed for 18 / 20 buses.",
    type: "success",
    time: "Yesterday · 04:22 PM",
  },
  {
    id: "5",
    channel: "System",
    message: "Pricing sheets pending review for 6 routes.",
    type: "warning",
    time: "2 days ago",
  },
];

// ─────────────────────────────── Helpers ────────────────────────────────────

const inr = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const map: Record<IntegrationStatus, { cls: string; icon: typeof CheckCircle2; label: string }> = {
    Ready: { cls: "bg-warning/15 text-warning border-warning/30", icon: Clock, label: "Ready to Connect" },
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

// ─────────────────────────────── Page ───────────────────────────────────────

function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>(INTEGRATIONS);
  const [configFor, setConfigFor] = useState<Integration | null>(null);
  const [connectFor, setConnectFor] = useState<Integration | null>(null);

  const readinessPct = useMemo(() => {
    const total = READINESS.reduce((a, r) => a + r.total, 0);
    const done = READINESS.reduce((a, r) => a + r.value, 0);
    return Math.round((done / total) * 100);
  }, []);

  function handleConnect(id: Integration["id"]) {
    setConnectFor(null);
    toast.info("Connection request queued", {
      description: "Awaiting OTA partner approval. You'll be notified once credentials are issued.",
    });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Pending", lastSync: "Awaiting partner approval" } : i)),
    );
  }

  function handleSaveConfig() {
    setConfigFor(null);
    toast.success("Configuration saved", {
      description: "Integration settings updated. They'll take effect once the channel is connected.",
    });
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
              <div className="text-2xl font-bold">{readinessPct}%</div>
            </div>
            <div className="w-32">
              <Progress value={readinessPct} className="h-2 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {items.map((it) => (
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
                  <ShieldCheck className="size-4 text-success" />
                  Inventory prepared · awaiting handshake
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setConfigFor(it)}>
                    <Settings2 className="size-4" />
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    disabled={it.status === "Pending"}
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
        ))}
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
              {readinessPct}% Complete
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {READINESS.map((r) => {
              const pct = Math.round((r.value / r.total) * 100);
              return (
                <div key={r.label} className="rounded-xl border border-border p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-9 rounded-lg flex items-center justify-center",
                          r.ready ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
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
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          r.ready ? "text-success" : "text-warning",
                        )}
                      >
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
                      {c.growth >= 0 ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
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
            {SYNC_LOG.map((e) => {
              const tone =
                e.type === "success"
                  ? "bg-success/15 text-success"
                  : e.type === "warning"
                  ? "bg-warning/15 text-warning"
                  : e.type === "error"
                  ? "bg-danger/15 text-danger"
                  : "bg-muted text-muted-foreground";
              const Icon =
                e.type === "success"
                  ? CheckCircle2
                  : e.type === "warning"
                  ? AlertTriangle
                  : e.type === "error"
                  ? XCircle
                  : ArrowUpRight;
              return (
                <li key={e.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[34px] size-7 rounded-full flex items-center justify-center ring-4 ring-background",
                      tone,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{e.channel}</span>
                        <Badge
                          variant="outline"
                          className="rounded-full text-[10px] px-2 py-0 bg-muted text-muted-foreground border-border"
                        >
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
      <Dialog open={!!configFor} onOpenChange={(o) => !o && setConfigFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure {configFor?.name}</DialogTitle>
            <DialogDescription>
              Enter your partner API credentials. Settings activate after the channel is connected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" placeholder="Provided by partner after approval" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api-secret">API Secret</Label>
              <Input id="api-secret" type="password" placeholder="••••••••••••" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="env">Environment</Label>
                <Input id="env" defaultValue="Sandbox" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input id="webhook" defaultValue="https://api.kenroute.com/ota/webhook" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Auto-sync inventory</div>
                <div className="text-xs text-muted-foreground">Push seat availability every 60 seconds.</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigFor(null)}>
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={handleSaveConfig}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
