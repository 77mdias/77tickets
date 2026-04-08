/**
 * Required environment variables validated at startup in production.
 * Call validateRequiredEnvVars() early (e.g., before first DB access)
 * so misconfigurations surface immediately rather than at request time.
 */

interface EnvVarRule {
  key: string;
  hint: string;
}

const REQUIRED_IN_PRODUCTION: readonly EnvVarRule[] = [
  {
    key: "DATABASE_URL",
    hint: "Neon PostgreSQL connection string. Example: postgresql://user:pass@host/db?sslmode=require",
  },
  {
    key: "BETTER_AUTH_SECRET",
    hint: "Session signing secret. Generate with: openssl rand -base64 32",
  },
  {
    key: "CRON_SECRET",
    hint: "Bearer token shared with the Cloudflare Scheduled trigger for /api/cron/event-reminders",
  },
];

export function validateRequiredEnvVars(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter(({ key }) => !process.env[key]?.trim());

  if (missing.length === 0) return;

  const details = missing.map(({ key, hint }) => `  • ${key}: ${hint}`).join("\n");

  throw new Error(
    `[startup] Missing required environment variables:\n${details}\n\n` +
      "Set the variables above before starting the server in production.",
  );
}
