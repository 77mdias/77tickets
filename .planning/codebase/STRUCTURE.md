# Directory Structure

**Analysis Date:** 2025-01-31

## Root Layout

```
77ticket/
├── src/                        # All application source code
│   ├── app/                    # Next.js App Router (pages, layouts, API routes)
│   ├── features/               # Client-side feature modules (UI logic, types, helpers)
│   ├── server/                 # All server-side layered architecture
│   ├── lib/                    # Shared utilities (server-side helpers)
│   └── build/                  # Build-time utilities
├── tests/                      # All tests (unit, integration, regression)
│   ├── unit/                   # Unit tests mirroring src/ structure
│   ├── integration/            # Integration tests (real DB + HTTP)
│   ├── regression/             # Regression tests for locked behavior
│   └── fixtures/               # Shared test fixture factories
├── drizzle/                    # DB migration SQL files + meta
├── worker/                     # Cloudflare Worker entry point
├── scripts/                    # Dev/CI utility scripts
│   ├── ci/                     # CI helper scripts (audit, checks)
│   └── smoke/                  # Smoke test scripts against live server
├── public/                     # Static assets (images, videos, manifest)
├── docs/                       # Project documentation, sprint logs
├── parallax-geometry/          # Static assets for parallax UI effects
├── next.config.ts              # Next.js config
├── wrangler.toml               # Cloudflare Workers config
├── drizzle.config.ts           # Drizzle ORM CLI config
├── vitest.config.ts            # Vitest config (unit tests)
├── vitest.integration.config.ts # Vitest config (integration tests)
├── vite.config.ts              # Vite config
├── tsconfig.json               # TypeScript config (path alias @/* → src/*)
├── eslint.config.mjs           # ESLint config
├── postcss.config.mjs          # PostCSS config (Tailwind)
├── package.json                # Dependencies and scripts
└── bun.lock                    # Bun lockfile
```

---

## src/ Breakdown

### `src/app/` — Next.js App Router

```
src/app/
├── layout.tsx                  # Root layout (fonts, toast, service worker)
├── page.tsx                    # Home: public event listing
├── error.tsx                   # Root error boundary
├── globals.css                 # Global Tailwind styles
├── favicon.ico
├── admin/
│   ├── page.tsx                # Organizer/admin event management dashboard
│   ├── loading.tsx
│   └── error.tsx
├── checkin/
│   └── page.tsx                # QR check-in scanner UI
├── checkout/
│   ├── page.tsx                # Checkout initiation
│   ├── simulate/page.tsx       # Demo payment simulation
│   ├── success/page.tsx        # Post-payment confirmation
│   ├── cancel/page.tsx         # Payment cancelled
│   └── error.tsx
├── eventos/
│   └── [slug]/
│       ├── page.tsx            # Public event detail page
│       ├── loading.tsx
│       └── error.tsx
├── login/
│   └── page.tsx                # Authentication login page
├── meus-ingressos/
│   ├── page.tsx                # Customer's ticket list
│   ├── loading.tsx
│   └── error.tsx
└── api/                        # API routes (thin wiring only)
    ├── auth/[...all]/route.ts  # Better Auth catch-all handler
    ├── checkin/route.ts        # POST validate check-in
    ├── coupons/
    │   ├── create/route.ts     # POST create coupon
    │   └── update/route.ts     # PATCH update coupon
    ├── cron/
    │   └── event-reminders/route.ts  # GET scheduled reminder email job
    ├── events/
    │   ├── route.ts            # GET list events, POST create event
    │   ├── publish/route.ts    # POST publish event
    │   ├── update-status/route.ts    # PATCH update event lifecycle
    │   └── [slug]/
    │       ├── route.ts        # GET event by slug
    │       ├── analytics/route.ts    # GET event analytics
    │       └── orders/route.ts       # GET event orders (organizer)
    ├── lots/
    │   ├── route.ts            # POST create lot
    │   └── [id]/route.ts       # PATCH update lot
    ├── orders/
    │   ├── route.ts            # POST create order
    │   ├── mine/route.ts       # GET customer's orders
    │   └── [id]/simulate-payment/route.ts  # POST simulate payment (demo)
    └── webhooks/
        └── stripe/route.ts     # POST Stripe webhook
```

### `src/server/` — Layered Server Architecture

