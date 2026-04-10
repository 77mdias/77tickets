---
sprint: 018-nestjs-extraction
reviewed: 2025-01-27T00:00:00Z
depth: deep
files_reviewed: 26
files_reviewed_list:
  - packages/backend/src/main.ts
  - packages/backend/src/app.module.ts
  - packages/backend/src/common/app-exception.filter.ts
  - packages/backend/src/auth/session.guard.ts
  - packages/backend/src/auth/roles.guard.ts
  - packages/backend/src/auth/ownership.guard.ts
  - packages/backend/src/auth/auth.module.ts
  - packages/backend/src/auth/current-user.decorator.ts
  - packages/backend/src/api/events/events.controller.ts
  - packages/backend/src/api/events/events.module.ts
  - packages/backend/src/api/lots/lots.controller.ts
  - packages/backend/src/api/lots/lots.module.ts
  - packages/backend/src/api/orders/orders.controller.ts
  - packages/backend/src/api/orders/orders.module.ts
  - packages/backend/src/api/checkin/checkin.controller.ts
  - packages/backend/src/api/checkin/checkin.module.ts
  - packages/backend/src/api/coupons/coupons.controller.ts
  - packages/backend/src/api/coupons/coupons.module.ts
  - packages/backend/src/api/webhooks/webhooks.controller.ts
  - packages/backend/src/api/cron/cron.controller.ts
  - packages/backend/src/application/application.module.ts
  - packages/backend/src/infrastructure/database/database.module.ts
  - packages/backend/src/email/email.module.ts
  - packages/backend/src/payment/payment.module.ts
  - packages/backend/src/payment/stripe.payment-provider.ts
  - tests/integration/setup/index.ts
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Sprint 018: NestJS Backend Extraction — Code Review

**Reviewed:** 2025-01-27  
**Depth:** deep (cross-file analysis, call-chain tracing)  
**Files Reviewed:** 26  
**Status:** issues_found

## Summary

The NestJS extraction is structurally solid. The module graph is clean, DI tokens are consistent between `ApplicationModule` providers and controller `@Inject` decorators, and the factory-function pattern for use-cases works correctly. Zod validation is applied at all external input boundaries. The `rawBody: true` / Stripe HMAC path is correct. The `CREATE_PUBLISH_EVENT_FOR_ORGANIZER` ownership-baked-at-construction-time pattern is well executed.

Two security issues found require immediate attention before this goes to production:

1. **IDOR on `PATCH /api/events/:slug/status`**: the URL slug (used for ownership check) and the `eventId` in the request body (what the use-case actually operates on) are completely independent — any organizer can cancel any other organizer's event.

2. **Security regression in checkin**: the original handler called `assertCheckinAccess` to enforce event ownership for organizer-role callers; the NestJS controller dropped that call, allowing any organizer to check in tickets for events they don't own.

---

## Critical Issues

### CR-01: IDOR — `PATCH /api/events/:slug/status` slug/eventId decoupled

**File:** `packages/backend/src/api/events/events.controller.ts:119-125`  
**Issue:**  
`OwnershipGuard` checks ownership via the URL `:slug` parameter (it fetches the event by slug and verifies `event.organizerId === user.id`). However, the `updateEventSchema` in the request body contains a separate `eventId: z.string().uuid()` field, and that `eventId` is what `updateEventStatus` actually operates on. The two are never cross-validated.

**Attack scenario:**  
Organizer B (owns "event-b") sends:
```
PATCH /api/events/event-b/status
{ "eventId": "<uuid-of-event-A>", "targetStatus": "cancelled" }
```
`OwnershipGuard` verifies they own "event-b" → passes. `updateEventStatus` cancels event-A (which belongs to Organizer A). The `updateEventStatus` use-case performs no ownership check of its own.

**Verify:** `packages/backend/src/application/use-cases/update-event-status.use-case.ts:20` — use-case does `findById(input.eventId)` then immediately applies the update with no actor/ownership assertion.

