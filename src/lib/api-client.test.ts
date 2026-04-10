import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError } from './api-client';

const API_BASE_URL = 'https://api.example.com';

beforeEach(() => {
  vi.stubEnv('API_BASE_URL', API_BASE_URL);
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('apiFetch', () => {
  it('composes URL with API_BASE_URL', async () => {
    (fetch as any).mockResolvedValue(new Response('{"ok": true}', { status: 200 }));
    await apiFetch('/api/events');
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/events`, expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('always includes credentials: include', async () => {
    (fetch as any).mockResolvedValue(new Response('{"ok": true}', { status: 200 }));
    await apiFetch('/api/events');
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('includes Content-Type header by default', async () => {
    (fetch as any).mockResolvedValue(new Response('{"ok": true}', { status: 200 }));
    await apiFetch('/api/events');
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('throws UnauthorizedError on 401', async () => {
    (fetch as any).mockResolvedValue(new Response('{"message":"Unauthorized"}', { status: 401 }));
    await expect(apiFetch('/api/protected')).rejects.toThrow(ApiError);
    await expect(apiFetch('/api/protected')).rejects.toMatchObject({
      code: 'unauthorized',
      statusCode: 401,
    });
  });

  it('throws ForbiddenError on 403', async () => {
    (fetch as any).mockResolvedValue(new Response('{"message":"Forbidden"}', { status: 403 }));
    await expect(apiFetch('/api/admin')).rejects.toMatchObject({
      code: 'forbidden',
      statusCode: 403,
    });
  });

  it('throws ConflictError on 409', async () => {
    (fetch as any).mockResolvedValue(new Response('{"message":"Conflict"}', { status: 409 }));
    await expect(apiFetch('/api/checkin')).rejects.toMatchObject({
      code: 'conflict',
      statusCode: 409,
    });
  });

  it('throws ServerError on 5xx', async () => {
    (fetch as any).mockResolvedValue(new Response('{"message":"Error"}', { status: 500 }));
    await expect(apiFetch('/api/events')).rejects.toMatchObject({
      code: 'server-error',
      statusCode: 500,
    });
  });

  it('returns parsed JSON on success', async () => {
    const data = { events: [{ id: '1', name: 'Test' }] };
    (fetch as any).mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    const result = await apiFetch('/api/events');
    expect(result).toEqual(data);
  });

  it('returns undefined on 204 No Content', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiFetch('/api/events/1', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws error when API_BASE_URL is not set', async () => {
    vi.stubEnv('API_BASE_URL', '');
    await expect(apiFetch('/api/events')).rejects.toThrow('API_BASE_URL not configured');
  });

  it('passes through custom headers', async () => {
    (fetch as any).mockResolvedValue(new Response('{"ok": true}', { status: 200 }));
    await apiFetch('/api/events', { headers: { 'X-Custom': 'value' } });
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ 'X-Custom': 'value', 'Content-Type': 'application/json' }),
    }));
  });

  it('throws NetworkError on fetch failure', async () => {
    (fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiFetch('/api/events')).rejects.toMatchObject({
      code: 'network-error',
    });
  });
});