```
src/server/
├── index.ts                    # Top-level server exports
├── api/                        # Handler + route adapter layer
│   ├── index.ts
│   ├── create-order.handler.ts         # Core order creation handler
│   ├── error-mapper.ts                 # AppError → HTTP status mapping
│   ├── security-response.ts            # Secure JSON response helpers
│   ├── auth/
│   │   ├── get-session.ts              # Session factory (createGetSession)
│   │   └── index.ts
│   ├── checkin/
│   │   ├── validate-checkin.handler.ts
│   │   └── validate-checkin.route-adapter.ts
│   ├── coupons/
│   │   ├── create-coupon.handler.ts
│   │   ├── update-coupon.handler.ts
│   │   └── coupons.route-adapter.ts
│   ├── events/
│   │   ├── create-event.handler.ts
│   │   ├── get-event.handler.ts
│   │   ├── get-event-analytics.handler.ts
│   │   ├── get-event-analytics.route-adapter.ts
│   │   ├── list-events.handler.ts
│   │   ├── publish-event.handler.ts
│   │   ├── update-event.handler.ts
│   │   ├── events.route-adapter.ts
│   │   └── public-events.route-adapter.ts
│   ├── lots/
│   │   ├── create-lot.handler.ts
│   │   ├── update-lot.handler.ts
│   │   └── lots.route-adapter.ts
│   ├── middleware/
│   │   ├── index.ts
│   │   ├── rate-limiter.ts             # In-memory rate limiter (Workers-compatible)
│   │   └── rate-limit-request.ts
│   ├── orders/
│   │   ├── create-order.route-adapter.ts
│   │   ├── get-customer-orders.handler.ts
│   │   ├── get-customer-orders.route-adapter.ts
│   │   ├── list-event-orders.handler.ts
│   │   └── list-event-orders.route-adapter.ts
│   ├── schemas/                        # Zod input validation schemas
│   │   ├── index.ts
│   │   ├── create-order.schema.ts
│   │   ├── create-event.schema.ts
│   │   ├── update-event.schema.ts
│   │   ├── publish-event.schema.ts
│   │   ├── create-lot.schema.ts
│   │   ├── update-lot.schema.ts
│   │   ├── create-coupon.schema.ts
│   │   ├── update-coupon.schema.ts
│   │   ├── get-event.schema.ts
│   │   ├── list-events.schema.ts
│   │   ├── list-event-orders.schema.ts
│   │   └── validate-checkin.schema.ts
│   └── validation/
│       ├── index.ts
│       └── parse-input.ts              # Zod parseInput() helper
├── application/                # Use-case / business orchestration layer
│   ├── index.ts
│   ├── use-cases/              # 22 use-case factory functions
│   │   ├── index.ts
│   │   ├── create-order.use-case.ts
│   │   ├── confirm-order-payment.use-case.ts
│   │   ├── cancel-order-on-payment-failure.use-case.ts
│   │   ├── simulate-payment.use-case.ts
│   │   ├── create-stripe-checkout-session.use-case.ts
│   │   ├── get-customer-orders.use-case.ts
│   │   ├── list-event-orders.use-case.ts
│   │   ├── create-event.use-case.ts
│   │   ├── publish-event.use-case.ts
│   │   ├── update-event-status.use-case.ts
│   │   ├── get-event-detail.use-case.ts
│   │   ├── get-event-analytics.use-case.ts
│   │   ├── list-published-events.use-case.ts
│   │   ├── create-lot.use-case.ts
│   │   ├── update-lot.use-case.ts
│   │   ├── create-coupon.use-case.ts
│   │   ├── update-coupon.use-case.ts
│   │   ├── validate-checkin.use-case.ts
│   │   ├── send-order-confirmation-email.use-case.ts
│   │   └── send-event-reminder-email.use-case.ts
│   ├── security/               # RBAC policy enforcement
│   │   ├── index.ts
│   │   ├── security.types.ts           # SecurityActor, UserRole types
│   │   ├── ownership.policy.ts         # Event ownership + admin bypass
│   │   ├── create-order.policy.ts      # Customer can only order for self
│   │   └── checkin-access.policy.ts
│   ├── errors/                 # AppError class and typed factories
│   │   ├── index.ts
│   │   ├── app-error.ts                # AppError class + create* helpers
│   │   ├── app-error.types.ts          # AppErrorCode, AppErrorPayload types
│   │   └── map-unknown-error.ts        # Unknown → AppError mapper
│   ├── orders/
│   │   ├── index.ts
│   │   └── order.types.ts              # CreateOrderInput, CreateOrderResult
│   ├── events/
│   │   ├── index.ts
│   │   └── event.types.ts
│   ├── checkin/
│   │   ├── index.ts
│   │   └── checkin.types.ts
│   └── coupons/
│       ├── index.ts
│       ├── coupon.types.ts
│       └── coupon-governance.validation.ts
├── domain/                     # Pure business types and rules (no I/O)
│   ├── index.ts
│   ├── shared.types.ts                 # EntityId = string
│   ├── events/
│   │   ├── index.ts
│   │   └── event.types.ts              # Event, EventLifecycleStatus
│   ├── lots/
│   │   ├── index.ts
│   │   ├── lot.types.ts                # Lot, LotStatus
│   │   └── lot.rules.ts                # validateLotForPurchase()
│   ├── orders/
│   │   ├── index.ts
│   │   ├── order.types.ts              # Order, OrderStatus, OrderItem
│   │   └── order.rules.ts              # validateOrderTransition(), status FSM
│   ├── tickets/
│   │   ├── index.ts
│   │   ├── ticket.types.ts             # Ticket, TicketStatus
│   │   └── ticket.rules.ts             # isTicketValidForCheckin()
│   └── coupons/
│       ├── index.ts
│       ├── coupon.types.ts             # Coupon, DiscountType
│       └── coupon.rules.ts             # validateCouponEligibility(), applyCouponDiscount()
├── repositories/               # Persistence contracts + Drizzle implementations
│   ├── index.ts
│   ├── common.repository.contracts.ts  # EntityId alias
│   ├── persistence-error.ts
│   ├── event.repository.contracts.ts   # EventRepository interface + EventRecord
│   ├── order.repository.contracts.ts   # OrderRepository interface + record types
│   ├── lot.repository.contracts.ts
│   ├── ticket.repository.contracts.ts
│   ├── coupon.repository.contracts.ts
│   ├── user.repository.contracts.ts
│   └── drizzle/                        # Drizzle ORM implementations
│       ├── index.ts
│       ├── drizzle-event.repository.ts
│       ├── drizzle-order.repository.ts
│       ├── drizzle-lot.repository.ts
│       ├── drizzle-ticket.repository.ts
│       ├── drizzle-coupon.repository.ts
│       ├── drizzle-user.repository.ts
│       └── map-persistence-error.ts
├── infrastructure/             # Replaceable external adapters
│   ├── index.ts
│   ├── auth/
│   │   ├── index.ts
│   │   ├── auth.config.ts              # Better Auth setup with Drizzle adapter
│   │   ├── auth.client.ts              # Client-side auth helper
│   │   └── get-session.ts              # Wires auth to createGetSession factory
│   ├── db/
│   │   ├── index.ts
│   │   ├── client.ts                   # createDb() (WebSocket) + createHttpDb() (HTTP)
│   │   ├── schema.ts                   # Re-exports all schema tables
│   │   └── schema/
│   │       ├── index.ts
│   │       ├── users.ts
│   │       ├── events.ts
│   │       ├── lots.ts
│   │       ├── orders.ts
│   │       ├── tickets.ts
│   │       └── coupons.ts
│   └── observability/
│       ├── index.ts
│       ├── audit-trail.ts              # logOrderCreated, logCheckinValidated, logEventPublished
│       └── checkout-observability.ts   # trackCheckoutAttempt, trackCreateOrderExecution
├── email/                      # Email provider abstraction
│   ├── index.ts
│   ├── email.provider.ts               # EmailProvider interface
│   ├── resend.email-provider.ts        # Resend implementation
│   └── templates/
│       ├── order-confirmation.template.ts
│       └── event-reminder.template.ts
└── payment/                    # Payment provider abstraction
    ├── payment.provider.ts             # PaymentProvider interface
    └── stripe.payment-provider.ts      # Stripe implementation
```

