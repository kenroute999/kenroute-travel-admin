import { z } from "zod";

/**
 * KenRoute Admin — authentication service boundary.
 *
 * REQUIRED BACKEND CONTRACT (no backend exists yet — see KENROUTE_CODEBASE_ANALYSIS.md):
 *
 *   POST {VITE_API_URL}/auth/login
 *     Request:  { "email": "...", "password": "..." }
 *     Success:  { "accessToken": "...", "refreshToken": "...", "user"?: AuthUser }
 *     Failures: 401 invalid credentials · 403 wrong role / disabled
 *
 *   GET {VITE_API_URL}/me   (header: Authorization: Bearer <accessToken>)
 *     Success:  AuthUser  (used after login when /auth/login omits `user`,
 *               and on app start to restore/verify the session)
 *
 *   POST {VITE_API_URL}/auth/refresh
 *     Request:  { "refreshToken": "..." }
 *     Success:  { "accessToken": "...", "refreshToken": "..." }  (rotation expected)
 *
 * The access token carries claims: userId, operatorId, role. Lifetime ~15 minutes.
 * Configure the base URL via the VITE_API_URL environment variable (see .env.example).
 *
 * SECURITY: passwords are only ever sent in the POST /auth/login body over HTTPS.
 * They are never logged, never placed in URLs, and never persisted.
 */

/** Roles permitted to use the Admin application. */
export const ADMIN_ALLOWED_ROLES = ["OWNER", "ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ALLOWED_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  operatorId?: string;
  /** The bus company this account belongs to, shown in the side bar. */
  operatorName?: string;
  /** Backend role claim. Admin app accepts OWNER / ADMIN only. */
  role: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSessionValue = {
  tokens: AuthTokens;
  user: AuthUser;
};

export type AuthErrorCode =
  "validation" | "invalid-credentials" | "forbidden" | "not-configured" | "server-error";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Base URL of the KenRoute backend API, without trailing slash. "" when unset. */
export function apiBaseUrl(): string {
  const raw = readEnv().VITE_API_URL;
  return (raw ?? "").trim().replace(/\/+$/, "");
}

/**
 * Runtime environment (Vite `import.meta.env` in the browser bundle,
 * `process.env` under Node/SSR/tests). `import.meta.env` does not exist outside
 * Vite, so access is defensive — this keeps the service importable anywhere.
 */
function readEnv(): Record<string, string | undefined> {
  // Vite only fills this in where `import.meta.env` is written out literally;
  // reaching it through another variable leaves it undefined in the browser.
  if (import.meta.env) return import.meta.env;
  const proc = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return proc.process?.env ?? {};
}

function joinUrl(base: string, path: string): string {
  return `${base}${path}`;
}

async function readJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTokens(data: unknown): AuthTokens | null {
  if (!isRecord(data)) return null;
  const { accessToken, refreshToken } = data;
  if (typeof accessToken !== "string" || accessToken.length === 0) return null;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) return null;
  return { accessToken, refreshToken };
}

function parseUser(data: unknown): AuthUser | null {
  if (!isRecord(data)) return null;
  const { id, userId, email, name, operatorId, operatorName, role } = data;
  const resolvedId = typeof id === "string" ? id : typeof userId === "string" ? userId : null;
  if (!resolvedId || typeof email !== "string" || typeof role !== "string") return null;
  return {
    id: resolvedId,
    email,
    name: typeof name === "string" ? name : undefined,
    operatorId: typeof operatorId === "string" ? operatorId : undefined,
    operatorName: typeof operatorName === "string" ? operatorName : undefined,
    role,
  };
}

/**
 * Fetch the authenticated user. Frontend abstraction for GET /me.
 * Throws invalid-credentials on 401 so callers can clear the session.
 */
export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const base = apiBaseUrl();
  if (!base) {
    throw new AuthError(
      "not-configured",
      "Authentication API is not configured. Set VITE_API_URL to the KenRoute backend.",
    );
  }
  let response: Response;
  try {
    response = await fetch(joinUrl(base, "/me"), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AuthError(
      "server-error",
      "Unable to reach the authentication server. Check your connection and try again.",
    );
  }
  if (response.status === 401) {
    throw new AuthError("invalid-credentials", "Your session has expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new AuthError(
      "server-error",
      "Something went wrong while verifying your session. Please try again.",
    );
  }
  const user = parseUser(await readJsonSafe(response));
  if (!user) {
    throw new AuthError(
      "server-error",
      "The server returned an unexpected response. Please try again.",
    );
  }
  return user;
}

/** Exchange a refresh token for a new token pair (rotation). Frontend hook for POST /auth/refresh. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const base = apiBaseUrl();
  if (!base) {
    throw new AuthError(
      "not-configured",
      "Authentication API is not configured. Set VITE_API_URL to the KenRoute backend.",
    );
  }
  let response: Response;
  try {
    response = await fetch(joinUrl(base, "/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AuthError(
      "server-error",
      "Unable to reach the authentication server. Check your connection and try again.",
    );
  }
  if (response.status === 401) {
    throw new AuthError("invalid-credentials", "Your session has expired. Please sign in again.");
  }
  const tokens = parseTokens(await readJsonSafe(response));
  if (!response.ok || !tokens) {
    throw new AuthError(
      "server-error",
      "Something went wrong while refreshing your session. Please try again.",
    );
  }
  return tokens;
}

/**
 * Sign in with email + password via POST /auth/login.
 * Verifies the user carries an Admin role (OWNER / ADMIN) before resolving.
 * Never logs or persists the password.
 */
export async function loginWithEmail(input: LoginInput): Promise<AuthSessionValue> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError("validation", "Please fix the highlighted fields and try again.");
  }
  const base = apiBaseUrl();
  if (!base) {
    throw new AuthError(
      "not-configured",
      "Authentication API is not configured. Set VITE_API_URL to the KenRoute backend (POST /auth/login is required).",
    );
  }
  let response: Response;
  try {
    response = await fetch(joinUrl(base, "/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // NOTE: credentials travel in the request body only — never in logs or URLs.
      body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AuthError(
      "server-error",
      "Unable to reach the authentication server. Check your connection and try again.",
    );
  }
  if (response.status === 401) {
    throw new AuthError("invalid-credentials", "Invalid email or password.");
  }
  if (response.status === 403) {
    throw new AuthError("forbidden", "This account does not have access to the Admin application.");
  }
  const data = await readJsonSafe(response);
  const tokens = parseTokens(data);
  if (!response.ok || !tokens) {
    throw new AuthError(
      "server-error",
      "Something went wrong while signing you in. Please try again.",
    );
  }
  const embeddedUser = isRecord(data) ? parseUser(data.user) : null;
  const user = embeddedUser ?? (await fetchMe(tokens.accessToken));
  if (!(ADMIN_ALLOWED_ROLES as readonly string[]).includes(user.role)) {
    throw new AuthError("forbidden", "This account does not have access to the Admin application.");
  }
  return { tokens, user };
}
