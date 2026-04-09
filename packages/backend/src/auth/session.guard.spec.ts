import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  function makeCtx(headers: Record<string, string> = {}) {
    const request = { headers, user: undefined as any };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
      _request: request,
    } as unknown as ExecutionContext & { _request: any };
  }

  it('throws UnauthorizedException when session is null', async () => {
    const guard = new SessionGuard(async () => null);
    await expect(guard.canActivate(makeCtx())).rejects.toThrow(UnauthorizedException);
  });

  it('sets request.user when session is valid', async () => {
    const mockUser = { id: 'user-1', role: 'organizer', email: 'org@test.com' };
    const guard = new SessionGuard(async () => ({ user: mockUser }));
    const ctx = makeCtx();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx as any)._request.user).toEqual({ id: 'user-1', role: 'organizer', email: 'org@test.com' });
  });

  it('sets role to customer when role is invalid', async () => {
    const guard = new SessionGuard(async () => ({ user: { id: 'u1', role: 'hacker' } }));
    const ctx = makeCtx();
    await guard.canActivate(ctx);
    expect((ctx as any)._request.user.role).toBe('customer');
  });
});