**Fix (option A — preferred):** Remove `eventId` from the body schema, look up the event by slug in the controller, and pass the resolved ID to the use-case:
```typescript
// events.controller.ts
@Patch(':slug/status')
@UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
@Roles('organizer')
async updateStatus(
  @Param() params: unknown,
  @Body() body: unknown,
) {
  const { slug } = slugParamsSchema.parse(params);
  const { targetStatus } = z.object({
    targetStatus: z.enum(['draft', 'published', 'cancelled'])
  }).strict().parse(body);
  // OwnershipGuard already verified ownership — look up ID from slug
  const event = await this.eventRepository.findBySlug(slug);
  return this.updateEventStatus({ eventId: event!.id, targetStatus });
}
```

**Fix (option B):** Add ownership assertion inside `updateEventStatus` use-case (pass `actor` to it and call `assertEventManagementAccess`).

---

### CR-02: Security regression — `assertCheckinAccess` dropped during NestJS port

**File:** `packages/backend/src/api/checkin/checkin.controller.ts:25-32`  
**Issue:**  
The original handler (`src/server/api/checkin/validate-checkin.handler.ts:71-78`) explicitly called `assertCheckinAccess({ actor, eventOrganizerId })` before invoking the use-case. For organizer-role callers, it fetched the event's `organizerId` and verified the caller owned it. The NestJS controller replaces that handler but drops the call entirely — it only has `@Roles('checker', 'organizer')`, which grants role-level access without event ownership scope.

**Impact:** Any user with `role === 'organizer'` can now check in tickets for any event, not just events they own. The `checkin-access.policy.ts` file containing `assertCheckinAccess` is effectively dead code in the NestJS flow.

**Confirmed by diffing:**
- Original: `src/server/api/checkin/validate-checkin.handler.ts:72` — `assertCheckinAccess({ actor, eventOrganizerId })`
- NestJS: `packages/backend/src/api/checkin/checkin.controller.ts` — no equivalent call

**Fix:** Restore the access check in the controller:
```typescript
// checkin.controller.ts
@Post()
@HttpCode(200)
@UseGuards(SessionGuard, RolesGuard)
@Roles('checker', 'organizer')
async checkin(
  @Body() body: unknown,
  @CurrentUser() user: { id: string; role: string },
) {
  const input = validateCheckinSchema.parse(body);

  // Restore ownership check that existed in original handler
  if (user.role === 'organizer') {
    const event = await this.eventRepository.findById(input.eventId);
    assertCheckinAccess({
      actor: { userId: user.id, role: 'organizer' },
      eventOrganizerId: event?.organizerId ?? null,
    });
  }

  return this.validateCheckin({ ...input, checkerId: user.id });
}
```
This requires injecting `EVENT_REPOSITORY` into `CheckinController` (same pattern already used in `OwnershipGuard`).

---

## Warnings

### WR-01: `simulatePayment` has no orderId → customer ownership check

**File:** `packages/backend/src/api/orders/orders.controller.ts:74-78`  
**Issue:**  
`POST /api/orders/:id/simulate-payment` accepts any `:id` (order UUID) from the URL and passes it directly to `simulatePayment`. The use-case delegates to `confirmOrderPayment`, which fetches the order by ID and confirms it — with no check that `customerId` matches the authenticated user. Any authenticated customer who knows (or guesses) another customer's `orderId` can confirm payment on their behalf.

This is guarded by `PAYMENT_MODE !== 'demo'` throwing `createAuthorizationError` in the use-case, and `render.yaml` explicitly sets `PAYMENT_MODE=stripe`. **However**, the use-case default is `"demo"` when `PAYMENT_MODE` is unset — any non-Render deployment that omits `PAYMENT_MODE` is wide open.

