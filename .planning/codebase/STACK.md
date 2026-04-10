# Technology Stack

**Analysis Date:** 2025-01-31

## Runtime & Framework

**Runtime:**
- Node.js-compatible — but deployed to **Cloudflare Workers** via `wrangler`
- Cloudflare compatibility flags: `nodejs_compat`, `no_handle_cross_request_promise_resolution`
- Worker entry point: `worker/index.ts`

**Framework:**
- **Next.js 16.2.1** — App Router with React Server Components
- **vinext ^0.0.35** — thin adapter layer that runs Next.js App Router on Cloudflare Workers (replaces `next start`)
  - Dev: `vinext dev`, Build: `vinext build`, Start: `vinext start`
- **React 19.2.4** — UI runtime (both server and client components)

**Build:**
- **Vite ^7.3.1** — underlying bundler used by vinext
  - Config: `vite.config.ts`
  - Plugins: `vinext()`, `@cloudflare/vite-plugin ^1.30.3` with RSC environment
- Build output: `dist/client/` (served as Cloudflare Workers Assets binding)

## Package Management

- **bun@1.3.3** — package manager and script runner
- Lockfile: `bun.lock` (present)
- Module type: ESM (`"type": "module"` in `package.json`)

## Database

**ORM:**
- **drizzle-orm ^0.45.1** — type-safe ORM
- Schema location: `src/server/infrastructure/db/schema.ts` (barrel) + `src/server/infrastructure/db/schema/` (per-entity files: events, lots, tickets, orders, coupons, users)
- Migrations output: `drizzle/`
- Config: `drizzle.config.ts`

**Database Driver:**
- **@neondatabase/serverless ^1.0.2** — Neon PostgreSQL client (WebSocket + HTTP modes)
  - HTTP client (`neon()` + `drizzle-orm/neon-http`) — for non-transactional queries, used by Better Auth
  - WebSocket client (`Pool` + `drizzle-orm/neon-serverless`) — for transactional operations (e.g., order creation)
  - Client factory: `src/server/infrastructure/db/client.ts`

**CLI:**
- **drizzle-kit ^0.31.10** — migration generation and execution
  - `bun run db:generate` → `drizzle-kit generate`
  - `bun run db:migrate` → `drizzle-kit migrate`

## Authentication

- **better-auth ^1.5.6** — full-stack authentication library
  - Strategy: email + password (`emailAndPassword: { enabled: true }`)
  - Plugin: `bearer` (Bearer token support)
  - Adapter: `drizzleAdapter` using HTTP-mode Neon client
  - Session/user IDs: UUID via `crypto.randomUUID()`
  - Config: `src/server/infrastructure/auth/auth.config.ts`
  - Client: `src/server/infrastructure/auth/auth.client.ts`
  - Session resolution: `src/server/infrastructure/auth/get-session.ts`
  - API route: `src/app/api/auth/[...all]/route.ts`
  - Custom roles on user: `customer`, `organizer` (controlled via signup middleware hook)

## UI & Styling

**Styling:**
- **Tailwind CSS ^4** — utility-first CSS framework
- **@tailwindcss/postcss ^4** — PostCSS integration
- PostCSS config: `postcss.config.mjs`
- Fonts: `next/font/google` — Geist Sans and Geist Mono

**Notifications:**
- **sonner ^2.0.7** — toast notification library (used in `src/app/layout.tsx`)

**QR Code:**
- **qrcode ^1.5.4** — QR code generation (tickets)
- **jsqr ^1.4.0** — QR code scanning (check-in)

**No shadcn/ui or Radix UI detected** in `package.json` — UI components are custom Tailwind-based.

## Testing

**Runner:**
- **vitest ^4.1.2** — test framework for all test types
- Config:
  - Unit/regression: `vitest.config.ts` (environment: `node`)
  - Integration: `vitest.integration.config.ts` (extends base, `fileParallelism: false`, timeout 15s)

**Coverage:**
- **@vitest/coverage-v8 ^4.1.2** — V8 coverage provider
  - Reporters: `text`, `html`

**Test Commands:**
```bash
bun run test:unit        # vitest run --config vitest.config.ts --dir tests/unit
bun run test:regression  # vitest run --config vitest.config.ts --dir tests/regression
bun run test:integration # vitest run --config vitest.integration.config.ts
bun run test:watch       # vitest --config vitest.config.ts --dir tests/unit
bun run test             # all three suites sequentially
```

**Test Types:**
- Unit tests: `tests/unit/`
- Regression tests: `tests/regression/`
- Integration tests: `tests/integration/` (hit real test DB, global setup in `tests/integration/setup/global-setup.ts`)

## Build & Deployment

**Deployment Target:** Cloudflare Workers
- Worker config: `wrangler.toml`
  - Worker name: `77tickets`
  - Environments: `preview` (`77tickets-preview`), `production` (`77tickets`)
  - Cron trigger: `0 * * * *` (hourly, for event reminder emails)
  - Assets binding: `ASSETS` → `./dist/client`

**Build Pipeline:**
- `bun run build` → `vinext build` → produces `dist/`
- CI quality gate: `bun run ci:quality` → lint + architecture lint + unit tests + regression tests + build

**CI Commands:**
```bash
bun run ci:quality      # lint + test:unit + test:regression + build
bun run ci:integration  # test:integration
bun run security:audit  # node scripts/ci/check-bun-audit-high.mjs
```

**Smoke Tests:**
- Scripts: `scripts/smoke/purchase-flow.ts`, `scripts/smoke/checkin-flow.ts`, `scripts/smoke/admin-flow.ts`
- Runner: `tsx ^4.21.0`

## Key Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vinext` | ^0.0.35 | Next.js App Router → Cloudflare Workers adapter |
| `@cloudflare/vite-plugin` | ^1.30.3 | Cloudflare Workers Vite integration |
| `@vitejs/plugin-react` | ^5.2.0 | React Vite plugin |
| `@vitejs/plugin-rsc` | ^0.5.21 | React Server Components Vite plugin |
| `drizzle-kit` | ^0.31.10 | DB migration CLI |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.2.1 | Next.js ESLint rules |
| `tsx` | ^4.21.0 | TypeScript script runner (smoke tests) |
| `typescript` | ^5 | Type checking |
| `tailwindcss` | ^4 | CSS framework |

## TypeScript Configuration

- `tsconfig.json`: strict mode, `bundler` module resolution, path alias `@/*` → `./src/*`, `incremental: true`
- Target: ES2017

## ESLint / Architecture Rules

- Config: `eslint.config.mjs` — enforces strict layer separation via `no-restricted-imports`:
  - `src/app/**` and `src/components/**` cannot import from `@/server/**`
  - `src/server/api/**` cannot import repositories, infrastructure, or `stripe` directly
  - `src/server/application/**` must stay framework-agnostic (no `next/`, `vinext/`, `stripe`)
  - `src/server/domain/**` must stay fully isolated
  - `src/server/repositories/**` and `src/server/infrastructure/**` cannot import `stripe`

---

*Stack analysis: 2025-01-31*
