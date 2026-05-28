import { Bell, Calendar, Menu, Search, ChevronDown } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-20 shrink-0 bg-card border-b border-border flex items-center gap-4 px-6">
      <button className="size-10 rounded-lg hover:bg-muted flex items-center justify-center text-foreground">
        <Menu className="size-5" />
      </button>

      <div className="flex-1 max-w-2xl mx-auto relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for buses, routes, agents..."
          className="w-full h-11 rounded-full bg-muted/60 border border-transparent focus:border-brand focus:bg-card pl-11 pr-4 text-sm outline-none transition"
        />
      </div>

      <button className="size-10 rounded-lg hover:bg-muted flex items-center justify-center">
        <Calendar className="size-5 text-muted-foreground" />
      </button>

      <button className="relative size-10 rounded-lg hover:bg-muted flex items-center justify-center">
        <Bell className="size-5 text-muted-foreground" />
        <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-brand text-[10px] font-bold text-brand-foreground flex items-center justify-center">
          5
        </span>
      </button>

      <div className="flex items-center gap-3 pl-3 border-l border-border">
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
