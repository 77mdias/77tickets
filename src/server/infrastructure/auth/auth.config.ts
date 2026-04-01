import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";

import type { Db } from "@/server/infrastructure/db/client";
import { getDb } from "@/server/infrastructure/db";
import * as schema from "@/server/infrastructure/db/schema";

const ALLOWED_SIGNUP_ROLES = ["customer", "organizer"] as const;

export const createAuth = (db: Db) =>
  betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: { enabled: true },
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
    advanced: {
      // The Drizzle adapter resolves IDs via advanced.database.generateId.
      // Setting it to a UUID factory ensures UUIDs are used for all user/session IDs.
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "customer",
          input: true,
        },
      },
    },
    plugins: [bearer()],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") {
          return;
        }

        const role = (ctx.body as Record<string, unknown> | null)?.role;

        if (
          role &&
          typeof role === "string" &&
          !ALLOWED_SIGNUP_ROLES.includes(role as (typeof ALLOWED_SIGNUP_ROLES)[number])
        ) {
          throw new APIError("FORBIDDEN", {
            message: "Role não permitido no cadastro público",
          });
        }
      }),
    },
  });

type AuthInstance = ReturnType<typeof createAuth>;

let cachedAuth: AuthInstance | null = null;

export const getAuth = (): AuthInstance => {
  if (!cachedAuth) {
    cachedAuth = createAuth(getDb());
  }
  return cachedAuth;
};
