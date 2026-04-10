# Architecture

**Analysis Date:** 2025-01-31

## Pattern

**Overall:** Layered Clean Architecture (UI → Handler/Route Adapter → Use-Case → Repository → Infrastructure)

**Key Characteristics:**
- Strict boundary separation: each layer may only call the layer directly below it
- Domain and application logic are framework-agnostic and portable (future NestJS migration target)
- No business logic in UI, handlers, or repositories
- All pricing, totals, stock, ownership, and role decisions computed server-side
- Infrastructure concerns (ORM, auth, email, payment) are hidden behind interface contracts

---

## Layer Breakdown

### UI Layer (`src/app/`)

Next.js App Router pages and layouts. Pure presentation and user interaction only.

- **Location:** `src/app/`
- **Purpose:** Render pages, handle visual states, invoke API routes via `fetch`
- **Forbidden:** Direct DB access, business rule enforcement, trusted client-side calculations
- **Pages:**
  - `src/app/page.tsx` — Home / public event listing
  - `src/app/eventos/[slug]/page.tsx` — Public event detail
  - `src/app/checkout/page.tsx` — Checkout flow start
  - `src/app/checkout/simulate/page.tsx` — Demo payment simulation
  - `src/app/checkout/success/page.tsx` — Post-payment success
  - `src/app/checkout/cancel/page.tsx` — Payment cancellation
  - `src/app/meus-ingressos/page.tsx` — Customer ticket list
  - `src/app/checkin/page.tsx` — Check-in scanner UI
  - `src/app/admin/page.tsx` — Organizer/admin management dashboard
  - `src/app/login/page.tsx` — Auth login
- **Root layout:** `src/app/layout.tsx` (Google fonts, toast notifications, service worker registration)

### API Route Layer (`src/app/api/`)

