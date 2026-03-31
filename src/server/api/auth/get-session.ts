import { createUnauthenticatedError } from "@/server/application/errors";
import type { UserRole } from "@/server/application/security";

export interface SessionContext {
  userId: string;
  role: UserRole;
}

interface ResolvedSession {
  user: {
    id: string;
    role?: unknown;
  };
}

export type ResolveSession = (request: Request) => Promise<ResolvedSession | null>;

const ALLOWED_USER_ROLES: readonly UserRole[] = [
  "customer",
  "organizer",
  "admin",
  "checker",
];

const isUserRole = (role: unknown): role is UserRole =>
  typeof role === "string" &&
  ALLOWED_USER_ROLES.includes(role as UserRole);

export const createGetSession = (resolveSession: ResolveSession) =>
  async (request: Request): Promise<SessionContext> => {
    const session = await resolveSession(request);

    if (!session) {
      throw createUnauthenticatedError("Sessão inválida ou expirada");
    }

    return {
      userId: session.user.id,
      role: isUserRole(session.user.role) ? session.user.role : "customer",
    };
  };
