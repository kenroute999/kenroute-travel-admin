import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "brand" | "navy" | "warning" | "danger" | "info";
}

const tones: Record<string, string> = {
  brand: "bg-brand/10 text-brand",
  navy: "bg-navy/10 text-navy",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-chart-5/15 text-chart-5",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={cn("size-12 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
          {delta && (
            <p className="text-xs text-success mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="size-3" />
              {delta}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
