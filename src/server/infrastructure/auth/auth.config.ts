import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";

import { db } from "@/src/server/infrastructure/db";
import * as schema from "@/src/server/infrastructure/db/schema";

const ALLOWED_SIGNUP_ROLES = ["customer", "organizer"] as const;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  advanced: {
    generateId: () => crypto.randomUUID(),
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
