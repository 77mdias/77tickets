# Codebase Concerns

**Analysis Date:** 2026-07-09

---

## Architecture Gaps

### 1. `getDatabaseUrlOrThrow` Exported From a Domain-Specific Route Adapter
- **Files:** `src/server/api/orders/create-order.route-adapter.ts` (defines it), imported by 13+ unrelated route files including `src/app/api/events/route.ts`, `src/app/api/lots/route.ts`, `src/app/api/coupons/create/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/cron/event-reminders/route.ts`, etc.
- **Issue:** A database URL utility function is buried inside an order-domain route adapter and re-exported to the entire API surface. All other routes import this via `import { getDatabaseUrlOrThrow } from "@/server/api/orders/create-order.route-adapter"`, creating an accidental coupling between unrelated domains.
- **Existing alternative ignored:** `src/server/infrastructure/db/index.ts` already exports `getDb()` and `getHttpDb()` as proper singletons with correct caching. No route file uses this. Instead, every route independently calls `createDb(getDatabaseUrlOrThrow())`.
- **Fix approach:** All route files should use `getDb()` from `@/server/infrastructure/db`. Remove `getDatabaseUrlOrThrow` export from `create-order.route-adapter.ts`.

### 2. 33+ Isolated DB Pool Instances at Runtime
- **Files:** All `src/app/api/*/route.ts` files
- **Issue:** Each route file calls `createDb(getDatabaseUrlOrThrow())` inside its own `build*RouteHandler()` function, cached at module level. This creates one `Pool` (WebSocket connection pool) per route handler module at runtime — approximately 33 independent connection pools. The infrastructure layer (`src/server/infrastructure/db/index.ts`) has a proper singleton `getDb()` pattern that none of the routes use.
- **Impact:** Excessive connections to Neon PostgreSQL, possible connection limit exhaustion under load. Not critical for a demo/low-traffic context, but a scaling concern.
- **Fix approach:** Migrate all route handlers to use `getDb()` from `@/server/infrastructure/db`.

### 3. `create-order.handler.ts` Located at Root of `src/server/api/`
- **File:** `src/server/api/create-order.handler.ts`
- **Issue:** All other handlers are organized into subdirectories (`events/`, `orders/`, `lots/`, `checkin/`, `coupons/`). The create-order handler sits directly at the `api/` root, breaking the structural convention.
- **Fix approach:** Move to `src/server/api/orders/create-order.handler.ts` consistent with all other handlers.

### 4. Orphaned `/eventos` Loading Skeleton With No Page
- **Files:** `src/app/eventos/loading.tsx` (exists), `src/app/eventos/page.tsx` (missing)
- **Issue:** A `loading.tsx` skeleton for an events listing page exists in `src/app/eventos/` but there is no corresponding `page.tsx`. The events listing is served from the home page (`src/app/page.tsx` with `EventSearch`), not from `/eventos`. The orphaned skeleton references `EventListSkeleton` and would never display.
- **Fix approach:** Either create `src/app/eventos/page.tsx` as a proper events listing route, or delete `src/app/eventos/loading.tsx` if the home page is the intended listing location.

### 5. `getDatabaseUrlOrThrow` Defined Twice
- **Files:** `src/server/api/orders/create-order.route-adapter.ts:79` and `src/server/api/checkin/validate-checkin.route-adapter.ts:73`
- **Issue:** Identical function defined in two separate route adapter files. All routes import from the orders adapter rather than the checkin adapter, making the checkin version dead code.

### 6. `src/lib/server-api.ts` Uses `next/headers` (Framework Coupling in Lib Layer)
- **File:** `src/lib/server-api.ts`
- **Issue:** This file imports `headers` from `next/headers`, coupling a shared utility to the Next.js runtime. This is outside the `src/app/` directory where Next.js coupling is acceptable. If the frontend moves to a different framework, this utility breaks.
- **Fix approach:** Move to `src/app/lib/` or scope the utility clearly to the app layer.

---

## Security Concerns

### 1. No Server-Side Auth Guard on `/admin` Page
- **File:** `src/app/admin/page.tsx`
- **Issue:** The admin page renders `AdminManagementForm` and `AnalyticsPanel` with no `getSession()` call, no role check, and no redirect. Any unauthenticated user who navigates to `/admin` will see the admin management UI. There is no Next.js middleware (`src/middleware.ts` does not exist) to protect routes.
- **Actual protection:** The underlying API calls (`POST /api/events`, `POST /api/lots`, etc.) do enforce auth server-side. But the UI itself is fully visible to anyone.
- **Impact:** The admin UI is exposed. An unauthenticated user can see event management forms, attempt operations (which the API will reject), and observe the admin interface structure.
- **Fix approach:** Add `getSession()` + redirect to `/login` at the top of `src/app/admin/page.tsx`, or implement `src/middleware.ts` protecting `/admin`.

