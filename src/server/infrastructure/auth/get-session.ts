import { createGetSession } from "@/server/api/auth/get-session";

import { getAuth } from "./auth.config";

const resolveSessionFromAuth = (request: Request) =>
  getAuth().api.getSession({ headers: request.headers });

export const getSession = createGetSession(resolveSessionFromAuth);
