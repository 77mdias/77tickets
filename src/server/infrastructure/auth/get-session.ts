import { createGetSession } from "@/server/api/auth/get-session";

import { auth } from "./auth.config";

const resolveSessionFromAuth = (request: Request) =>
  auth.api.getSession({ headers: request.headers });

export const getSession = createGetSession(resolveSessionFromAuth);
