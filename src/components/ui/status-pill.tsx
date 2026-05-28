import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "Active" | "Inactive" | "Maintenance";

export function StatusPill({ status }: { status: Status | string }) {
  const styles: Record<string, string> = {
    Active: "bg-success/15 text-success border-success/20",
    Inactive: "bg-danger/15 text-danger border-danger/20",
    Maintenance: "bg-warning/15 text-warning border-warning/20",
  };
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full font-medium border", styles[status] ?? "bg-muted text-foreground")}
    >
      {status}
    </Badge>
  );
}
