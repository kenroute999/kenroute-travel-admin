import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bus,
  Route as RouteIcon,
  CalendarCheck,
  Users,
  BarChart3,
  Armchair,
  UserCog,
  Plug,
  Settings,
  LogOut,
} from "lucide-react";
import logo from "@/assets/kenroute-logo.png";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Buses", url: "/buses", icon: Bus },
  { title: "Routes", url: "/routes", icon: RouteIcon },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck },
  { title: "Agents", url: "/agents", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Seat Layouts", url: "/seat-layouts", icon: Armchair },
  { title: "Drivers", url: "/drivers", icon: UserCog },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-navy text-navy-foreground border-r border-sidebar-border">
      <div className="h-20 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="size-10 rounded-lg bg-white/95 flex items-center justify-center p-1 shadow-sm">
          <img src={logo} alt="KenRoute" className="size-full object-contain" />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-tight text-base">
            Ken<span className="text-brand">Route</span>
          </div>
          <div className="text-[11px] text-white/50">Travel Operations</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const active =
            item.url === "/"
              ? pathname === "/"
              : pathname.startsWith(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="size-[18px]" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="size-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}
