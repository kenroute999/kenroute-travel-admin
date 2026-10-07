import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { initSession, useSession } from "@/lib/session";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy px-4 text-center text-white">
      <div className="text-lg font-bold tracking-tight">
        Ken<span className="text-brand">Route</span>
      </div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Travel Operations</div>

      <div className="mt-10 flex items-center gap-3 text-8xl font-extrabold leading-none">
        <span>4</span>
        {/* A bus wheel standing in for the zero. */}
        <span className="relative inline-block size-20 rounded-full border-[10px] border-white/90">
          <span className="absolute inset-3 rounded-full bg-brand" />
        </span>
        <span>4</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold">This stop is not on our route</h1>
      <p className="mt-2 max-w-sm text-sm text-white/70">
        The page you opened does not exist, or the link is old. Nothing is wrong with your account.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
        >
          Go to Dashboard
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Go Back
        </button>
      </div>
      <div className="mt-10 text-xs text-white/40">Error 404 · Page not found</div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KenRoute — Travel Operations Dashboard" },
      {
        name: "description",
        content:
          "Modern travel operations admin dashboard for bus fleets, routes, bookings, and agents.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useSession();

  useEffect(() => {
    // Restore + re-verify the session (GET /me) on app start.
    void initSession();
  }, []);

  // Route guard: unauthenticated users only ever see /login.
  // NOTE: `beforeLoad` is intentionally not used on this root route — with the
  // installed @tanstack/router-core version its options type collapses to
  // `=> never`, rejecting every implementation at type level while working at
  // runtime. The render gate below is type-safe and behavior-identical for this
  // client-rendered console (no protected markup is emitted for guests: the
  // early return renders nothing but the redirect).
  if (pathname !== "/login" && !session) {
    return <Navigate to="/login" replace />;
  }
  if (pathname === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
