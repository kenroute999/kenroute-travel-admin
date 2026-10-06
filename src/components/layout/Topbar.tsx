import { ChevronDown } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-20 shrink-0 bg-card border-b border-border flex items-center justify-end gap-4 px-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-brand-foreground font-bold text-sm">
          A
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-foreground">Admin</div>
          <div className="text-xs text-muted-foreground">Super Admin</div>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </div>
    </header>
  );
}