### 2. No Server-Side Auth Guard on `/checkin` Page
- **File:** `src/app/checkin/page.tsx`
- **Issue:** Same pattern as `/admin`. The check-in page renders `CheckinForm` without any session check or redirect. The `/api/checkin` route does enforce `checker`/`admin`/`organizer` role via RBAC, but the UI is accessible to all.
- **Fix approach:** Add session check at page level or use Next.js middleware.

### 3. Rate Limiting Is Per-Worker-Instance (In-Memory Map)
- **File:** `src/server/api/middleware/rate-limiter.ts`
- **Issue:** The rate limiter uses an in-memory `Map`. On Cloudflare Workers, each worker instance has its own memory space. Under traffic distributed across multiple worker instances, the effective limit multiplies by the number of instances (acknowledged in code comment: "For production, replace the store with Cloudflare KV").
- **Affected endpoints:** `POST /api/orders` (10 req/min), `POST /api/auth/[...all]` (5 req/min), `POST /api/checkin` (60 req/min).
- **Impact:** In a demo context this is acceptable. In production it reduces rate limit effectiveness.

### 4. Mutation Endpoints Have No Rate Limiting
- **Files:** `src/app/api/events/route.ts` (POST), `src/app/api/lots/route.ts` (POST), `src/app/api/lots/[id]/route.ts` (PATCH), `src/app/api/coupons/create/route.ts`, `src/app/api/coupons/update/route.ts`
- **Issue:** Unlike orders and auth, organizer/admin mutation endpoints (create event, create lot, update lot, create coupon, update coupon) have no rate limiting applied.
- **Impact:** Low risk in demo context given RBAC restricts access to organizer/admin roles only.

### 5. Cron Endpoint Fails Open if `CRON_SECRET` Not Set
- **File:** `src/app/api/cron/event-reminders/route.ts:20-24`
- **Issue:** If `CRON_SECRET` env var is unset or empty, `expectedToken` becomes `""` and `expectedHeader` becomes `""`. The condition `!expectedHeader` then evaluates to `true` and throws `unauthenticatedError`. This means the endpoint correctly rejects requests but logs an authentication error on every legitimate cron call if the secret was accidentally omitted from environment configuration. The intent is to fail closed (safe), but the silent misconfiguration may be hard to diagnose.
- **Fix approach:** Add an explicit startup validation that `CRON_SECRET` is non-empty when `NODE_ENV=production`.

---

## Technical Debt

### 1. Dual Lockfiles (`bun.lock` + `package-lock.json`)
- **Files:** `bun.lock`, `package-lock.json` (both at project root)
- **Issue:** AGENTS.md section 2 states "Use `bun install` for dependency installation" and "Do not introduce new `npm`-based workflow instructions." Having both lockfiles creates confusion about which is authoritative and risks dependency divergence if different tools install.
- **Fix approach:** Delete `package-lock.json` and add it to `.gitignore`.

### 2. `vinext` Is an Experimental Runtime at `^0.0.35`
- **File:** `package.json`
- **Issue:** The project is deployed on `vinext` (version 0.0.35 — pre-1.0). This runtime is non-standard and undocumented publicly. Migration AGENTS.md targets Next.js + NestJS, making vinext a transitional dependency. The API contract for vinext may change unpredictably.
- **Impact:** Build/deploy tooling (`vinext dev`, `vinext build`, `vinext start`) is tied to an unstable dependency.

### 3. Handler Dependency Wiring in App Routes (No DI Container)
- **Files:** All `src/app/api/*/route.ts` files
- **Issue:** Each route file manually wires all dependencies (repositories, use-cases, providers) in a `build*RouteHandler()` function. This pattern is verbose and duplicated across 13+ route files. There is no shared composition root or DI container.
- **Impact:** Adding a new dependency (e.g., a cache layer) requires modifying every route file. Risk of inconsistency when routes are updated independently.
- **Fix approach:** Create a shared composition root module (e.g., `src/server/composition-root.ts`) that instantiates all shared infrastructure once.

### 4. `DEMO_CHECKER_ID` Env Var Documented But Not Used in Source
- **File:** `.env.example`
- **Issue:** `DEMO_CHECKER_ID` is documented in `.env.example` with a default UUID, but `grep` finds no usage in `src/`. Either this was removed but the env.example was not updated, or it is used via an indirect path not visible in current source.
- **Fix approach:** Remove from `.env.example` if unused, or add usage documentation.

