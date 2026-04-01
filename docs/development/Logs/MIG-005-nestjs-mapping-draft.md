# MIG-005 - NestJS Module Boundary Mapping Draft

Draft for Sprint 010 migration readiness.

This document maps the current Vinext-oriented server architecture to NestJS module boundaries without changing the business model. The target shape keeps `domain` and `application` framework-agnostic, moves only adapters/controllers/guards/pipes to NestJS, and preserves the existing repository contracts as the persistence boundary.

## 1) Proposed NestJS modules and responsibilities

### `AppModule`

- Composition root only.
- Imports the infrastructure, persistence, auth, and feature modules.
- Wires global filters/pipes that replace the current `mapAppErrorToResponse` and `parseInput` boundary behavior.

### `InfrastructureModule`

- Exposes the shared runtime providers:
  - database connection (`Db`)
  - clock/now provider
  - ID generators
  - observability adapters
  - auth/session resolver
- Keeps environment/config access out of application code.
- Replaces the current `getDatabaseUrlOrThrow`, `createDb`, and `getSession` composition points.

### `PersistenceModule`

- Binds repository tokens to the current Drizzle implementations.
- Contains only infrastructure-adapter code:
  - `DrizzleEventRepository`
  - `DrizzleLotRepository`
  - `DrizzleOrderRepository`
  - `DrizzleTicketRepository`
  - `DrizzleCouponRepository`
  - `DrizzleUserRepository`
- No business rules, no orchestration.

### `AuthModule`

- Owns session resolution, role extraction, and request-scoped actor context.
- Hosts auth guards/decorators used by controllers.
- Mirrors the current `createGetSession` boundary and the role normalization behavior.

### `EventsModule`

- Owns event-facing controllers and use-case providers.
- Covers:
  - public event browsing
  - event detail
  - event creation
  - event publication
  - event status updates
  - event-order listing for organizers/admins
- Keeps ownership and publication checks in application policies or guards, not in the controller body.

### `LotsModule`

- Owns lot create/update controllers and use-case providers.
- Enforces only boundary concerns at the controller/guard level.
- Keeps sale-window, quantity, and status rules in application/domain code.

### `OrdersModule`

- Owns checkout and order-query controllers and use-case providers.
- Covers:
  - order creation
  - customer order history
  - event order history for organizers/admins
- Preserves server-side derivation of customer identity, totals, stock, discounts, and ticket generation.

### `CouponsModule`

- Owns coupon create/update controllers and use-case providers.
- Keeps coupon governance and eligibility rules in application/domain code.

### `CheckinModule`

- Owns ticket check-in validation controller and use-case provider.
- Keeps eligibility checks and ticket state transitions in application/domain code.

### `Domain` and `Application` packages

- These do not need NestJS modules of their own.
- They should remain plain TypeScript libraries imported by feature modules.
- Application factories become injectable providers; domain rules remain free functions.

## 2) Provider/DI mapping (use-case -> deps -> token)

### Shared tokens

- `DB_CONNECTION` -> `Db` from `createDb(...)`
- `NOW_PROVIDER` -> `() => Date`
- `UUID_PROVIDER` -> `() => string`
- `ORDER_ID_PROVIDER` -> `() => string`
- `LOT_ID_PROVIDER` -> `() => string`
- `TICKET_CODE_PROVIDER` -> `() => string`
- `SESSION_RESOLVER` -> current auth/session adapter
- `CHECKOUT_OBSERVABILITY` -> current checkout telemetry adapter
- `AUDIT_TRAIL` -> current audit logger adapter

### Repository tokens

- `EVENT_REPOSITORY` -> `DrizzleEventRepository`
- `LOT_REPOSITORY` -> `DrizzleLotRepository`
- `ORDER_REPOSITORY` -> `DrizzleOrderRepository`
- `TICKET_REPOSITORY` -> `DrizzleTicketRepository`
- `COUPON_REPOSITORY` -> `DrizzleCouponRepository`
- `USER_REPOSITORY` -> `DrizzleUserRepository`

### Use-case tokens