Next.js App Router API routes. Each file exports HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`). Routes are **thin wiring** only: they instantiate dependencies (db, repositories, use-cases) and delegate to route adapters.

- **Location:** `src/app/api/`
- **Pattern:** Build infrastructure objects → inject into route adapter → export HTTP method function
- **Dependency injection:** Cached handler instances (module-level `let cached... = null`) avoid rebuilding per request
- **Key routes:**
  - `src/app/api/orders/route.ts` → POST creates orders via `createCreateOrderRouteAdapter`
  - `src/app/api/orders/mine/route.ts` → GET customer's own orders
  - `src/app/api/orders/[id]/simulate-payment/route.ts` → POST simulate payment (demo mode)
  - `src/app/api/events/route.ts` → GET list published events, POST create event
  - `src/app/api/events/[slug]/route.ts` → GET event by slug
  - `src/app/api/events/publish/route.ts` → POST publish event
  - `src/app/api/events/update-status/route.ts` → PATCH update event lifecycle status
  - `src/app/api/events/[slug]/analytics/route.ts` → GET event analytics
  - `src/app/api/events/[slug]/orders/route.ts` → GET event orders (organizer)
  - `src/app/api/lots/route.ts` → POST create lot
  - `src/app/api/lots/[id]/route.ts` → PATCH update lot
  - `src/app/api/coupons/create/route.ts` → POST create coupon
  - `src/app/api/coupons/update/route.ts` → PATCH update coupon
  - `src/app/api/checkin/route.ts` → POST validate check-in
  - `src/app/api/webhooks/stripe/route.ts` → POST Stripe webhook handler
  - `src/app/api/cron/event-reminders/route.ts` → GET scheduled reminder emails
  - `src/app/api/auth/[...all]/route.ts` → Better Auth catch-all

### Server/Handler Layer (`src/server/api/`)

Framework-agnostic handler functions and route adapters. Handlers parse and validate input, enforce auth/RBAC, call use-cases, and map errors to structured HTTP responses.

- **Location:** `src/server/api/`
- **Two sub-patterns:**
  1. **Handler** (e.g., `create-order.handler.ts`) — pure function that receives a typed `{actor, body}` request; calls use-case; returns typed response object (not a `Response`)
  2. **Route adapter** (e.g., `orders/create-order.route-adapter.ts`) — wraps a handler to translate `Request → Response`; handles session extraction, rate limiting, and serialization
- **Auth resolution:** `src/server/api/auth/get-session.ts` → factory `createGetSession(resolveSession)` → throws `unauthenticated` AppError if no session
- **Error mapping:** `src/server/api/error-mapper.ts` → maps `AppError.code` to HTTP status codes:
  - `validation → 400`, `unauthenticated → 401`, `authorization → 403`, `not-found → 404`, `conflict → 409`, `rate_limited → 429`, `internal → 500`
- **Middleware:** `src/server/api/middleware/rate-limiter.ts` — in-memory rate limiter (compatible with Cloudflare Workers edge runtime); pre-configured limits: orders (10/min), auth (5/min), checkin (60/min)
- **Validation:** `src/server/api/validation/parse-input.ts` — Zod-based input parser used by all handlers; `src/server/api/schemas/` contains per-endpoint Zod schemas
- **Observability/audit hooks** in handler layer: telemetry entries emitted for checkout attempts, unauthorized access logged via audit trail

### Application / Use-Case Layer (`src/server/application/`)

Business orchestration. Use-cases coordinate repositories, call domain rules, and enforce application-level policies. No framework dependencies allowed.

- **Location:** `src/server/application/use-cases/`
- **Pattern:** Factory functions (`createXxxUseCase(deps)`) returning async functions; all dependencies injected via constructor-like dependency object
- **Use-cases (22 total):**
  - Event: `create-event`, `publish-event`, `update-event-status`, `get-event-detail`, `list-published-events`, `get-event-analytics`
  - Order: `create-order`, `confirm-order-payment`, `cancel-order-on-payment-failure`, `simulate-payment`, `list-event-orders`, `get-customer-orders`
  - Lot: `create-lot`, `update-lot`
  - Coupon: `create-coupon`, `update-coupon`
  - Checkin: `validate-checkin`
  - Payment: `create-stripe-checkout-session`
  - Email: `send-order-confirmation-email`, `send-event-reminder-email`
- **Security policies:** `src/server/application/security/` — `ownership.policy.ts` (organizer/admin event management access), `create-order.policy.ts` (customer can only order for themselves), `checkin-access.policy.ts`; all throw `AppError` on violation
- **Error types:** `src/server/application/errors/` — `AppError` class with typed codes; factory helpers: `createValidationError`, `createNotFoundError`, `createAuthorizationError`, `createConflictError`, `createInternalError`, etc.
- **Application types:** `src/server/application/orders/`, `events/`, `checkin/`, `coupons/` — typed input/output interfaces for each use-case

### Repository Layer (`src/server/repositories/`)

Persistence contracts (interfaces) and Drizzle ORM implementations. Use-cases only depend on contract interfaces.

- **Location:**
  - Contracts: `src/server/repositories/*.repository.contracts.ts`
  - Drizzle implementations: `src/server/repositories/drizzle/`
- **Contracts defined for:** `EventRepository`, `OrderRepository`, `LotRepository`, `CouponRepository`, `TicketRepository`, `UserRepository`
- **Implementations:**
  - `DrizzleEventRepository` — `src/server/repositories/drizzle/drizzle-event.repository.ts`
  - `DrizzleOrderRepository` — `src/server/repositories/drizzle/drizzle-order.repository.ts`
  - `DrizzleLotRepository` — `src/server/repositories/drizzle/drizzle-lot.repository.ts`
  - `DrizzleCouponRepository` — `src/server/repositories/drizzle/drizzle-coupon.repository.ts`
  - `DrizzleTicketRepository` — `src/server/repositories/drizzle/drizzle-ticket.repository.ts`
  - `DrizzleUserRepository` — `src/server/repositories/drizzle/drizzle-user.repository.ts`
- **Error mapping:** `src/server/repositories/drizzle/map-persistence-error.ts` — maps raw DB errors to `PersistenceError` types; repository implementations re-map to `AppError` before throwing
- **Transactions:** `DrizzleOrderRepository.create()` uses `db.transaction()` (WebSocket transport required)

### Domain Layer (`src/server/domain/`)

Pure business types and invariant functions. No framework dependencies, no I/O.

- **Location:** `src/server/domain/`
- **Entities defined:** `Event`, `Lot`, `Order`, `OrderItem`, `Ticket`, `Coupon`
- **Shared primitive:** `EntityId = string` in `src/server/domain/shared.types.ts`
- **Rules modules** (pure functions returning typed result objects):
  - `src/server/domain/lots/lot.rules.ts` — `validateLotForPurchase()`, checks: sale window, active status, per-order limit, stock
  - `src/server/domain/orders/order.rules.ts` — `validateOrderTransition()`, defines allowed status FSM: `pending → paid|expired|cancelled`, `paid → cancelled`
  - `src/server/domain/tickets/ticket.rules.ts` — `isTicketValidForCheckin()`, checks: active status + paid order
  - `src/server/domain/coupons/coupon.rules.ts` — `validateCouponEligibility()`, `applyCouponDiscount()`; supports `fixed` and `percentage` discount types
- **Result pattern:** domain rule functions return `{ ok: true } | { ok: false; reason: string }` — no exceptions thrown from domain

---

## Data Flow

### Order Creation (primary flow)

```
Browser (checkout page)
  → POST /api/orders                          [src/app/api/orders/route.ts]
  → createCreateOrderRouteAdapter             [src/server/api/orders/create-order.route-adapter.ts]
      → getSession() → extract userId + role  [src/server/infrastructure/auth/get-session.ts]
      → enforceRateLimit()                    [src/server/api/middleware/rate-limit-request.ts]
      → merge customerId (server-side) into body
  → createCreateOrderHandler                  [src/server/api/create-order.handler.ts]
      → parseInput(createOrderSchema, body)   [Zod validation]
      → assertCreateOrderAccess(actor, ...)   [src/server/application/security/create-order.policy.ts]
      → createOrder(input)                    [src/server/application/use-cases/create-order.use-case.ts]
          → lotRepository.findByIds()         [DrizzleLotRepository]
          → validateLotForPurchase()          [domain rules]
          → couponRepository.findByCodeForEvent() [if coupon provided]
          → validateCouponEligibility()       [domain rules]
          → applyCouponDiscount()             [domain rules]
          → orderRepository.create()          [DrizzleOrderRepository — in transaction]
          → lotRepository.decrementAvailableQuantity()
      → [if stripe mode] createStripeCheckoutSession()
      → trackCheckoutAttempt() [observability — best-effort]
  → JSON Response { data: { orderId, checkoutUrl, ... } }
```

### Payment Confirmation (Stripe webhook)

```
Stripe → POST /api/webhooks/stripe
  → constructWebhookEvent() [verify signature]
  → confirmOrderPayment use-case
      → orderRepository.updateStatusIfCurrent(pending → paid)
      → ticketRepository.activateTickets()
      → sendOrderConfirmationEmail use-case
          → emailProvider.sendOrderConfirmation() [Resend]
```

### Check-in Flow

```
Checker (checkin page) → POST /api/checkin
  → validateCheckinRouteAdapter
      → getSession() [must be checker/organizer/admin]
  → validateCheckinHandler
      → assertCheckinAccess()
      → validateCheckin use-case
          → ticketRepository.findByCode()
          → isTicketValidForCheckin() [domain rule]
          → ticketRepository.markAsUsed()
```

### Auth Flow

```
User → POST /api/auth/sign-up or /sign-in
  → Better Auth handler [src/server/infrastructure/auth/auth.config.ts]
      → Drizzle HTTP adapter → Neon PostgreSQL
      → Role enforced: only "customer" | "organizer" allowed on public signup
  → Session stored in cookie (bearer plugin also supported)
```

**State Management (client-side):**
- Minimal client state; pages fetch from API routes on mount
- No global state library detected; `fetch`-based calls from React components/pages

---

## Error Handling

**Strategy:** Typed `AppError` class with explicit error codes; errors bubble from domain → use-case → handler → route adapter → HTTP response.

**Flow:**
1. Domain rules return `{ ok: false; reason }` — callers convert to `AppError` (no domain exceptions)
2. Use-cases throw `AppError` instances (`conflict`, `not-found`, `validation`, etc.)
3. Handlers catch all errors → `mapAppErrorToResponse()` converts to `{ status, body: { error: AppErrorPayload } }`
4. Unknown errors → `mapUnknownErrorToAppError()` wraps in `internal` AppError
5. Raw DB/internal errors never leak to clients

**AppError codes:** `validation | unauthenticated | authorization | not-found | conflict | rate_limited | internal`

---

## Cross-Cutting Concerns

**Authentication:** Better Auth (`better-auth`) with Drizzle adapter; HTTP transport for session queries (non-transactional); role stored as custom user field; session resolved server-side per request via `getSession()`

**Authorization (RBAC):** Roles: `customer`, `organizer`, `admin`, `checker`; enforced via policy functions in `src/server/application/security/`; `admin` bypasses ownership checks; `organizer` scoped to own events

**Validation:** Zod schemas in `src/server/api/schemas/`; `parseInput()` used at all handler boundaries; validates body, params, query

**Observability:** Console-based structured logging; `createConsoleCheckoutObservability()` emits JSON telemetry; `createAuditTrail()` for security-relevant actions (order created, checkin, event published); best-effort (never breaks request flow)

**Rate Limiting:** In-memory per-worker (demo); Cloudflare KV integration documented as production upgrade path

**Email:** `EmailProvider` interface (`src/server/email/email.provider.ts`); Resend implementation (`src/server/email/resend.email-provider.ts`); HTML templates in `src/server/email/templates/`

**Payment:** `PaymentProvider` interface (`src/server/payment/payment.provider.ts`); Stripe implementation (`src/server/payment/stripe.payment-provider.ts`); demo mode (in-app simulation) toggled via `PAYMENT_MODE` env var

---

## Key Architectural Rules (from AGENTS.md)

1. **Primary flow is non-negotiable:** `UI → handler/route adapter → use-case → repository → database`
2. **UI must not contain business rules.** Handlers/routes must remain thin.
3. **Domain and application code must be framework-agnostic and portable** (target: NestJS migration with minimal rewrite)
4. **Never trust client-provided sensitive data.** Always derive server-side: pricing, totals, event ownership, ticket status, role permissions
5. **All external input validated with Zod** at boundaries (body, params, query, form, webhooks, URL-derived values)
6. **Handlers return stable, structured error shapes.** Do not leak raw DB/internal errors.
7. **Infrastructure concerns must not leak into domain/application.**
8. **TDD is mandatory** for new features, bug fixes, and behavior changes. A task is only complete when tests pass and architectural boundaries remain intact.
9. **Domain invariants (non-negotiable):**
   - Unpublished/cancelled events are not purchasable
   - Lots respect sale windows, per-order limits, cannot oversell
   - Order totals are computed server-side with explicit status transitions
   - Expired unpaid orders do not produce valid active tickets
   - Used/cancelled tickets are invalid; check-in blocks duplicate usage
   - Coupons respect validity windows, usage limits, and applicability rules

---

*Architecture analysis: 2025-01-31*