---

## Design System Alignment

The `parallax-geometry/design-system.html` defines the **Parallax Design System**, a dark, geometric, motion-heavy visual language. The actual application UI diverges completely from it.

### Design System Specification (`parallax-geometry/design-system.html`)
| Property | Design System Value |
|----------|---------------------|
| Background | `bg-zinc-950` (`#0a0a0a`) — dark |
| Text | White / `zinc-300` |
| Font | Space Grotesk (from Google Fonts) |
| Motion | GSAP + ScrollTrigger (parallax, opacity reveals, `translate-y` entry animations) |
| Visual theme | Dark, geometric, high-contrast, animated canvas background |
| Heading scale | `text-8xl` / `text-9xl`, bold, tight tracking |

### Actual Application UI
| Property | Actual Value |
|----------|--------------|
| Background | `bg-zinc-50` — light gray |
| Text | `text-zinc-900` (dark on light) |
| Font | Geist (`--font-geist-sans`) from `next/font/google` |
| Motion | None (no GSAP, no animations beyond Tailwind `animate-pulse` skeletons) |
| Visual theme | Light, minimal, utilitarian admin-style UI |
| Heading scale | `text-3xl font-semibold` max |

### Assessment
The design system and the actual application are completely different visual identities. The design system (`parallax-geometry/`) appears to be an aspirational or reference design that has not been applied to the product. The application uses a standard light-mode shadcn/Tailwind UI pattern with Geist font — functional but unrelated to the Parallax DS.

**Files where design system would need to apply:**
- `src/app/globals.css` — font stack, background colors
- `src/app/layout.tsx` — font loading, body class
- `src/app/page.tsx` — hero/listing presentation
- `src/features/events/event-list.tsx`, `src/features/events/event-card-skeleton.tsx`

**Impact:** If the Parallax DS is the intended target, all UI pages require a visual overhaul. If the current light UI is intentional, the design system document is stale/unused and creates confusion about product direction.

---

## Migration Readiness

### To Next.js (Frontend)
- **State:** Ready. The application already uses Next.js App Router (`src/app/`). Migration is essentially the identity transform.
- **Blocker:** `vinext` wraps Next.js. Removing vinext would require replacing `vinext dev/build/start` with standard `next dev/build/start` in `package.json` scripts and updating `worker/index.ts` to a standard Next.js server or Vercel deployment.
- **`src/lib/server-api.ts`** uses `next/headers` — this will port directly to Next.js.
- **Features layer** uses `next/navigation`, `next/link`, `next/font` — all standard Next.js APIs, will port without change.

### To NestJS (Backend)
- **State:** Partially ready. Domain and application layers are clean.
- **Good:** `src/server/domain/`, `src/server/application/`, `src/server/repositories/` have zero Next.js or Vinext imports. Use-cases accept explicit typed inputs and return typed outputs. Can be transplanted to NestJS as-is.
- **Gaps to address before migration:**
  - `src/server/api/` route-adapters are hand-written HTTP adapters specific to the Request/Response Web API. NestJS uses controllers/decorators. All route adapters will need to be rewritten as NestJS controllers.
  - `src/server/infrastructure/auth/auth.config.ts` uses `better-auth` with `toNextJsHandler()` — NestJS would need a different auth integration.
  - `src/server/infrastructure/db/client.ts` uses `@neondatabase/serverless` with WebSocket for Cloudflare Workers compat. NestJS on Node.js can use standard `postgres`/`pg` drivers with TCP, which would need a transport swap.
  - `worker/index.ts` is Cloudflare Workers-specific and has no NestJS equivalent.
  - The in-memory rate limiter in `src/server/api/middleware/rate-limiter.ts` would need to be replaced with a NestJS guard using Redis or similar.

### Portability Score by Layer
| Layer | Portability | Notes |
|-------|-------------|-------|
| `src/server/domain/` | ✅ Excellent | Pure TypeScript, no framework deps |
| `src/server/application/` | ✅ Excellent | Framework-agnostic, clean interfaces |
| `src/server/repositories/` | ✅ Good | Drizzle ORM is framework-agnostic; transport needs swap for NestJS |
| `src/server/api/` | ⚠️ Requires rewrite | HTTP adapters tied to Web Request/Response API |
| `src/server/infrastructure/` | ⚠️ Requires changes | Auth and DB clients are Workers-optimized |
| `src/app/` (pages/UI) | ✅ Good | Standard Next.js, migrates directly |
| `src/features/` | ✅ Good | Standard React + Next.js navigation |
| `worker/` | ❌ Replace | Cloudflare Workers entry point |

