import { ChevronDown } from "lucide-react";
import { useSession } from "@/lib/session";

function roleLabel(role: string | undefined): string {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN") return "Super Admin";
  return role ?? "Admin";
}

export function Topbar() {
  const { session } = useSession();
  const displayName = session?.user.name?.trim() || session?.user.email || "Admin";
  const initial = (displayName.trim().charAt(0) || "A").toUpperCase();

  return (
    <header className="h-20 shrink-0 bg-card border-b border-border flex items-center justify-end gap-4 px-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-brand-foreground font-bold text-sm">
          {initial}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-foreground">{displayName}</div>
          <div className="text-xs text-muted-foreground">{roleLabel(session?.user.role)}</div>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </div>
    </header>
  );
}