**Fix:** Add ownership check in the controller before delegating:
```typescript
async simulatePaymentRoute(
  @Param('id') orderId: string,
  @CurrentUser() user: { id: string },
) {
  // Ownership: only the customer who placed the order may simulate payment
  const order = await this.orderRepository.findById(orderId);
  if (!order || order.order.customerId !== user.id) {
    throw new ForbiddenException('Acesso negado');
  }
  return this.simulatePayment({ orderId });
}
```

---

### WR-02: `OwnershipGuard` silently bypasses for `POST /api/lots` and `POST /api/coupons`

**Files:** `packages/backend/src/auth/ownership.guard.ts:16-17`, `packages/backend/src/api/lots/lots.controller.ts:55-63`, `packages/backend/src/api/coupons/coupons.controller.ts:50-55`  
**Issue:**  
`OwnershipGuard.canActivate()` checks:
```typescript
const slug = request.params?.slug ?? request.body?.eventSlug;
if (!slug) return true;  // ← silent pass-through
```
The `createLotSchema` and `createCouponSchema` send `eventId` (a UUID), not `eventSlug`. So for both `POST /api/lots` and `POST /api/coupons`, the guard always returns `true` without fetching or checking anything. The `@UseGuards(..., OwnershipGuard)` decorator on these routes is effectively dead.

Ownership **is** correctly enforced at the use-case level via `assertEventManagementAccess` (confirmed), so there is no exploitable vulnerability. But the guard provides a false sense of security at the controller layer — if someone adds a future endpoint with `@UseGuards(OwnershipGuard)` and a body containing `eventId`, they will expect ownership enforcement that never happens.

**Fix:** Add `eventId`-based lookup to `OwnershipGuard`, or document the guard's slug-only contract and use a different guard for UUID-body routes:
```typescript
// ownership.guard.ts
const slug = request.params?.slug ?? request.body?.eventSlug;
const eventId = request.body?.eventId;

if (!slug && !eventId) return true;

const event = slug
  ? await this.eventRepository.findBySlug(slug)
  : await this.eventRepository.findById(eventId);

if (!event) throw new NotFoundException('Evento não encontrado');
if (event.organizerId !== user.id) throw new ForbiddenException('Acesso negado');
return true;
```

---

### WR-03: `NEXT_PUBLIC_APP_URL` env var not set in `render.yaml` — Stripe redirect URLs fall back to `localhost:3000` in production

**Files:** `packages/backend/src/payment/payment.module.ts:16`, `packages/backend/src/email/email.module.ts:16`, `packages/backend/render.yaml`, `packages/backend/.env.example:28`  
**Issue:**  
Both `EmailModule` and `PaymentModule` read `config.get<string>('NEXT_PUBLIC_APP_URL')` for the `appBaseUrl`. This variable is **not set** in `render.yaml`. The `stripe.payment-provider.ts` fallback chain is:
```typescript
process.env.BETTER_AUTH_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim()
// → undefined → falls back to "http://localhost:3000"
```
In production on Render, Stripe checkout success/cancel URLs and email template links will point to `http://localhost:3000/...`.

Additionally, `.env.example` documents `APP_BASE_URL` but the code reads `NEXT_PUBLIC_APP_URL` — the wrong name is documented.

**Fix:**
1. Add to `render.yaml`:
   ```yaml
   - key: NEXT_PUBLIC_APP_URL
     sync: false
   ```
2. Update `.env.example` to document `NEXT_PUBLIC_APP_URL` instead of (or in addition to) `APP_BASE_URL`.

---

## Info

### IN-01: `SessionGuard` test bypass gated only on `NODE_ENV === 'test'`

**File:** `packages/backend/src/auth/session.guard.ts:21-33`  
**Issue:**  
The test bypass (`x-test-user-id` header sets `request.user` without any auth) activates whenever `NODE_ENV === 'test'`, with no additional safeguard. The `render.yaml` hardcodes `NODE_ENV=production`, so this is mitigated for Render deployments.