---

## Incomplete / Missing Features

### 1. No Next.js Route Middleware for Auth Protection
- **Missing:** `src/middleware.ts`
- **Impact:** `/admin` and `/checkin` pages are accessible to unauthenticated users at the UI level. API layer enforces auth correctly, but the UI renders regardless.

### 2. No Event Image Upload — URL-Only
- **Files:** `src/server/api/schemas/create-event.schema.ts`, `src/server/application/use-cases/create-event.use-case.ts`
- **Issue:** The `imageUrl` field in event creation is a plain text URL. There is no file upload endpoint, no storage integration, and no image hosting. Organizers must provide an externally-hosted URL.

### 3. No Pagination UI for Event Listing
- **Files:** `src/server/api/schemas/list-events.schema.ts` (cursor/page params exist), `src/features/events/event-list.tsx`
- **Issue:** The API supports cursor-based pagination and page/limit params. The UI implementation in `src/features/events/event-list.tsx` uses a load-more button/infinite scroll but the full pagination schema support (date filters, location, category, cursor tokens) may not be fully surfaced in the UI.

### 4. No E2E Test Suite
- **Issue:** There are unit, integration, and regression tests, but no end-to-end browser tests (no `playwright.config.ts`, no `cypress.config.ts`, no E2E test files found in `tests/`).
- **Impact:** Critical user flows (checkout, check-in, admin event creation) are not covered by automated browser tests.

### 5. No `src/app/eventos/page.tsx` (Orphaned Loading State)
- **File:** `src/app/eventos/loading.tsx` (exists, no page)
- **Issue:** A loading skeleton for an events listing at `/eventos` exists but the route has no page. Navigation to `/eventos` would result in a 404. The actual listing is on the home page.

### 6. Organizer Self-Service Is Missing (Admin-Only Operations)
- **Issue:** Based on AGENTS.md RBAC, `organizer` role should be able to create and manage their own events. Currently `create event`, `publish event`, `create lot`, and `create coupon` are accessible to both `organizer` and `admin`. However, the admin UI (`/admin`) has no role-based visibility — a `customer` navigating to `/admin` sees the full form (though API calls will fail).

---

## Recommendations

### High Priority

1. **Add Next.js middleware for route protection** (`src/middleware.ts`) — protect `/admin` and `/checkin` routes with session checks and redirects. This is a straightforward addition that closes the UI auth gap.

2. **Consolidate DB access to `getDb()` singleton** — replace the 33+ independent `createDb(getDatabaseUrlOrThrow())` calls in route files with `getDb()` from `src/server/infrastructure/db`. This eliminates the coupling to `create-order.route-adapter.ts` and reduces connection pool sprawl.

3. **Remove `package-lock.json`** — stale npm lockfile contradicts the bun-only policy in AGENTS.md. Add to `.gitignore`.

### Medium Priority

4. **Relocate `getDatabaseUrlOrThrow`** — either remove it entirely (use infra `getDb()`) or move to a dedicated utility in `src/server/infrastructure/db/`. Removing the export from `create-order.route-adapter.ts` removes a confusing cross-domain dependency.

5. **Move `create-order.handler.ts`** to `src/server/api/orders/create-order.handler.ts` — aligns with all other handler placement conventions.

6. **Delete or implement `src/app/eventos/loading.tsx`** — either create the missing `page.tsx` for a dedicated `/eventos` listing route, or delete the orphaned skeleton.

7. **Add startup validation for required env vars** — particularly `CRON_SECRET`, `DATABASE_URL`, `BETTER_AUTH_SECRET`. Fail fast at startup rather than at runtime request time.

### Low Priority

8. **Move `src/lib/server-api.ts`** to `src/app/lib/server-api.ts` — keeps Next.js-specific utilities scoped to the app layer, improving NestJS migration clarity.

9. **Clarify design system intent** — either begin applying the Parallax DS to the UI (dark theme, Space Grotesk, GSAP animations) or document that `parallax-geometry/` is a reference-only artifact not intended for this product's UI.

10. **Create a composition root** (`src/server/composition-root.ts`) — centralize dependency wiring for all route handlers to reduce duplication across `src/app/api/*/route.ts` files.

11. **Extend rate limiting** to organizer/admin mutation endpoints (`POST /api/events`, `POST /api/lots`, `PATCH /api/lots/[id]`, coupon endpoints).

---

*Concerns audit: 2026-07-09*
