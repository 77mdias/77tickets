import { auth } from "@/src/server/infrastructure/auth/auth.config";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
