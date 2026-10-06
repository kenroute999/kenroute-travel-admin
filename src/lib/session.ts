import { useSyncExternalStore } from "react";
import type { AuthSessionValue } from "./auth";
import { AuthError, fetchMe } from "./auth";

/**
 * KenRoute Admin — client authentication state.
 *
 * Storage: sessionStorage (key below). The session survives a page refresh but
 * ends when the browser is closed, so the next visit asks for the password again.
 * No passwords are ever stored here — only the token pair and the /me profile.
 */
const STORAGE_KEY = "kenroute.admin.session";

let session: AuthSessionValue | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    // Sessions used to be kept across browser restarts; drop any left over from then.
    window.localStorage.removeItem(STORAGE_KEY);
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    session = raw ? (JSON.parse(raw) as AuthSessionValue) : null;
    if (session && (!session.tokens?.accessToken || !session.user)) session = null;
  } catch {
    session = null;
  }
}

type Snapshot = { session: AuthSessionValue | null; hydrated: boolean };
const SERVER_SNAPSHOT: Snapshot = { session: null, hydrated: false };
let snapshot: Snapshot = SERVER_SNAPSHOT;

function refresh() {
  snapshot = { session, hydrated };
  emit();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode, quota) — session stays in memory */
  }
}

/** SSR-safe synchronous read for route guards. Returns null on the server. */
export function getSession(): AuthSessionValue | null {
  hydrate();
  return session;
}

export const sessionStore = {
  subscribe(l: () => void) {
    hydrate();
    if (snapshot.hydrated !== hydrated || snapshot.session !== session) refresh();
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot(): Snapshot {
    return snapshot;
  },
  getServerSnapshot(): Snapshot {
    return SERVER_SNAPSHOT;
  },

  setSession(next: AuthSessionValue) {
    session = next;
    persist();
    refresh();
  },

  logout() {
    session = null;
    persist();
    refresh();
  },
};

export function useSession() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
}

/**
 * Restore the session on app start and re-verify it against GET /me.
 * - 401/expired → session is cleared (user lands on /login via the route guard).
 * - Network unreachable → cached session is kept so a refresh does not sign the
 *   user out when the backend is temporarily unreachable; the next API call
 *   will re-validate the token.
 */
export async function initSession(): Promise<void> {
  hydrate();
  refresh();
  if (!session) return;
  try {
    const user = await fetchMe(session.tokens.accessToken);
    session = { ...session, user };
    persist();
    refresh();
  } catch (error) {
    if (error instanceof AuthError && error.code === "invalid-credentials") {
      session = null;
      persist();
      refresh();
    }
    /* other failures (server down): keep the cached session, see above */
  }
}
