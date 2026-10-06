const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000/api/v1";

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

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
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
