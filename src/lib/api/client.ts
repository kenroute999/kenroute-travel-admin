import { apiBaseUrl, refreshTokens, type AuthTokens } from "@/lib/auth";
import { getSession, sessionStore } from "@/lib/session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Message fit for a toast: the server's message plus the first field error, if any. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Something went wrong";
  const [field, problem] = Object.entries(err.details)[0] ?? [];
  return field ? `${err.message}: ${field} — ${problem}` : err.message;
}

// Several requests can hit an expired token at once; they must share one refresh,
// because the server rotates the refresh token and rejects a second use.
let refreshing: Promise<AuthTokens | null> | null = null;

function renewTokens(): Promise<AuthTokens | null> {
  refreshing ??= (async () => {
    const session = getSession();
    if (!session) return null;
    try {
      const tokens = await refreshTokens(session.tokens.refreshToken);
      sessionStore.setSession({ ...session, tokens });
      return tokens;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Ends the session on the server too, so the stored refresh token stops working. */
export async function signOut() {
  const refreshToken = getSession()?.tokens.refreshToken;
  sessionStore.logout();
  if (!refreshToken) return;
  // Best effort: the user is signed out locally even if the server cannot be reached.
  await send("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => undefined);
}

function send(path: string, options: { method?: string; body?: unknown }, accessToken?: string) {
  return fetch(apiBaseUrl() + path, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined && { "Content-Type": "application/json" }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await send(path, options, getSession()?.tokens.accessToken);
    if (res.status === 401) {
      // The access token lasts 15 minutes: swap it once and retry.
      const tokens = await renewTokens();
      if (!tokens) {
        // Clearing the session makes the route guard send the user to sign-in.
        sessionStore.logout();
        throw new ApiError(
          401,
          "UNAUTHENTICATED",
          "Your session has expired. Please sign in again.",
        );
      }
      res = await send(path, options, tokens.accessToken);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "NETWORK", "Cannot reach the server. Is the backend running?");
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? "UNKNOWN",
      data?.error?.message ?? "Request failed",
      data?.error?.details ?? {},
    );
  }
  return data as T;
}