However, this is a defense-in-depth concern: a misconfigured deployment with `NODE_ENV=test` (or `NODE_ENV=testing`) would expose full authentication bypass to anyone who can send HTTP headers. A more robust pattern checks an explicit feature flag:
```typescript
if (process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_AUTH === 'true') {
```
Or better, use the `testSessionGuard` override pattern already present in `tests/integration/setup/index.ts` — which replaces the guard entirely in tests and never touches the production guard at all.

---

### IN-02: CRON_SECRET comparison is not timing-safe

**File:** `packages/backend/src/api/cron/cron.controller.ts:15-17`  
**Issue:**  
```typescript
if (secret !== expected) {
  throw new UnauthorizedException('CRON_SECRET inválido');
}
```
String `!==` comparison is not constant-time and is vulnerable to timing attacks. For a cron secret that triggers email sends, the practical risk is low (attacker would need many requests to extract the secret bit-by-bit), but best practice for secret comparison is:
```typescript
import { timingSafeEqual } from 'node:crypto';
const secretBuf = Buffer.from(secret ?? '');
const expectedBuf = Buffer.from(expected);
if (secretBuf.length !== expectedBuf.length || !timingSafeEqual(secretBuf, expectedBuf)) {
  throw new UnauthorizedException('CRON_SECRET inválido');
}
```

---

### IN-03: `HttpException` branch in `AppExceptionFilter` passes raw NestJS error bodies through

**File:** `packages/backend/src/common/app-exception.filter.ts:44-49`  
**Issue:**  
```typescript
if (exception instanceof HttpException) {
  const status = exception.getStatus();
  const body = exception.getResponse();
  response.status(status).json(body);  // ← raw body, unformatted
  return;
}
```
NestJS's built-in exceptions (e.g. `NotFoundException`, `BadRequestException`) produce bodies like `{ "statusCode": 404, "message": "...", "error": "Not Found" }`, which leaks NestJS internals and is inconsistent with the `{ error: { code, message } }` shape the rest of the API uses. This also means any future `throw new HttpException(internalDetails, 500)` would expose those details to clients.

**Fix:** Normalize `HttpException` through the same `serializeAppError` path:
```typescript
if (exception instanceof HttpException) {
  const status = exception.getStatus();
  const appError = status === 404
    ? createNotFoundError(exception.message)
    : createAuthorizationError(exception.message);
  response.status(status).json({ error: serializeAppError(appError) });
  return;
}
```
Or at minimum wrap the body: `response.status(status).json({ error: { status, message: exception.message } })`.

---

## Appendix: Items Verified Clean

The following areas were audited and found correct:

- **DI token consistency**: All 20 use-case tokens match exactly between `ApplicationModule` exports and controller `@Inject` decorators.
- **`CREATE_PUBLISH_EVENT_FOR_ORGANIZER` factory pattern**: Ownership is baked into the use-case constructor at request time. No way to pass a forged `organizerId` from outside the guard chain.
- **Stripe webhook HMAC**: `rawBody: true` in `NestFactory.create()` and `moduleRef.createNestApplication({ rawBody: true })` in test setup. `constructEvent` wraps in try/catch returning 400 on failure. Correct.
- **WebhooksController has no auth guard** (intentional): Stripe calls this endpoint from their servers; auth is the HMAC signature.
- **Zod validation at all input boundaries**: All controllers parse `body: unknown` / `query: unknown` / `params: unknown` through `.parse()` before use.
- **No direct repository calls from controllers**: All controllers go through injected use-cases only.
- **`testSessionGuard` in `createTestingApp()`**: Correctly overrides `SessionGuard` to prevent BetterAuth DB initialization in tests. The override uses `overrideProvider(SessionGuard)` which is safe.
- **`OwnershipGuard` admin bypass** (`user?.role === 'admin' → return true`): Correct behavior.

---

_Reviewed: 2025-01-27_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: deep_