| Current factory | Required deps in repo reality | Nest token / provider shape |
| --- | --- | --- |
| `createCreateEventUseCase` | `UUID_PROVIDER`, `EVENT_REPOSITORY.findBySlug`, `EVENT_REPOSITORY.save` | `CREATE_EVENT_USE_CASE` |
| `createGetEventDetailUseCase` | `NOW_PROVIDER`, `EVENT_REPOSITORY.findPublishedBySlug`, `LOT_REPOSITORY.findByEventId` | `GET_EVENT_DETAIL_USE_CASE` |
| `createListPublishedEventsUseCase` | `EVENT_REPOSITORY.listPublished` | `LIST_PUBLISHED_EVENTS_USE_CASE` |
| `createPublishEventUseCase` | `EVENT_REPOSITORY.findById/save`, `LOT_REPOSITORY.findByEventId`, `organizerId`, optional observability | `PUBLISH_EVENT_USE_CASE_FACTORY` or a request-scoped `PUBLISH_EVENT_USE_CASE` produced after event ownership is resolved |
| `createUpdateEventStatusUseCase` | `EVENT_REPOSITORY.findById/save` | `UPDATE_EVENT_STATUS_USE_CASE` |
| `createCreateLotUseCase` | `LOT_ID_PROVIDER`, `EVENT_REPOSITORY.findById`, `LOT_REPOSITORY.save` | `CREATE_LOT_USE_CASE` |
| `createUpdateLotUseCase` | `EVENT_REPOSITORY.findById`, `LOT_REPOSITORY.findById/save` | `UPDATE_LOT_USE_CASE` |
| `createCreateOrderUseCase` | `NOW_PROVIDER`, `ORDER_ID_PROVIDER`, optional `TICKET_CODE_PROVIDER`, `ORDER_REPOSITORY.create`, `LOT_REPOSITORY.findByIds/decrementAvailableQuantity`, `COUPON_REPOSITORY.findByCodeForEvent/incrementRedemptionCount`, optional `CHECKOUT_OBSERVABILITY` | `CREATE_ORDER_USE_CASE` |
| `createGetCustomerOrdersUseCase` | `ORDER_REPOSITORY.listByCustomerId`, `TICKET_REPOSITORY.listByCustomerId` | `GET_CUSTOMER_ORDERS_USE_CASE` |
| `createListEventOrdersUseCase` | `EVENT_REPOSITORY.findById`, `ORDER_REPOSITORY.listByEventId` | `LIST_EVENT_ORDERS_USE_CASE` |
| `createCreateCouponUseCase` | `COUPON_REPOSITORY.findByCodeForEvent/create` | `CREATE_COUPON_USE_CASE` |
| `createUpdateCouponUseCase` | `COUPON_REPOSITORY.findById/findByCodeForEvent/update` | `UPDATE_COUPON_USE_CASE` |
| `createValidateCheckinUseCase` | `NOW_PROVIDER`, `TICKET_REPOSITORY.findById/markAsUsedIfActive`, `ORDER_REPOSITORY.findById`, optional `AUDIT_TRAIL` | `VALIDATE_CHECKIN_USE_CASE` |

### Notes on provider shape

- The current code already uses pure factory functions instead of class inheritance. NestJS should keep that shape where practical by registering factory providers for each use-case token.
- Repository contracts should stay unchanged; only the bindings behind the tokens move.
- `createPublishEventUseCase` is the only use-case that still needs a runtime `organizerId` input at construction time. That is a real seam, not accidental complexity.

## 3) Controller/guard/pipe boundary mapping from current handlers/route adapters

### Events

- `src/server/api/events/list-events.handler.ts` + `public-events.route-adapter.ts`
  - Nest: `EventsController.listPublished()`
  - Pipe: `ListEventsQueryPipe` backed by `listEventsQuerySchema`
  - Guard: none

- `src/server/api/events/get-event.handler.ts` + `public-events.route-adapter.ts`
  - Nest: `EventsController.getBySlug()`
  - Pipe: `SlugParamPipe` backed by `getEventParamsSchema`
  - Guard: none

- `src/server/api/events/create-event.handler.ts` + `events.route-adapter.ts`
  - Nest: `EventsAdminController.create()`
  - Guard: `JwtAuthGuard` + `RolesGuard(organizer, admin)`
  - Pipe: `CreateEventBodyPipe` backed by `createEventSchema`

- `src/server/api/events/publish-event.handler.ts` + `events.route-adapter.ts`
  - Nest: `EventsAdminController.publish()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: `PublishEventBodyPipe` backed by `publishEventSchema`
  - Boundary note: the guard or controller must resolve the event first, then derive the organizer ownership context.

- `src/server/api/events/update-event.handler.ts` + `events.route-adapter.ts`
  - Nest: `EventsAdminController.updateStatus()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: `UpdateEventBodyPipe` backed by `updateEventSchema`

- `src/server/api/events/[slug]/orders/route.ts` + `list-event-orders.handler.ts`
  - Nest: `EventsAdminController.listOrders()` or `OrdersController.listByEvent()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: path parameter pipe for the current event identifier shape

### Lots

- `src/server/api/lots/route.ts` + `create-lot.handler.ts`
  - Nest: `LotsController.create()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: `CreateLotBodyPipe` backed by `createLotSchema`

