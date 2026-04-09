import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

export type SessionResolver = (headers: Record<string, string>) => Promise<{
  user: { id: string; role?: unknown; email?: string };
} | null>;

const ALLOWED_ROLES = ['customer', 'organizer', 'admin', 'checker'] as const;
type UserRole = typeof ALLOWED_ROLES[number];

const isUserRole = (role: unknown): role is UserRole =>
  typeof role === 'string' && ALLOWED_ROLES.includes(role as UserRole);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly resolveSession: SessionResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Test mode: accept x-test-user-id + x-test-role headers
    if (process.env.NODE_ENV === 'test') {
      const testUserId = request.headers['x-test-user-id'];
      if (testUserId) {
        request.user = {
          id: testUserId,
          role: request.headers['x-test-role'] ?? 'customer',
          email: request.headers['x-test-email'] ?? undefined,
        };
        return true;
      }
    }

    const session = await this.resolveSession(request.headers);
    if (!session) throw new UnauthorizedException('Sessão inválida ou expirada');

    request.user = {
      id: session.user.id,
      role: isUserRole(session.user.role) ? session.user.role : 'customer',
      email: session.user.email,
    };
    return true;
  }
}
