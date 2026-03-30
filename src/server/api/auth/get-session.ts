import { auth } from "@/src/server/infrastructure/auth/auth.config";
import { createUnauthenticatedError } from "@/src/server/application/errors";
import type { UserRole } from "@/src/server/repositories/user.repository.contracts";

export interface SessionContext {
  userId: string;
  role: UserRole;
}

export async function getSession(request: Request): Promise<SessionContext> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw createUnauthenticatedError("Sessão inválida ou expirada");
  }

  return {
    userId: session.user.id,
    role: (session.user as { role?: string }).role as UserRole ?? "customer",
  };
}