- `src/server/api/lots/[id]/route.ts` + `update-lot.handler.ts`
  - Nest: `LotsController.update()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: `UpdateLotParamsPipe` + `UpdateLotBodyPipe`
  - Boundary note: the current route adapter injects `lotId` from the path into the body; Nest should preserve that server-side merge.

### Orders

- `src/server/api/orders/route.ts` + `create-order.handler.ts`
  - Nest: `OrdersController.create()`
  - Guard: `JwtAuthGuard` + `RolesGuard(customer, admin)`
  - Pipe: `CreateOrderBodyPipe` backed by `createOrderSchema`
  - Boundary note: the controller must overwrite `customerId` from the authenticated session, not trust the client body.

- `src/server/api/orders/mine/route.ts` + `get-customer-orders.handler.ts`
  - Nest: `OrdersController.mine()`
  - Guard: `JwtAuthGuard` + `RolesGuard(customer, admin)`
  - Pipe: none beyond auth context

- `src/server/api/events/[slug]/orders/route.ts` + `list-event-orders.handler.ts`
  - Nest: `OrdersController.listForEvent()` or `EventsAdminController.listOrders()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: identifier pipe for the event key used by the route

### Coupons

- `src/server/api/coupons/create/route.ts` + `create-coupon.handler.ts`
  - Nest: `CouponsController.create()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: `CreateCouponBodyPipe` backed by `createCouponSchema`

- `src/server/api/coupons/update/route.ts` + `update-coupon.handler.ts`
  - Nest: `CouponsController.update()`
  - Guard: `JwtAuthGuard` + event-management guard
  - Pipe: `UpdateCouponBodyPipe` backed by `updateCouponSchema`

### Check-in

- `src/server/api/checkin/route.ts` + `validate-checkin.handler.ts`
  - Nest: `CheckinController.validate()`
  - Guard: `JwtAuthGuard` + `CheckinAccessGuard`
  - Pipe: `ValidateCheckinBodyPipe` backed by `validateCheckinSchema`
  - Boundary note: for organizers, the guard needs the event organizer context before calling the access policy.

### Auth / session boundary

- `src/server/api/auth/get-session.ts`
  - Nest: `SessionGuard` or `CurrentUser` decorator provider in `AuthModule`
  - Responsibility: convert auth provider output into `{ userId, role }` and default unknown roles the same way the current adapter does.

### Error shaping

- `src/server/api/error-mapper.ts`
  - Nest: global `AppErrorFilter` or feature-wide exception filter.
  - Responsibility: preserve the current stable error payload and HTTP code mapping.

## 4) Migration notes and ambiguity list

### Migration notes

- Keep `domain` and `application` as plain libraries. Do not decorate them with NestJS concepts.
- Keep repository interfaces intact. Nest should only bind tokens to implementations.
- Prefer controller thinness:
  - parse/validate input in pipes
  - resolve auth/session in guards
  - call use-cases from controllers
  - map errors in a filter
- Preserve server-side derivation of sensitive values:
  - `customerId` for checkout
  - event ownership
  - total/discount/stock calculations
  - ticket validity and check-in state
- Keep observability best-effort and non-blocking, matching the current use-case behavior.

### Ambiguities

- `createPublishEventUseCase` still needs a runtime `organizerId` at construction time. The draft keeps this as a request-scoped factory seam, but a guard-first design could also collapse it if that makes the Nest module cleaner.
- `createUpdateEventStatusUseCase` currently has a factory seam in the handler even though the use-case itself does not use organizer-specific construction. That seam looks legacy and should likely be flattened during migration.
- `GET /api/events/[slug]/orders` is inconsistent today:
  - the path segment is named `slug`
  - the schema expects `eventId: z.uuid()`
  - the route adapter forwards the slug value into the `eventId` field
  - Nest should resolve whether this endpoint is truly slug-based or UUID-based before the controller signature is frozen.
- `src/server/api/checkin/validate-checkin.handler.ts` resolves organizer context by querying the event only when the actor is an organizer. The guard order in Nest must preserve that dependency.
- `UserRepository` exists, but no application use-case currently depends on it. It likely belongs under auth/session plumbing rather than the core business modules unless future auth work introduces DB-backed session lookup.
- `DATABASE_URL` / `TEST_DATABASE_URL` resolution currently lives near the route adapters. In Nest this should move into a configuration provider, not into controllers or use-cases.