### `src/features/` — Client-Side Feature Modules

Client-side types, form value interfaces, and client utilities. Not server logic.

```
src/features/
├── admin/
│   └── management-client.ts    # Admin form types (ManagementActorValues, etc.)
├── auth/                       # Auth feature client utilities
├── checkin/
│   ├── checkin-client.ts       # CheckinFormValues, buildCheckinPayload()
│   └── qr-scanner-client.ts    # Camera error mapping, QR parse helper
├── checkout/
│   └── checkout-client.ts      # CheckoutFormValues, CheckoutPayload
├── events/                     # Event listing/search UI components
└── tickets/
    └── qr-client.ts            # generateTicketQrDataUrl() (uses qrcode library)
```

### `src/lib/` — Shared Utilities

```
src/lib/
└── server-api.ts               # getServerBaseUrl(), getServerCookieHeader()
                                # (server-side request header utilities for Next.js)
```

### `src/build/` — Build Utilities

Build-time helpers (content for compiled output).

---

## tests/ Breakdown

```
tests/
├── AGENTS.md                   # TDD rules and test scope guidance
├── fixtures/
│   └── index.ts                # Shared test data factory functions
├── unit/                       # Pure unit tests (no real DB/network)
│   ├── server/
│   │   ├── api/                # Handler + route adapter tests
│   │   │   ├── create-order.handler.test.ts
│   │   │   ├── schemas/        # Zod schema validation tests
│   │   │   ├── checkin/
│   │   │   ├── coupons/
│   │   │   ├── events/
│   │   │   ├── lots/
│   │   │   ├── middleware/
│   │   │   ├── orders/
│   │   │   └── validation/
│   │   ├── application/
│   │   │   ├── security/       # Policy unit tests
│   │   │   └── use-cases/      # Use-case unit tests
│   │   ├── domain/             # Domain rule unit tests
│   │   │   ├── coupons/
│   │   │   ├── lots/
│   │   │   ├── orders/
│   │   │   └── tickets/
│   │   ├── email/templates/    # Email template unit tests
│   │   ├── infrastructure/     # Infrastructure unit tests
│   │   ├── payment/            # Payment provider unit tests
│   │   └── repositories/       # Repository unit tests (mocked DB)
│   ├── app/api/                # API route wiring tests
│   ├── api/middleware/         # Middleware unit tests
│   ├── application/            # Application-level unit tests
│   ├── architecture/           # Architecture boundary enforcement tests
│   ├── build/                  # Build artifact tests
│   ├── features/               # Client feature module tests
│   └── use-cases/              # Additional use-case tests
├── integration/                # Integration tests (real Neon DB via TEST_DATABASE_URL)
│   ├── setup/                  # DB setup/teardown helpers
│   ├── api/                    # Full HTTP → DB integration tests
│   │   ├── auth/               # Auth flow integration
│   │   ├── checkin/            # Checkin auth tests
│   │   ├── coupons/            # Coupon auth tests
│   │   ├── events/             # Event CRUD + analytics integration
│   │   ├── lots/               # Lot auth tests
│   │   ├── orders/             # Order creation + payment email integration
│   │   ├── webhooks/           # Stripe webhook integration
│   │   └── customer-flow.integration.test.ts  # End-to-end customer journey
│   ├── repositories/           # Repository → real DB integration tests
│   └── server/                 # Server-level integration tests
└── regression/                 # Regression tests locking previously broken behaviors
    ├── auth/                   # RBAC + session regression
    ├── checkin/                # Checkin behavior regression
    ├── events/                 # Event publish regression
    ├── orders/                 # Order state regression
    ├── runtime/                # Runtime compat regression (WeakRef, etc.)
    ├── stock-and-state.regression.test.ts
    ├── payment-flow.regression.test.ts
    └── email-not-sent-for-non-paid-orders.test.ts
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root Next.js layout (fonts, toast, service worker) |
| `src/app/api/orders/route.ts` | Order creation API route — primary checkout entry point |
| `src/server/api/create-order.handler.ts` | Core order handler with telemetry + audit hooks |
| `src/server/api/error-mapper.ts` | Maps AppError codes to HTTP status codes |
| `src/server/application/use-cases/create-order.use-case.ts` | Order creation business logic |
| `src/server/application/errors/app-error.ts` | AppError class + typed error factories |
| `src/server/application/security/ownership.policy.ts` | Event ownership RBAC enforcement |
| `src/server/domain/lots/lot.rules.ts` | Lot purchase validation rules |
| `src/server/domain/orders/order.rules.ts` | Order status FSM transitions |
| `src/server/repositories/order.repository.contracts.ts` | OrderRepository interface |
| `src/server/repositories/drizzle/drizzle-order.repository.ts` | Drizzle order persistence |
| `src/server/infrastructure/db/client.ts` | DB client factory (HTTP + WebSocket modes) |
| `src/server/infrastructure/auth/auth.config.ts` | Better Auth setup with Drizzle adapter |
| `src/server/infrastructure/auth/get-session.ts` | Wires Better Auth → createGetSession |
| `src/server/payment/payment.provider.ts` | PaymentProvider interface |
| `src/server/email/email.provider.ts` | EmailProvider interface |
| `worker/index.ts` | Cloudflare Worker entry (image opt + vinext handler) |
| `wrangler.toml` | Worker deployment config + env bindings |
| `drizzle.config.ts` | Drizzle CLI config (schema path, output dir) |
| `tests/fixtures/index.ts` | Shared test data factories |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration (minimal, no overrides detected) |
| `wrangler.toml` | Cloudflare Workers: worker name, main entry, assets dir, cron triggers, env bindings |
| `drizzle.config.ts` | Drizzle ORM: schema path `src/server/infrastructure/db/schema.ts`, migrations to `drizzle/` |
| `tsconfig.json` | TypeScript strict mode; path alias `@/*` maps to `src/*` |
| `vitest.config.ts` | Unit test config |
| `vitest.integration.config.ts` | Integration test config (uses `TEST_DATABASE_URL`) |
| `eslint.config.mjs` | ESLint config |
| `postcss.config.mjs` | PostCSS / Tailwind config |
| `.env.example` | Documents required environment variables |

---

## Naming Conventions

**Files:**
- Handler files: `<action>-<resource>.handler.ts` (e.g., `create-order.handler.ts`)
- Route adapters: `<resource>.route-adapter.ts` or `<action>-<resource>.route-adapter.ts`
- Use-cases: `<action>-<resource>.use-case.ts`
- Domain rules: `<resource>.rules.ts`
- Domain types: `<resource>.types.ts`
- Repository contracts: `<resource>.repository.contracts.ts`
- Drizzle implementations: `drizzle-<resource>.repository.ts`
- DB schema: `<resource>.ts` under `schema/`
- Tests mirror source path with `.test.ts` or `.integration.test.ts` or `.regression.test.ts`

**Directories:** kebab-case throughout

---

## Where to Add New Code

**New feature (e.g., `refunds`):**
1. Domain types + rules: `src/server/domain/refunds/refund.types.ts`, `refund.rules.ts`
2. Repository contract: `src/server/repositories/refund.repository.contracts.ts`
3. Drizzle implementation: `src/server/repositories/drizzle/drizzle-refund.repository.ts`
4. DB schema: `src/server/infrastructure/db/schema/refunds.ts` (export from `schema/index.ts`)
5. Use-case: `src/server/application/use-cases/create-refund.use-case.ts`
6. Zod schema: `src/server/api/schemas/create-refund.schema.ts`
7. Handler: `src/server/api/refunds/create-refund.handler.ts`
8. Route adapter: `src/server/api/refunds/refunds.route-adapter.ts`
9. API route: `src/app/api/refunds/route.ts` (thin wiring)
10. UI page (if needed): `src/app/refunds/page.tsx`
11. Tests: mirror structure under `tests/unit/` and `tests/integration/`

**New API endpoint (existing domain):**
- Add Zod schema to `src/server/api/schemas/`
- Add handler to `src/server/api/<domain>/`
- Add/extend route adapter in `src/server/api/<domain>/`
- Wire in `src/app/api/<domain>/route.ts`
- Tests in `tests/unit/server/api/<domain>/`

**New UI page:**
- Add to `src/app/<route>/page.tsx`
- Client types/helpers: `src/features/<domain>/`

**New utility:**
- Server-side shared: `src/lib/`
- Client-side: `src/features/<domain>/`

**New DB migration:**
- `bun run drizzle-kit generate` after editing schema in `src/server/infrastructure/db/schema/`
- Migration SQL lands in `drizzle/`

---

*Structure analysis: 2025-01-31*
