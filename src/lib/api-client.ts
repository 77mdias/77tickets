export class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'server-error'
  | 'network-error';

const errorCodeMap: Record<number, ApiErrorCode> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
};

function getErrorCode(status: number): ApiErrorCode {
  if (status >= 500) return 'server-error';
  return errorCodeMap[status] ?? 'server-error';
}

async function parseErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { message: res.statusText };
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseURL = process.env.API_BASE_URL;
  if (!baseURL) {
    throw new ApiError('API_BASE_URL not configured', 'network-error', 0);
  }

  const url = `${baseURL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await parseErrorBody(res);
      const code = getErrorCode(res.status);
      const message = typeof body === 'object' && body && 'message' in body
        ? String(body.message)
        : res.statusText;
      throw new ApiError(message, code, res.status, body);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown network error',
      'network-error',
      0,
    );
  }
}
