// Smoke tests target NestJS directly since they call /api/* endpoints.
// Default is the NestJS dev server on port 3001.
// Override with SMOKE_BASE_URL if needed (e.g., http://localhost:3000 for Vinext-only mode).
export const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";

interface ApiCallOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  cookie?: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  body: T;
}

export async function apiCall<T = unknown>(
  path: string,
  options: ApiCallOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, cookie } = options;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (cookie) {
    headers["cookie"] = cookie;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseBody = (await response.json().catch(() => ({}))) as T;

  return {
    status: response.status,
    ok: response.ok,
    body: responseBody,
  };
}

export function log(message: string): void {
  console.log(`[smoke] ${message}`);
}

export function fail(message: string): never {
  console.error(`[smoke] FAIL: ${message}`);
  process.exit(1);
}

export async function checkServer(): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok && response.status !== 404) {
      fail(`Server at ${BASE_URL} returned ${response.status}. Is it running?`);
    }
  } catch {
    fail(`Cannot reach server at ${BASE_URL}. Start NestJS with 'bun run start:dev' (packages/backend) first.`);
  }
}
