# Sprint 006 — Auth Integration & Schema Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Better Auth, create the `user` table with FKs, add event presentation fields, and wire all route adapters to extract actor from real session instead of headers/hardcoded values.

**Architecture:** Better Auth manages the `user` table as the canonical identity store, accessed via Drizzle. A `getSession` helper is injectable in every route adapter (enabling unit test isolation). Handlers remain unchanged — only adapters change their actor source.

**Tech Stack:** better-auth, better-auth/adapters/drizzle, better-auth/next-js, better-auth/react, Drizzle ORM, Neon PostgreSQL, Zod, Vitest

**Design spec:** `docs/superpowers/specs/2026-03-29-sprint-006-auth-schema-completion-design.md`

---

## Task 0: Pre-flight Check

- [ ] **Step 1: Verify test suite is green before starting**

Run: `npm run test`
Expected: all unit + regression + integration tests pass.

If integration tests fail due to missing `TEST_DATABASE_URL`, that is expected in local environments without DB. Unit + regression must pass.

- [ ] **Step 2: Confirm no lint violations**

Run: `npm run lint:architecture`
Expected: no violations.

---

## Task 1: Add `unauthenticated` Error Code + 401 Mapping

**Files:**
- Modify: `src/server/application/errors/app-error.types.ts`
- Modify: `src/server/application/errors/app-error.ts`
- Modify: `src/server/api/error-mapper.ts`

**Context:** `AppErrorCode` currently has no `"unauthenticated"` variant. Without it, `getSession` cannot throw a typed 401 error. This must land before `getSession` is implemented.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/server/api/error-mapper.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { AppError } from "../../../../src/server/application/errors";
import { mapAppErrorToResponse } from "../../../../src/server/api/error-mapper";

describe("mapAppErrorToResponse", () => {
  test("maps unauthenticated error to 401", () => {
    const error = new AppError("unauthenticated", "Sessão inválida ou expirada");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("unauthenticated");
  });

  test("maps authorization error to 403", () => {
    const error = new AppError("authorization", "Forbidden");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/error-mapper.test.ts`
Expected: FAIL — TypeScript error: `"unauthenticated"` is not assignable to `AppErrorCode`.

- [ ] **Step 3: Add `unauthenticated` to `AppErrorCode`**

Edit `src/server/application/errors/app-error.types.ts`:

```ts
export type AppErrorCode =
  | "validation"
  | "unauthenticated"
  | "authorization"
  | "not-found"
  | "conflict"
  | "internal";
```

- [ ] **Step 4: Add `createUnauthenticatedError` factory**

Edit `src/server/application/errors/app-error.ts` — add after `createAuthorizationError`:

```ts
export const createUnauthenticatedError = (
  message: string,
  options: Omit<AppErrorOptions, "cause"> = {},
): AppError => new AppError("unauthenticated", message, options);
```

- [ ] **Step 5: Add 401 mapping in error-mapper**

Edit `src/server/api/error-mapper.ts`:

```ts
const HTTP_STATUS_BY_ERROR_CODE: Record<AppErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  authorization: 403,
  "not-found": 404,
  conflict: 409,
  internal: 500,
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/error-mapper.test.ts`
Expected: PASS.

- [ ] **Step 7: Run full unit suite to verify no regressions**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/server/application/errors/app-error.types.ts \
        src/server/application/errors/app-error.ts \
        src/server/api/error-mapper.ts \
        tests/unit/server/api/error-mapper.test.ts
git commit -m "feat(auth): add unauthenticated error code with 401 mapping"
```

---

## Task 2: Move `checkerId` from Use-Case Deps to Input

**Files:**
- Modify: `src/server/application/checkin/checkin.types.ts`
- Modify: `src/server/application/use-cases/validate-checkin.use-case.ts`
- Modify: `src/server/api/checkin/validate-checkin.handler.ts`
- Update: `tests/unit/server/api/checkin/validate-checkin.handler.test.ts`
- Update: `tests/integration/api/checkin/auth.test.ts`

**Context:** `checkerId` is currently baked into `ValidateCheckinUseCaseDependencies` at construction time, meaning one use-case instance per checker. For per-request session, `checkerId` must come from the request actor at call time.

### 2a: Move `checkerId` to `ValidateCheckinInput`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/server/application/use-cases/validate-checkin.use-case.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { createValidateCheckinUseCase } from "../../../../../src/server/application/use-cases/validate-checkin.use-case";

const CHECKER_ID = "a1083f53-f9c2-4d54-93a4-44eb4146db62";
const TICKET_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORDER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

const makeActiveTicket = () => ({
  id: TICKET_ID,
  eventId: EVENT_ID,
  orderId: ORDER_ID,
  lotId: "lot-001",
  code: "TKT-001",
  status: "active" as const,
  checkedInAt: null,
});

const makeEligibleOrder = () => ({
  order: {
    id: ORDER_ID,
    status: "paid" as const,
  },
});

describe("createValidateCheckinUseCase", () => {
  test("accepts checkerId from input (not from construction-time deps)", async () => {
    const ticketRepository = {
      findById: vi.fn(async () => makeActiveTicket()),
      markAsUsedIfActive: vi.fn(async () => true),
    };
    const orderRepository = {
      findById: vi.fn(async () => makeEligibleOrder()),
    };

    const useCase = createValidateCheckinUseCase({
      now: () => new Date("2026-03-29T12:00:00Z"),
      ticketRepository,
      orderRepository,
    });

    const result = await useCase({
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
      checkerId: CHECKER_ID,
    });

    expect(result.outcome).toBe("approved");
    expect(result.checkerId).toBe(CHECKER_ID);
  });

  test("returns checkerId from input in audit metadata", async () => {
    const OTHER_CHECKER = "00000000-0000-0000-0000-000000000099";
    const ticketRepository = {
      findById: vi.fn(async () => makeActiveTicket()),
      markAsUsedIfActive: vi.fn(async () => true),
    };
    const orderRepository = {
      findById: vi.fn(async () => makeEligibleOrder()),
    };

    const useCase = createValidateCheckinUseCase({
      now: () => new Date("2026-03-29T12:00:00Z"),
      ticketRepository,
      orderRepository,
    });

    const result = await useCase({
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
      checkerId: OTHER_CHECKER,
    });

    expect(result.checkerId).toBe(OTHER_CHECKER);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/application/use-cases/validate-checkin.use-case.test.ts`
Expected: FAIL — either TS error (no `checkerId` in input) or runtime error.

- [ ] **Step 3: Add `checkerId` to `ValidateCheckinInput`**

Edit `src/server/application/checkin/checkin.types.ts`:

```ts
export interface ValidateCheckinInput {
  ticketId: string;
  eventId: string;
  checkerId: string;
}
```

- [ ] **Step 4: Remove `checkerId` from use-case deps and read from input**

Edit `src/server/application/use-cases/validate-checkin.use-case.ts`:

```ts
import type { ValidateCheckinInput, ValidateCheckinResult } from "../checkin";
import { isOrderStatusEligibleForActiveTicket } from "../../domain/orders/order.rules";
import type {
  OrderRepository,
  OrderStatus,
  TicketRepository,
  TicketStatus,
} from "../../repositories";

export type { ValidateCheckinInput, ValidateCheckinResult };

export type ValidateCheckinUseCase = (
  input: ValidateCheckinInput,
) => Promise<ValidateCheckinResult>;

export interface ValidateCheckinUseCaseDependencies {
  now: () => Date;
  ticketRepository: Pick<TicketRepository, "markAsUsedIfActive"> & {
    findById(ticketId: string): Promise<{
      id: string;
      eventId: string;
      orderId: string;
      lotId: string;
      code: string;
      status: TicketStatus;
      checkedInAt: Date | null;
    } | null>;
  };
  orderRepository: Pick<OrderRepository, "findById">;
}

const createAuditMetadata = (
  input: ValidateCheckinInput,
  validatedAt: Date,
) => ({
  ticketId: input.ticketId,
  eventId: input.eventId,
  checkerId: input.checkerId,
  validatedAt: validatedAt.toISOString(),
});

const mapTicketStatusToRejection = (
  status: TicketStatus,
): "ticket_used" | "ticket_cancelled" | null => {
  if (status === "used") {
    return "ticket_used";
  }
  if (status === "cancelled") {
    return "ticket_cancelled";
  }
  return null;
};

const isOrderEligibleForCheckin = (orderStatus: OrderStatus): boolean =>
  isOrderStatusEligibleForActiveTicket(orderStatus);

export const createValidateCheckinUseCase = (
  dependencies: ValidateCheckinUseCaseDependencies,
): ValidateCheckinUseCase => {
  return async (input: ValidateCheckinInput): Promise<ValidateCheckinResult> => {
    const checkedInAt = dependencies.now();
    const audit = createAuditMetadata(input, checkedInAt);

    const ticket = await dependencies.ticketRepository.findById(input.ticketId);
    if (!ticket) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "ticket_not_found",
      };
    }

    if (ticket.eventId !== input.eventId) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "event_mismatch",
      };
    }

    const ticketRejectionReason = mapTicketStatusToRejection(ticket.status);
    if (ticketRejectionReason !== null) {
      return {
        ...audit,
        outcome: "rejected",
        reason: ticketRejectionReason,
      };
    }

    const order = await dependencies.orderRepository.findById(ticket.orderId);
    if (!order || !isOrderEligibleForCheckin(order.order.status)) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "order_not_eligible",
      };
    }

    const markedAsUsed = await dependencies.ticketRepository.markAsUsedIfActive(
      ticket.id,
      checkedInAt,
    );
    if (!markedAsUsed) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "ticket_used",
      };
    }

    return {
      ...audit,
      outcome: "approved",
    };
  };
};
```

- [ ] **Step 5: Run new use-case test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/application/use-cases/validate-checkin.use-case.test.ts`
Expected: PASS.

### 2b: Update handler to pass `actor.userId` as `checkerId`

- [ ] **Step 6: Update `validate-checkin.handler.ts` to pass `checkerId` from actor**

Edit `src/server/api/checkin/validate-checkin.handler.ts` — find the line calling `dependencies.validateCheckin(input)` and update:

```ts
// BEFORE:
const result = await dependencies.validateCheckin(input);

// AFTER:
const result = await dependencies.validateCheckin({
  ...input,
  checkerId: request.actor.userId,
});
```

- [ ] **Step 7: Update handler unit test assertions to include `checkerId`**

Edit `tests/unit/server/api/checkin/validate-checkin.handler.test.ts` — find all `toHaveBeenCalledWith` assertions on `validateCheckin` and add `checkerId: actor.userId`.

For example, the call with `CHECKER_ACTOR` (userId: `"a1083f53-f9c2-4d54-93a4-44eb4146db62"`):
```ts
// BEFORE:
expect(validateCheckin).toHaveBeenCalledWith({
  ticketId: VALID_BODY.ticketId,
  eventId: VALID_BODY.eventId,
});

// AFTER:
expect(validateCheckin).toHaveBeenCalledWith({
  ticketId: VALID_BODY.ticketId,
  eventId: VALID_BODY.eventId,
  checkerId: CHECKER_ACTOR.userId,
});
```

Apply the same update to every `expect(validateCheckin).toHaveBeenCalledWith` assertion in that file, substituting the `userId` of the actor used in that specific test.

- [ ] **Step 8: Update checkin auth integration test assertions**

Edit `tests/integration/api/checkin/auth.test.ts` — find the `toHaveBeenCalledWith` assertions and add `checkerId`:

```ts
// In "allows organizer within ownership scope" test:
// BEFORE:
expect(validateCheckin).toHaveBeenCalledWith({
  ticketId: TICKET_ID,
  eventId: EVENT_ID,
});

// AFTER:
expect(validateCheckin).toHaveBeenCalledWith({
  ticketId: TICKET_ID,
  eventId: EVENT_ID,
  checkerId: ORGANIZER_A,
});

// In "allows checker globally" test (userId: "00000000-0000-0000-0000-000000000011"):
expect(validateCheckin).toHaveBeenCalledWith({
  ticketId: TICKET_ID,
  eventId: EVENT_ID,
  checkerId: "00000000-0000-0000-0000-000000000011",
});

// In "allows admin globally" test (userId: "00000000-0000-0000-0000-000000000099"):
expect(validateCheckin).toHaveBeenCalledWith({
  ticketId: TICKET_ID,
  eventId: EVENT_ID,
  checkerId: "00000000-0000-0000-0000-000000000099",
});
```

- [ ] **Step 9: Run full unit suite to verify no regressions**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 10: Run regression suite**

Run: `npm run test:regression`
Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/server/application/checkin/checkin.types.ts \
        src/server/application/use-cases/validate-checkin.use-case.ts \
        src/server/api/checkin/validate-checkin.handler.ts \
        tests/unit/server/application/use-cases/validate-checkin.use-case.test.ts \
        tests/unit/server/api/checkin/validate-checkin.handler.test.ts \
        tests/integration/api/checkin/auth.test.ts
git commit -m "refactor(checkin): move checkerId from use-case deps to input for per-request identity"
```

---

## Task 3: Create Better Auth User Schema

**Files:**
- Create: `src/server/infrastructure/db/schema/users.ts`
- Modify: `src/server/infrastructure/db/schema/index.ts`
- Generate migration (drizzle/\*.sql)

**Context:** Better Auth needs `user`, `session`, `account`, and `verification` tables. The `user.id` must be `uuid` (not `text`) to match existing FK column types in `events.organizer_id` and `orders.customer_id`.

- [ ] **Step 1: Write the failing test**

Edit `tests/unit/server/infrastructure/db-schema.test.ts` — find the `"exports all domain aggregate tables"` test and add assertions for the new tables:

```ts
// Add inside that test, after existing assertions:
expect(isTable(schema.user)).toBe(true);
expect(isTable(schema.session)).toBe(true);
expect(isTable(schema.account)).toBe(true);
expect(isTable(schema.verification)).toBe(true);
```

Also add a column shape test after existing tests:

```ts
test("user table has id, email, name, role, emailVerified columns", async () => {
  const schema = await import("../../../../src/server/infrastructure/db/schema");
  const { getTableColumns } = await import("drizzle-orm");

  const columns = getTableColumns(schema.user);
  expect(columns).toHaveProperty("id");
  expect(columns).toHaveProperty("email");
  expect(columns).toHaveProperty("name");
  expect(columns).toHaveProperty("role");
  expect(columns).toHaveProperty("emailVerified");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/infrastructure/db-schema.test.ts`
Expected: FAIL — `schema.user` is undefined.

- [ ] **Step 3: Create `src/server/infrastructure/db/schema/users.ts`**

```ts
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = ["customer", "organizer", "admin", "checker"] as const;
export type UserRole = (typeof userRoleEnum)[number];

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").$type<UserRole>().notNull().default("customer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

- [ ] **Step 4: Export from schema index**

Edit `src/server/infrastructure/db/schema/index.ts`:

```ts
export * from "./events";
export * from "./lots";
export * from "./orders";
export * from "./tickets";
export * from "./coupons";
export * from "./users";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/infrastructure/db-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Generate migration**

Run: `npm run db:generate`
Expected: new migration file in `drizzle/` directory with `CREATE TABLE "user"`, `CREATE TABLE "session"`, `CREATE TABLE "account"`, `CREATE TABLE "verification"`.

- [ ] **Step 7: Run full unit suite**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/server/infrastructure/db/schema/users.ts \
        src/server/infrastructure/db/schema/index.ts \
        tests/unit/server/infrastructure/db-schema.test.ts \
        drizzle/
git commit -m "feat(schema): add Better Auth user/session/account/verification tables"
```

---

## Task 4: Add FK + Presentation Fields to Events and Orders

**Files:**
- Modify: `src/server/infrastructure/db/schema/events.ts`
- Modify: `src/server/infrastructure/db/schema/orders.ts`
- Modify: `src/server/repositories/event.repository.contracts.ts`
- Modify: `src/server/repositories/drizzle/drizzle-event.repository.ts`
- Generate migration

**Context:** Add FK enforcement for `organizer_id → user.id` and `customer_id → user.id`. Add `description`, `location`, `image_url` to events for the public listing UI.

- [ ] **Step 1: Write failing schema test**

In `tests/unit/server/infrastructure/db-schema.test.ts`, add inside the `"exports all domain aggregate tables"` describe block:

```ts
test("events table has description, location, imageUrl columns", async () => {
  const schema = await import("../../../../src/server/infrastructure/db/schema");
  const { getTableColumns } = await import("drizzle-orm");

  const columns = getTableColumns(schema.events);
  expect(columns).toHaveProperty("description");
  expect(columns).toHaveProperty("location");
  expect(columns).toHaveProperty("imageUrl");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/infrastructure/db-schema.test.ts`
Expected: FAIL — `columns.description` is undefined.

- [ ] **Step 3: Update `events.ts` schema**

Edit `src/server/infrastructure/db/schema/events.ts`:

```ts
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./users";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => user.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    imageUrl: text("image_url"),
    status: eventStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_organizer_id_idx").on(table.organizerId),
    index("events_status_idx").on(table.status),
  ],
);
```

- [ ] **Step 4: Update `orders.ts` schema**

Edit `src/server/infrastructure/db/schema/orders.ts` — add the import and FK reference:

```ts
import { index, integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./users";
import { events } from "./events";
import { lots } from "./lots";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => user.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotalInCents: integer("subtotal_in_cents").notNull(),
    discountInCents: integer("discount_in_cents").notNull().default(0),
    totalInCents: integer("total_in_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_event_id_idx").on(table.eventId),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    unitPriceInCents: integer("unit_price_in_cents").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
  ],
);
```

- [ ] **Step 5: Update `EventRecord` contract to include presentation fields**

Edit `src/server/repositories/event.repository.contracts.ts`:

```ts
import type { EntityId } from "./common.repository.contracts";
import type { EventLifecycleStatus } from "../domain/events";

export type { EventLifecycleStatus };

export interface EventRecord {
  id: EntityId;
  organizerId: EntityId;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  status: EventLifecycleStatus;
  startsAt: Date;
  endsAt: Date | null;
}

export interface EventRepository {
  findById(eventId: EntityId): Promise<EventRecord | null>;
  findPublishedBySlug(slug: string): Promise<EventRecord | null>;
  listByOrganizer(organizerId: EntityId): Promise<EventRecord[]>;
  save(event: EventRecord): Promise<void>;
}
```

- [ ] **Step 6: Update `DrizzleEventRepository` to include new fields**

Edit `src/server/repositories/drizzle/drizzle-event.repository.ts` — update `toEventRecord`:

```ts
function toEventRecord(row: typeof events.$inferSelect): EventRecord {
  return {
    id: row.id,
    organizerId: row.organizerId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    location: row.location,
    imageUrl: row.imageUrl,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}
```

Also update the `save` method to include the new fields:

```ts
async save(event: EventRecord): Promise<void> {
  try {
    await this.db
      .insert(events)
      .values({
        id: event.id,
        organizerId: event.organizerId,
        slug: event.slug,
        title: event.title,
        description: event.description,
        location: event.location,
        imageUrl: event.imageUrl,
        status: event.status,
        startsAt: event.startsAt,
        endsAt: event.endsAt ?? new Date("9999-12-31T00:00:00Z"),
      })
      .onConflictDoUpdate({
        target: events.id,
        set: {
          slug: event.slug,
          title: event.title,
          description: event.description,
          location: event.location,
          imageUrl: event.imageUrl,
          status: event.status,
          startsAt: event.startsAt,
          endsAt: event.endsAt ?? new Date("9999-12-31T00:00:00Z"),
        },
      });
  } catch (error) {
    throw mapPersistenceError(error, "save event");
  }
}
```

- [ ] **Step 7: Run schema test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/infrastructure/db-schema.test.ts`
Expected: PASS.

- [ ] **Step 8: Generate migration**

Run: `npm run db:generate`
Expected: new migration file with `ALTER TABLE "events" ADD COLUMN "description" text`, `ADD COLUMN "location" text`, `ADD COLUMN "image_url" text`, `ADD CONSTRAINT "events_organizer_id_user_id_fk"`, `ADD CONSTRAINT "orders_customer_id_user_id_fk"`.

- [ ] **Step 9: Update `createEventFixture` to include new optional fields**

Edit `tests/fixtures/index.ts` — the `createEventFixture` function defaults don't need to change since `description`, `location`, and `imageUrl` are nullable. But add them to `EventInsert` type implicitly (already handled by `typeof events.$inferInsert`).

- [ ] **Step 10: Run full unit suite**

Run: `npm run test:unit`
Expected: all tests pass. If any test creates an `EventRecord` literal object, TypeScript will flag missing `description | location | imageUrl` fields — add them as `null` in those tests.

- [ ] **Step 11: Commit**

```bash
git add src/server/infrastructure/db/schema/events.ts \
        src/server/infrastructure/db/schema/orders.ts \
        src/server/repositories/event.repository.contracts.ts \
        src/server/repositories/drizzle/drizzle-event.repository.ts \
        tests/unit/server/infrastructure/db-schema.test.ts \
        drizzle/
git commit -m "feat(schema): add FK enforcement and presentation fields to events/orders"
```

---

## Task 5: Install Better Auth and Configure Auth Infrastructure

**Files:**
- Create: `src/server/infrastructure/auth/auth.config.ts`
- Create: `src/server/infrastructure/auth/auth.client.ts`
- Create: `src/server/infrastructure/auth/index.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Modify: `.env.example`
- Modify: `package.json`

**Context:** Better Auth is the auth library. The server config uses the Drizzle adapter pointing at our schema. The client is used in React forms. The catch-all route handles all auth HTTP endpoints.

Note on Better Auth hooks: The `hooks.before` array with a matcher is Better Auth's generic hook mechanism. Verify the exact API signature against the installed version's docs — the pattern below follows `better-auth` v1.x conventions. If the hook signature differs, adapt while preserving the intent: reject `admin`/`checker` roles at public signup.

- [ ] **Step 1: Install `better-auth`**

Run: `npm install better-auth`
Expected: `better-auth` added to `dependencies` in `package.json`.

- [ ] **Step 2: Create `src/server/infrastructure/auth/auth.config.ts`**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/src/server/infrastructure/db/client";
import * as schema from "@/src/server/infrastructure/db/schema";
import { createUnauthenticatedError } from "@/src/server/application/errors";

const ALLOWED_SIGNUP_ROLES = ["customer", "organizer"] as const;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
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
    before: [
      {
        matcher: (ctx: { path: string }) => ctx.path === "/sign-up/email",
        handler: async (ctx: { body: unknown }) => {
          const body = ctx.body as Record<string, unknown> | null;
          const role = body?.role;
          if (
            role &&
            typeof role === "string" &&
            !ALLOWED_SIGNUP_ROLES.includes(role as (typeof ALLOWED_SIGNUP_ROLES)[number])
          ) {
            throw createUnauthenticatedError("Role not allowed in public signup");
          }
        },
      },
    ],
  },
});
```

Note: `db` requires the singleton pattern. Create a `src/server/infrastructure/db/index.ts` export if it doesn't exist — it should export a singleton `db` instance using `getDatabaseUrlOrThrow()`.

Check if `src/server/infrastructure/db/index.ts` exists. If not, create it:

```ts
// src/server/infrastructure/db/index.ts
import { createDb, type Db } from "./client";
import { createInternalError } from "../../application/errors";

const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw createInternalError("DATABASE_URL is not set");
  return url;
};

export const db: Db = createDb(getDatabaseUrl());
```

- [ ] **Step 3: Create `src/server/infrastructure/auth/auth.client.ts`**

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});
```

- [ ] **Step 4: Create `src/server/infrastructure/auth/index.ts`**

```ts
export { auth } from "./auth.config";
export { authClient } from "./auth.client";
```

- [ ] **Step 5: Create `src/app/api/auth/[...all]/route.ts`**

Create directory `src/app/api/auth/[...all]/` first, then:

```ts
import { auth } from "@/src/server/infrastructure/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 6: Update `.env.example`**

Edit `.env.example` — add after the last line:

```
# Better Auth — required for session management
# Generate a random secret (≥32 chars): openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here

# Base URL of the application (server-side, used by Better Auth)
BETTER_AUTH_URL=http://localhost:3000

# Base URL of the application (client-side, used by authClient in React forms)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 7: Run unit suite to verify no TypeScript errors from new files**

Run: `npm run test:unit`
Expected: all tests pass. TypeScript errors in auth config indicate API mismatch — adapt to installed `better-auth` version.

- [ ] **Step 8: Commit**

```bash
git add src/server/infrastructure/auth/ \
        src/server/infrastructure/db/index.ts \
        src/app/api/auth/ \
        .env.example \
        package.json \
        package-lock.json
git commit -m "feat(auth): install better-auth and configure auth infrastructure"
```

---

## Task 6: Implement `getSession` Helper + `UserRepository`

**Files:**
- Create: `src/server/api/auth/get-session.ts`
- Create: `src/server/api/auth/index.ts`
- Create: `src/server/repositories/user.repository.contracts.ts`
- Create: `src/server/repositories/drizzle/drizzle-user.repository.ts`
- Modify: `src/server/repositories/drizzle/index.ts`

- [ ] **Step 1: Write failing test for `getSession`**

Create `tests/unit/server/api/auth/get-session.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";

// We test get-session by mocking auth.api.getSession
// The function is tested in isolation; the actual auth module is mocked.
vi.mock("../../../../src/server/infrastructure/auth/auth.config", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from "../../../../src/server/infrastructure/auth/auth.config";
import { getSession } from "../../../../src/server/api/auth/get-session";

describe("getSession", () => {
  test("returns SessionContext when session is valid", async () => {
    const mockGetSession = vi.mocked(auth.api.getSession);
    mockGetSession.mockResolvedValueOnce({
      user: {
        id: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        role: "customer",
      },
      session: {} as never,
    });

    const request = new Request("http://localhost/api/orders", {
      headers: { cookie: "session=abc123" },
    });

    const result = await getSession(request);

    expect(result.userId).toBe("57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5");
    expect(result.role).toBe("customer");
    expect(mockGetSession).toHaveBeenCalledWith({
      headers: request.headers,
    });
  });

  test("throws unauthenticated AppError when session is null", async () => {
    const mockGetSession = vi.mocked(auth.api.getSession);
    mockGetSession.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Sessão inválida ou expirada",
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/auth/get-session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/server/api/auth/get-session.ts`**

```ts
import { auth } from "@/src/server/infrastructure/auth/auth.config";
import { createUnauthenticatedError } from "@/src/server/application/errors";
import type { UserRole } from "@/src/server/repositories/user.repository.contracts";

export interface SessionContext {
  userId: string;
  role: UserRole;
}

export async function getSession(request: Request): Promise<SessionContext> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw createUnauthenticatedError("Sessão inválida ou expirada");
  }
  return {
    userId: session.user.id,
    role: session.user.role as UserRole,
  };
}
```

- [ ] **Step 4: Create `src/server/api/auth/index.ts`**

```ts
export { getSession, type SessionContext } from "./get-session";
```

- [ ] **Step 5: Run get-session test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/auth/get-session.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/server/repositories/user.repository.contracts.ts`**

```ts
export type UserRole = "customer" | "organizer" | "admin" | "checker";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  save(user: UserRecord): Promise<void>;
}
```

- [ ] **Step 7: Write failing test for DrizzleUserRepository**

Create `tests/unit/server/repositories/drizzle-user.repository.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { DrizzleUserRepository } from "../../../../src/server/repositories/drizzle/drizzle-user.repository";

const MOCK_USER_ROW = {
  id: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  email: "test@example.com",
  name: "Test User",
  role: "customer" as const,
  emailVerified: false,
  image: null,
  createdAt: new Date("2026-03-29T12:00:00Z"),
  updatedAt: new Date("2026-03-29T12:00:00Z"),
};

const createMockDb = (rows: unknown[] = [MOCK_USER_ROW]) => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(rows),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue([]),
});

describe("DrizzleUserRepository", () => {
  test("findById returns UserRecord when user exists", async () => {
    const db = createMockDb();
    const repo = new DrizzleUserRepository(db as never);

    const result = await repo.findById("57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5");
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe("customer");
  });

  test("findById returns null when user does not exist", async () => {
    const db = createMockDb([]);
    const repo = new DrizzleUserRepository(db as never);

    const result = await repo.findById("non-existent-id");

    expect(result).toBeNull();
  });

  test("findByEmail returns UserRecord when user exists", async () => {
    const db = createMockDb();
    const repo = new DrizzleUserRepository(db as never);

    const result = await repo.findByEmail("test@example.com");

    expect(result?.email).toBe("test@example.com");
  });

  test("save upserts user without throwing", async () => {
    const db = createMockDb();
    const repo = new DrizzleUserRepository(db as never);

    await expect(
      repo.save({
        id: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        email: "test@example.com",
        name: "Test User",
        role: "customer",
        createdAt: new Date(),
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/repositories/drizzle-user.repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 9: Create `src/server/repositories/drizzle/drizzle-user.repository.ts`**

```ts
import { eq } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { user } from "../../infrastructure/db/schema";
import type { UserRecord, UserRepository } from "../user.repository.contracts";

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return row ? toUserRecord(row) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return row ? toUserRecord(row) : null;
  }

  async save(userRecord: UserRecord): Promise<void> {
    await this.db
      .insert(user)
      .values({
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        createdAt: userRecord.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          updatedAt: new Date(),
        },
      });
  }
}

function toUserRecord(row: typeof user.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
  };
}
```

- [ ] **Step 10: Export from drizzle repositories index**

Edit `src/server/repositories/drizzle/index.ts`:

```ts
export { DrizzleCouponRepository } from "./drizzle-coupon.repository";
export { DrizzleEventRepository } from "./drizzle-event.repository";
export { DrizzleLotRepository } from "./drizzle-lot.repository";
export { DrizzleOrderRepository } from "./drizzle-order.repository";
export { DrizzleTicketRepository } from "./drizzle-ticket.repository";
export { DrizzleUserRepository } from "./drizzle-user.repository";
```

- [ ] **Step 11: Run repository test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/repositories/drizzle-user.repository.test.ts`
Expected: PASS.

- [ ] **Step 12: Run full unit suite**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add src/server/api/auth/ \
        src/server/repositories/user.repository.contracts.ts \
        src/server/repositories/drizzle/drizzle-user.repository.ts \
        src/server/repositories/drizzle/index.ts \
        tests/unit/server/api/auth/ \
        tests/unit/server/repositories/drizzle-user.repository.test.ts
git commit -m "feat(auth): implement getSession helper and UserRepository"
```

---

## Task 7: Update `create-order` Route Adapter

**Files:**
- Modify: `src/server/api/orders/create-order.route-adapter.ts`
- Modify: `src/app/api/orders/route.ts`
- Modify: `tests/unit/server/api/create-order.route-adapter.test.ts`

- [ ] **Step 1: Write new failing tests for the updated adapter**

Edit `tests/unit/server/api/create-order.route-adapter.test.ts` — replace the entire file:

```ts
import { describe, expect, test, vi } from "vitest";

import { createCreateOrderRouteAdapter } from "../../../../src/server/api/orders/create-order.route-adapter";
import type { SessionContext } from "../../../../src/server/api/auth";

describe("createCreateOrderRouteAdapter", () => {
  test("extracts session and injects userId as customerId and actor", async () => {
    const SESSION: SessionContext = {
      userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      role: "customer",
    };

    const handleCreateOrder = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { orderId: "ord_001" } },
    }));

    const adapter = createCreateOrderRouteAdapter({
      getSession: vi.fn(async () => SESSION),
      handleCreateOrder,
    });

    const response = await adapter(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          items: [{ lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", quantity: 1 }],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(handleCreateOrder).toHaveBeenCalledWith({
      actor: { role: "customer", userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5" },
      body: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        items: [{ lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", quantity: 1 }],
      },
    });
  });

  test("returns 401 when session is missing", async () => {
    const { AppError } = await import("../../../../src/server/application/errors/app-error");

    const adapter = createCreateOrderRouteAdapter({
      getSession: vi.fn(async () => {
        throw new AppError("unauthenticated", "Sessão inválida ou expirada");
      }),
      handleCreateOrder: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({ eventId: "some-id", items: [] }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });

  test("returns 400 when request body is invalid json", async () => {
    const adapter = createCreateOrderRouteAdapter({
      getSession: vi.fn(async () => ({ userId: "some-id", role: "customer" as const })),
      handleCreateOrder: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: "{invalid-json}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/create-order.route-adapter.test.ts`
Expected: FAIL — `createCreateOrderRouteAdapter` still expects `customerId` dep.

- [ ] **Step 3: Update `create-order.route-adapter.ts`**

Edit `src/server/api/orders/create-order.route-adapter.ts`:

```ts
import {
  createInternalError,
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type {
  CreateOrderHandlerResponse,
  CreateOrderRequest,
} from "../create-order.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";
import type { SecurityActor } from "../../application/security";

export interface CreateOrderRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleCreateOrder: (request: CreateOrderRequest) => Promise<CreateOrderHandlerResponse>;
}

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

const mergeBodyWithServerCustomerId = (body: unknown, customerId: string): unknown => {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    return {
      ...(body as Record<string, unknown>),
      customerId,
    };
  }
  return { customerId };
};

export const createCreateOrderRouteAdapter = (
  dependencies: CreateOrderRouteAdapterDependencies,
) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const parsedBody = await readRequestBody(request);
      const body = mergeBodyWithServerCustomerId(parsedBody, session.userId);

      const response = await dependencies.handleCreateOrder({
        actor: { role: session.role as SecurityActor["role"], userId: session.userId },
        body,
      });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const getDatabaseUrlOrThrow = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw createInternalError("Database is not configured");
  }

  return databaseUrl;
};
```

Note: `resolveDemoCustomerId` and `DEFAULT_DEMO_CUSTOMER_ID` are removed — they are no longer needed.

- [ ] **Step 4: Update `src/app/api/orders/route.ts`**

```ts
import { createCreateOrderHandler } from "@/src/server/api/create-order.handler";
import {
  createCreateOrderRouteAdapter,
  getDatabaseUrlOrThrow,
} from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createCreateOrderUseCase } from "@/src/server/application/use-cases/create-order.use-case";
import { createDb } from "@/src/server/infrastructure/db/client";
import { createConsoleCheckoutObservability } from "@/src/server/infrastructure/observability";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "@/src/server/repositories/drizzle";

type PostOrdersRouteHandler = (request: Request) => Promise<Response>;

let cachedPostOrdersRouteHandler: PostOrdersRouteHandler | null = null;

const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  throw new Error("crypto.randomUUID is unavailable");
};

const buildPostOrdersRouteHandler = (): PostOrdersRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const observability = createConsoleCheckoutObservability();

  const createOrder = createCreateOrderUseCase({
    now: () => new Date(),
    generateOrderId: generateUuid,
    orderRepository: new DrizzleOrderRepository(db),
    lotRepository: new DrizzleLotRepository(db),
    couponRepository: new DrizzleCouponRepository(db),
    observability,
  });

  const handleCreateOrder = createCreateOrderHandler({ createOrder, observability });

  return createCreateOrderRouteAdapter({
    getSession,
    handleCreateOrder,
  });
};

const getPostOrdersRouteHandler = (): PostOrdersRouteHandler => {
  if (!cachedPostOrdersRouteHandler) {
    cachedPostOrdersRouteHandler = buildPostOrdersRouteHandler();
  }
  return cachedPostOrdersRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostOrdersRouteHandler()(request);
```

- [ ] **Step 5: Run adapter test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/create-order.route-adapter.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full unit suite**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/api/orders/create-order.route-adapter.ts \
        src/app/api/orders/route.ts \
        tests/unit/server/api/create-order.route-adapter.test.ts
git commit -m "feat(auth): wire getSession into create-order route adapter"
```

---

## Task 8: Update `validate-checkin` Route Adapter

**Files:**
- Modify: `src/server/api/checkin/validate-checkin.route-adapter.ts`
- Modify: `src/app/api/checkin/route.ts`
- Modify: `tests/unit/server/api/checkin/validate-checkin.route-adapter.test.ts`

- [ ] **Step 1: Write new failing tests**

Edit `tests/unit/server/api/checkin/validate-checkin.route-adapter.test.ts` — replace the entire file:

```ts
import { describe, expect, test, vi } from "vitest";

import { createValidateCheckinRouteAdapter } from "../../../../../src/server/api/checkin/validate-checkin.route-adapter";
import type { SessionContext } from "../../../../../src/server/api/auth";

const CHECKER_SESSION: SessionContext = {
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  role: "checker",
};

describe("createValidateCheckinRouteAdapter", () => {
  test("extracts session and forwards actor to handler", async () => {
    const handleValidateCheckin = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          outcome: "approved" as const,
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          checkerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
          validatedAt: "2026-03-29T12:00:00.000Z",
        },
      },
    }));

    const adapter = createValidateCheckinRouteAdapter({
      getSession: vi.fn(async () => CHECKER_SESSION),
      handleValidateCheckin,
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: JSON.stringify({
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(handleValidateCheckin).toHaveBeenCalledWith({
      actor: { role: "checker", userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5" },
      body: {
        ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      },
    });
  });

  test("returns 401 when session is missing", async () => {
    const { AppError } = await import("../../../../../src/server/application/errors/app-error");

    const adapter = createValidateCheckinRouteAdapter({
      getSession: vi.fn(async () => {
        throw new AppError("unauthenticated", "Sessão inválida ou expirada");
      }),
      handleValidateCheckin: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: JSON.stringify({ ticketId: "some-id", eventId: "some-id" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });

  test("returns 400 when request body is invalid json", async () => {
    const adapter = createValidateCheckinRouteAdapter({
      getSession: vi.fn(async () => CHECKER_SESSION),
      handleValidateCheckin: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: "{invalid-json}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/checkin/validate-checkin.route-adapter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `validate-checkin.route-adapter.ts`**

Edit `src/server/api/checkin/validate-checkin.route-adapter.ts`:

```ts
import {
  createInternalError,
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type {
  ValidateCheckinHandlerResponse,
  ValidateCheckinRequest,
} from "./validate-checkin.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";
import type { SecurityActor } from "../../application/security";

export interface ValidateCheckinRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleValidateCheckin: (
    request: ValidateCheckinRequest,
  ) => Promise<ValidateCheckinHandlerResponse>;
}

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

export const createValidateCheckinRouteAdapter = (
  dependencies: ValidateCheckinRouteAdapterDependencies,
) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);

      const response = await dependencies.handleValidateCheckin({
        actor: {
          role: session.role as SecurityActor["role"],
          userId: session.userId,
        },
        body,
      });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const getDatabaseUrlOrThrow = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw createInternalError("Database is not configured");
  }

  return databaseUrl;
};
```

Note: `DEFAULT_DEMO_CHECKER_ID`, `resolveDemoCheckerId` removed.

- [ ] **Step 4: Update `src/app/api/checkin/route.ts`**

```ts
import { createValidateCheckinHandler } from "@/src/server/api/checkin/validate-checkin.handler";
import {
  createValidateCheckinRouteAdapter,
  getDatabaseUrlOrThrow,
} from "@/src/server/api/checkin/validate-checkin.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createValidateCheckinUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import {
  DrizzleEventRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
} from "@/src/server/repositories/drizzle";

type PostCheckinRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCheckinRouteHandler: PostCheckinRouteHandler | null = null;

const buildPostCheckinRouteHandler = (): PostCheckinRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());

  const validateCheckin = createValidateCheckinUseCase({
    now: () => new Date(),
    ticketRepository: new DrizzleTicketRepository(db),
    orderRepository: new DrizzleOrderRepository(db),
  });

  const eventRepository = new DrizzleEventRepository(db);

  return createValidateCheckinRouteAdapter({
    getSession,
    handleValidateCheckin: createValidateCheckinHandler({
      validateCheckin,
      eventRepository,
    }),
  });
};

const getPostCheckinRouteHandler = (): PostCheckinRouteHandler => {
  if (!cachedPostCheckinRouteHandler) {
    cachedPostCheckinRouteHandler = buildPostCheckinRouteHandler();
  }
  return cachedPostCheckinRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostCheckinRouteHandler()(request);
```

- [ ] **Step 5: Run adapter test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/checkin/validate-checkin.route-adapter.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full unit suite**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/api/checkin/validate-checkin.route-adapter.ts \
        src/app/api/checkin/route.ts \
        tests/unit/server/api/checkin/validate-checkin.route-adapter.test.ts
git commit -m "feat(auth): wire getSession into validate-checkin route adapter"
```

---

## Task 9: Update Events Route Adapters

**Files:**
- Modify: `src/server/api/events/events.route-adapter.ts`
- Modify: `src/app/api/events/publish/route.ts`
- Modify: `src/app/api/events/update-status/route.ts`
- Modify: `tests/unit/server/api/events/events.route-adapter.test.ts`

- [ ] **Step 1: Write new failing tests**

Edit `tests/unit/server/api/events/events.route-adapter.test.ts` — replace the entire file:

```ts
import { describe, expect, test, vi } from "vitest";

import {
  createPublishEventRouteAdapter,
  createUpdateEventRouteAdapter,
} from "../../../../../src/server/api/events/events.route-adapter";
import type { SessionContext } from "../../../../../src/server/api/auth";

const ORGANIZER_SESSION: SessionContext = {
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  role: "organizer",
};

const ADMIN_SESSION: SessionContext = {
  userId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
  role: "admin",
};

describe("event route adapters", () => {
  test("publish adapter injects actor from session", async () => {
    const handlePublishEvent = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", status: "published" as const } },
    }));

    const adapter = createPublishEventRouteAdapter({
      getSession: vi.fn(async () => ORGANIZER_SESSION),
      handlePublishEvent,
    });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(handlePublishEvent).toHaveBeenCalledWith({
      actor: { role: "organizer", userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5" },
      body: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" },
    });
  });

  test("update adapter injects actor from session", async () => {
    const handleUpdateEvent = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", status: "cancelled" as const } },
    }));

    const adapter = createUpdateEventRouteAdapter({
      getSession: vi.fn(async () => ADMIN_SESSION),
      handleUpdateEvent,
    });

    const response = await adapter(
      new Request("http://localhost/api/events/update-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", targetStatus: "cancelled" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(handleUpdateEvent).toHaveBeenCalledWith({
      actor: { role: "admin", userId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9" },
      body: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", targetStatus: "cancelled" },
    });
  });

  test("publish adapter returns 401 when session is missing", async () => {
    const { AppError } = await import("../../../../../src/server/application/errors/app-error");

    const adapter = createPublishEventRouteAdapter({
      getSession: vi.fn(async () => {
        throw new AppError("unauthenticated", "Sessão inválida ou expirada");
      }),
      handlePublishEvent: async () => {
        throw new Error("should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "some-id" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/events/events.route-adapter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `events.route-adapter.ts`**

Edit `src/server/api/events/events.route-adapter.ts`:

```ts
import {
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type {
  PublishEventHandlerResponse,
  PublishEventRequest,
} from "./publish-event.handler";
import type {
  UpdateEventHandlerResponse,
  UpdateEventRequest,
} from "./update-event.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

export interface PublishEventRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handlePublishEvent: (
    request: PublishEventRequest,
  ) => Promise<PublishEventHandlerResponse>;
}

export interface UpdateEventRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleUpdateEvent: (request: UpdateEventRequest) => Promise<UpdateEventHandlerResponse>;
}

export const createPublishEventRouteAdapter =
  (dependencies: PublishEventRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handlePublishEvent({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createUpdateEventRouteAdapter =
  (dependencies: UpdateEventRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleUpdateEvent({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
```

- [ ] **Step 4: Update `src/app/api/events/publish/route.ts`**

```ts
import { createPublishEventHandler } from "@/src/server/api/events/publish-event.handler";
import { createPublishEventRouteAdapter } from "@/src/server/api/events/events.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createPublishEventUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/src/server/repositories/drizzle";

type PostPublishRouteHandler = (request: Request) => Promise<Response>;

let cachedPostPublishRouteHandler: PostPublishRouteHandler | null = null;

const buildPostPublishRouteHandler = (): PostPublishRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);
  const lotRepository = new DrizzleLotRepository(db);

  const handlePublishEvent = createPublishEventHandler({
    eventRepository,
    createPublishEventForOrganizer: (organizerId: string) =>
      createPublishEventUseCase({ organizerId, eventRepository, lotRepository }),
  });

  return createPublishEventRouteAdapter({ getSession, handlePublishEvent });
};

const getPostPublishRouteHandler = (): PostPublishRouteHandler => {
  if (!cachedPostPublishRouteHandler) {
    cachedPostPublishRouteHandler = buildPostPublishRouteHandler();
  }
  return cachedPostPublishRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostPublishRouteHandler()(request);
```

- [ ] **Step 5: Update `src/app/api/events/update-status/route.ts`**

```ts
import { createUpdateEventRouteAdapter } from "@/src/server/api/events/events.route-adapter";
import { createUpdateEventHandler } from "@/src/server/api/events/update-event.handler";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createUpdateEventStatusUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import { DrizzleEventRepository } from "@/src/server/repositories/drizzle";

type PostUpdateStatusRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateStatusRouteHandler: PostUpdateStatusRouteHandler | null = null;

const buildPostUpdateStatusRouteHandler = (): PostUpdateStatusRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);

  const handleUpdateEvent = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer: () =>
      createUpdateEventStatusUseCase({ eventRepository }),
  });

  return createUpdateEventRouteAdapter({ getSession, handleUpdateEvent });
};

const getPostUpdateStatusRouteHandler = (): PostUpdateStatusRouteHandler => {
  if (!cachedPostUpdateStatusRouteHandler) {
    cachedPostUpdateStatusRouteHandler = buildPostUpdateStatusRouteHandler();
  }
  return cachedPostUpdateStatusRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostUpdateStatusRouteHandler()(request);
```

- [ ] **Step 6: Run adapter test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/events/events.route-adapter.test.ts`
Expected: PASS.

- [ ] **Step 7: Run full unit suite**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/server/api/events/events.route-adapter.ts \
        src/app/api/events/publish/route.ts \
        src/app/api/events/update-status/route.ts \
        tests/unit/server/api/events/events.route-adapter.test.ts
git commit -m "feat(auth): wire getSession into events route adapters"
```

---

## Task 10: Update Coupons Route Adapters

**Files:**
- Modify: `src/server/api/coupons/coupons.route-adapter.ts`
- Modify: `src/app/api/coupons/create/route.ts`
- Modify: `src/app/api/coupons/update/route.ts`
- Modify: `tests/unit/server/api/coupons/coupons.route-adapter.test.ts`

- [ ] **Step 1: Write new failing tests**

Edit `tests/unit/server/api/coupons/coupons.route-adapter.test.ts` — replace the file with the same pattern as events.route-adapter.test.ts, adapted for coupons:

```ts
import { describe, expect, test, vi } from "vitest";

import {
  createCreateCouponRouteAdapter,
  createUpdateCouponRouteAdapter,
} from "../../../../../src/server/api/coupons/coupons.route-adapter";
import type { SessionContext } from "../../../../../src/server/api/auth";

const ORGANIZER_SESSION: SessionContext = {
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  role: "organizer",
};

describe("coupon route adapters", () => {
  test("create coupon adapter injects actor from session", async () => {
    const handleCreateCoupon = vi.fn(async () => ({
      status: 201 as const,
      body: { data: { couponId: "coupon-001" } },
    }));

    const adapter = createCreateCouponRouteAdapter({
      getSession: vi.fn(async () => ORGANIZER_SESSION),
      handleCreateCoupon,
    });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "event-001", code: "SAVE10" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(handleCreateCoupon).toHaveBeenCalledWith({
      actor: { role: "organizer", userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5" },
      body: { eventId: "event-001", code: "SAVE10" },
    });
  });

  test("create coupon adapter returns 401 when session is missing", async () => {
    const { AppError } = await import("../../../../../src/server/application/errors/app-error");

    const adapter = createCreateCouponRouteAdapter({
      getSession: vi.fn(async () => {
        throw new AppError("unauthenticated", "Sessão inválida ou expirada");
      }),
      handleCreateCoupon: async () => {
        throw new Error("should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "event-001" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  test("update coupon adapter injects actor from session", async () => {
    const handleUpdateCoupon = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { couponId: "coupon-001" } },
    }));

    const adapter = createUpdateCouponRouteAdapter({
      getSession: vi.fn(async () => ORGANIZER_SESSION),
      handleUpdateCoupon,
    });

    const response = await adapter(
      new Request("http://localhost/api/coupons/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ couponId: "coupon-001", maxRedemptions: 200 }),
      }),
    );

    expect(response.status).toBe(200);
    expect(handleUpdateCoupon).toHaveBeenCalledWith({
      actor: { role: "organizer", userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5" },
      body: { couponId: "coupon-001", maxRedemptions: 200 },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/coupons/coupons.route-adapter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `coupons.route-adapter.ts`**

Edit `src/server/api/coupons/coupons.route-adapter.ts`:

```ts
import {
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type {
  CreateCouponHandlerResponse,
  CreateCouponRequest,
} from "./create-coupon.handler";
import type {
  UpdateCouponHandlerResponse,
  UpdateCouponRequest,
} from "./update-coupon.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

export interface CreateCouponRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleCreateCoupon: (
    request: CreateCouponRequest,
  ) => Promise<CreateCouponHandlerResponse>;
}

export interface UpdateCouponRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleUpdateCoupon: (
    request: UpdateCouponRequest,
  ) => Promise<UpdateCouponHandlerResponse>;
}

export const createCreateCouponRouteAdapter =
  (dependencies: CreateCouponRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleCreateCoupon({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createUpdateCouponRouteAdapter =
  (dependencies: UpdateCouponRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleUpdateCoupon({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
```

- [ ] **Step 4: Update `src/app/api/coupons/create/route.ts`**

```ts
import { createCreateCouponHandler } from "@/src/server/api/coupons/create-coupon.handler";
import { createCreateCouponRouteAdapter } from "@/src/server/api/coupons/coupons.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createCreateCouponUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
} from "@/src/server/repositories/drizzle";

type PostCreateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostCreateCouponRouteHandler: PostCreateCouponRouteHandler | null = null;

const buildPostCreateCouponRouteHandler = (): PostCreateCouponRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const couponRepository = new DrizzleCouponRepository(db);
  const eventRepository = new DrizzleEventRepository(db);

  const handleCreateCoupon = createCreateCouponHandler({
    eventRepository,
    createCoupon: createCreateCouponUseCase({ couponRepository }),
  });

  return createCreateCouponRouteAdapter({ getSession, handleCreateCoupon });
};

const getPostCreateCouponRouteHandler = (): PostCreateCouponRouteHandler => {
  if (!cachedPostCreateCouponRouteHandler) {
    cachedPostCreateCouponRouteHandler = buildPostCreateCouponRouteHandler();
  }
  return cachedPostCreateCouponRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostCreateCouponRouteHandler()(request);
```

- [ ] **Step 5: Update `src/app/api/coupons/update/route.ts`**

Read `src/app/api/coupons/update/route.ts` first, then update analogously:

```ts
import { createUpdateCouponHandler } from "@/src/server/api/coupons/update-coupon.handler";
import { createUpdateCouponRouteAdapter } from "@/src/server/api/coupons/coupons.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/api/auth";
import { createUpdateCouponUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
} from "@/src/server/repositories/drizzle";

type PostUpdateCouponRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateCouponRouteHandler: PostUpdateCouponRouteHandler | null = null;

const buildPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const couponRepository = new DrizzleCouponRepository(db);
  const eventRepository = new DrizzleEventRepository(db);

  const handleUpdateCoupon = createUpdateCouponHandler({
    eventRepository,
    updateCoupon: createUpdateCouponUseCase({ couponRepository }),
  });

  return createUpdateCouponRouteAdapter({ getSession, handleUpdateCoupon });
};

const getPostUpdateCouponRouteHandler = (): PostUpdateCouponRouteHandler => {
  if (!cachedPostUpdateCouponRouteHandler) {
    cachedPostUpdateCouponRouteHandler = buildPostUpdateCouponRouteHandler();
  }
  return cachedPostUpdateCouponRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostUpdateCouponRouteHandler()(request);
```

Note: Read the existing `src/app/api/coupons/update/route.ts` before writing to confirm the exact use-case and handler function names.

- [ ] **Step 6: Run adapter test to verify it passes**

Run: `npm run test:unit -- --reporter=verbose tests/unit/server/api/coupons/coupons.route-adapter.test.ts`
Expected: PASS.

- [ ] **Step 7: Run full unit + regression suites**

Run: `npm run test:unit && npm run test:regression`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/server/api/coupons/coupons.route-adapter.ts \
        src/app/api/coupons/create/route.ts \
        src/app/api/coupons/update/route.ts \
        tests/unit/server/api/coupons/coupons.route-adapter.test.ts
git commit -m "feat(auth): wire getSession into coupons route adapters"
```

---

## Task 11: Update Fixtures + Apply DB Migrations

**Files:**
- Modify: `tests/fixtures/index.ts`
- Apply migrations to TEST_DATABASE_URL

**Context:** The `user` table must exist in the test DB before fixtures can insert events/orders with FK enforcement. `createUser` creates a user row and `createEventFixture`/`createOrderFixture` will now fail unless a valid user exists for the FK.

- [ ] **Step 1: Write failing test for `createUser` fixture**

Add to `tests/unit/server/infrastructure/db-schema.test.ts` or create `tests/unit/fixtures/fixtures.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { createUserFixture } from "../../fixtures";

// Verify the function exists and has correct signature — no DB needed
describe("createUserFixture", () => {
  test("is exported from fixtures module", () => {
    expect(typeof createUserFixture).toBe("function");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- --reporter=verbose tests/unit/fixtures/`
Expected: FAIL — `createUserFixture` is not exported.

- [ ] **Step 3: Add `createUserFixture` to `tests/fixtures/index.ts`**

Edit `tests/fixtures/index.ts` — add at the top (before the events section), importing `user` from schema:

```ts
import type { Db } from "../../src/server/infrastructure/db/client";
import {
  coupons,
  events,
  lots,
  orderItems,
  orders,
  tickets,
  user,
} from "../../src/server/infrastructure/db/schema";
```

Then add the user fixture function before `createEventFixture`:

```ts
// ─── Users ────────────────────────────────────────────────────────────────────

type UserInsert = typeof user.$inferInsert;
type UserRow = typeof user.$inferSelect;

export async function createUserFixture(
  db: Db,
  overrides: Partial<UserInsert> = {},
): Promise<UserRow> {
  const defaults: UserInsert = {
    name: "Test User",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    emailVerified: false,
    role: "customer",
  };

  const [row] = await db
    .insert(user)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}
```

Also update `createEventFixture` to use a valid `organizerId` if provided (the FK check will now enforce this at DB level). Add a helper constant at the top of fixtures:

```ts
export const TEST_ORGANIZER_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_CUSTOMER_ID = "00000000-0000-0000-0000-000000000002";
```

**Important:** Since `events.organizer_id` and `orders.customer_id` now have FK enforcement, all integration tests that create fixtures need a valid user row first. The hardcoded UUIDs `"00000000-0000-0000-0000-000000000001"` and `"00000000-0000-0000-0000-000000000002"` in existing fixtures will fail FK checks.

The cleanest fix is to update integration test setups to call `createUserFixture` before `createEventFixture`. Grep for all integration tests that call `createEventFixture` or `createOrderFixture` and add a user creation step before them.

- [ ] **Step 4: Check which integration tests need user creation first**

Run: `grep -r "createEventFixture\|createOrderFixture" tests/integration --include="*.ts" -l`

For each integration test file that creates events or orders, add a `createUserFixture` call at the beginning of the test setup and pass the returned user's id as `organizerId`/`customerId`.

Pattern to add in integration test `beforeEach` or at the start of each test:

```ts
const organizer = await createUserFixture(db, {
  role: "organizer",
  email: "organizer@test.com",
});

const event = await createEventFixture(db, {
  organizerId: organizer.id,
  status: "published",
});
```

- [ ] **Step 5: Apply migrations to test database**

Run: `DATABASE_URL=$TEST_DATABASE_URL npm run db:migrate`
Expected: migrations applied including `user`, `session`, `account`, `verification` tables plus FKs and new event columns.

- [ ] **Step 6: Run unit test for fixture**

Run: `npm run test:unit -- --reporter=verbose tests/unit/fixtures/`
Expected: PASS.

- [ ] **Step 7: Run integration tests to verify they pass after migration + fixture updates**

Run: `npm run test:integration`
Expected: all integration tests pass with real FK enforcement.

If FK violations occur in integration tests, they will require the user fixture to be created first. Fix each failing test by adding `createUserFixture` calls.

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures/index.ts \
        tests/unit/fixtures/
git commit -m "feat(auth): add createUserFixture and update integration tests for FK enforcement"
```

---

## Task 12: Auth Integration Tests

**Files:**
- Create: `tests/integration/api/auth/sign-up.integration.test.ts`
- Create: `tests/integration/api/auth/sign-in.integration.test.ts`
- Create: `tests/integration/api/auth/session.integration.test.ts`

**Context:** These tests hit the real Better Auth API endpoints in-process (not via HTTP) by calling `auth.api.*` directly with a real DB. They verify that sign-up, sign-in, and session extraction work end-to-end.

- [ ] **Step 1: Create `tests/integration/api/auth/sign-up.integration.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { auth } from "../../../src/server/infrastructure/auth/auth.config";
import { cleanDatabase, createTestDb } from "../../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("sign-up integration", () => {
  const db = createTestDb();

  test("registers a customer with correct role", async () => {
    await cleanDatabase(db);

    const result = await auth.api.signUpEmail({
      body: {
        email: "customer@test.com",
        password: "securepassword123",
        name: "Test Customer",
        role: "customer",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.user.email).toBe("customer@test.com");
    expect(result?.user.role).toBe("customer");
  });

  test("registers an organizer with correct role", async () => {
    await cleanDatabase(db);

    const result = await auth.api.signUpEmail({
      body: {
        email: "organizer@test.com",
        password: "securepassword123",
        name: "Test Organizer",
        role: "organizer",
      },
    });

    expect(result?.user.role).toBe("organizer");
  });

  test("rejects signup with admin role", async () => {
    await cleanDatabase(db);

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "admin@test.com",
          password: "securepassword123",
          name: "Wannabe Admin",
          role: "admin",
        },
      }),
    ).rejects.toBeDefined();
  });

  test("rejects signup with checker role", async () => {
    await cleanDatabase(db);

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "checker@test.com",
          password: "securepassword123",
          name: "Wannabe Checker",
          role: "checker",
        },
      }),
    ).rejects.toBeDefined();
  });
});
```

- [ ] **Step 2: Create `tests/integration/api/auth/sign-in.integration.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { auth } from "../../../src/server/infrastructure/auth/auth.config";
import { cleanDatabase, createTestDb } from "../../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("sign-in integration", () => {
  const db = createTestDb();

  test("returns session after successful login", async () => {
    await cleanDatabase(db);

    await auth.api.signUpEmail({
      body: {
        email: "customer@test.com",
        password: "securepassword123",
        name: "Test Customer",
        role: "customer",
      },
    });

    const result = await auth.api.signInEmail({
      body: {
        email: "customer@test.com",
        password: "securepassword123",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.user.email).toBe("customer@test.com");
    expect(result?.token).toBeDefined();
  });

  test("throws on wrong password", async () => {
    await cleanDatabase(db);

    await auth.api.signUpEmail({
      body: {
        email: "customer@test.com",
        password: "correctpassword",
        name: "Test Customer",
        role: "customer",
      },
    });

    await expect(
      auth.api.signInEmail({
        body: {
          email: "customer@test.com",
          password: "wrongpassword",
        },
      }),
    ).rejects.toBeDefined();
  });
});
```

- [ ] **Step 3: Create `tests/integration/api/auth/session.integration.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { auth } from "../../../src/server/infrastructure/auth/auth.config";
import { getSession } from "../../../src/server/api/auth";
import { cleanDatabase, createTestDb } from "../../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("session integration", () => {
  const db = createTestDb();

  test("getSession extracts userId and role from valid session token", async () => {
    await cleanDatabase(db);

    const signupResult = await auth.api.signUpEmail({
      body: {
        email: "customer@test.com",
        password: "securepassword123",
        name: "Test Customer",
        role: "customer",
      },
    });

    expect(signupResult?.token).toBeDefined();
    const token = signupResult!.token;

    // Build a request with the session token as a cookie
    const request = new Request("http://localhost/api/orders", {
      headers: {
        cookie: `better-auth.session_token=${token}`,
      },
    });

    const session = await getSession(request);

    expect(session.userId).toBe(signupResult?.user.id);
    expect(session.role).toBe("customer");
  });

  test("getSession throws unauthenticated error for request without session", async () => {
    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});
```

Note: The cookie name `better-auth.session_token` is the default Better Auth cookie name. Verify against the installed version — it may differ. Check the Better Auth docs or inspect a response from `auth.api.signUpEmail` to find the correct cookie name.

- [ ] **Step 4: Run auth integration tests**

Run: `npm run test:integration -- tests/integration/api/auth/`
Expected: all tests pass.

If the Better Auth hook API differs from what's implemented, adjust `auth.config.ts` accordingly (e.g., use `beforeSignUp` plugin or a different hook signature).

- [ ] **Step 5: Run full integration suite**

Run: `npm run test:integration`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/integration/api/auth/
git commit -m "test(auth): add sign-up, sign-in, and session integration tests"
```

---

## Task 13: RBAC Regression Test with Real Session

**Files:**
- Create: `tests/regression/auth/rbac-with-real-session.regression.test.ts`

**Context:** This test replaces hardcoded actor injection in the most critical RBAC scenarios with a real session obtained from Better Auth. It acts as the integration gate for auth + business rules.

- [ ] **Step 1: Create the regression test**

Create `tests/regression/auth/rbac-with-real-session.regression.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { auth } from "../../../src/server/infrastructure/auth/auth.config";
import { getSession } from "../../../src/server/api/auth";
import { createCreateOrderHandler } from "../../../src/server/api/create-order.handler";
import { createCreateOrderUseCase } from "../../../src/server/application/use-cases/create-order.use-case";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "../../../src/server/repositories/drizzle";
import {
  createEventFixture,
  createLotFixture,
  createUserFixture,
} from "../../fixtures";
import { cleanDatabase, createTestDb } from "../../integration/setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("RBAC with real session", () => {
  const db = createTestDb();

  const buildOrderHandler = () => {
    const useCase = createCreateOrderUseCase({
      now: () => new Date("2026-03-29T12:00:00Z"),
      generateOrderId: () => crypto.randomUUID(),
      orderRepository: new DrizzleOrderRepository(db),
      lotRepository: new DrizzleLotRepository(db),
      couponRepository: new DrizzleCouponRepository(db),
    });

    return createCreateOrderHandler({ createOrder: useCase });
  };

  test("customer can create an order for themselves", async () => {
    await cleanDatabase(db);

    const signupResult = await auth.api.signUpEmail({
      body: {
        email: "customer@rbac.com",
        password: "securepassword123",
        name: "RBAC Customer",
        role: "customer",
      },
    });

    const token = signupResult!.token;
    const request = new Request("http://localhost/", {
      headers: { cookie: `better-auth.session_token=${token}` },
    });

    const session = await getSession(request);

    const organizer = await createUserFixture(db, { role: "organizer", email: "org@rbac.com" });
    const event = await createEventFixture(db, { organizerId: organizer.id, status: "published" });
    const lot = await createLotFixture(db, event.id, {
      availableQuantity: 10,
      maxPerOrder: 4,
      priceInCents: 5000,
    });

    const handler = buildOrderHandler();
    const response = await handler({
      actor: { role: session.role, userId: session.userId },
      body: {
        eventId: event.id,
        customerId: session.userId,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    expect(response.status).toBe(200);
  });

  test("customer cannot create an order for another customer", async () => {
    await cleanDatabase(db);

    const customerA = await auth.api.signUpEmail({
      body: {
        email: "customerA@rbac.com",
        password: "password123",
        name: "Customer A",
        role: "customer",
      },
    });

    const customerB = await createUserFixture(db, { role: "customer", email: "customerB@rbac.com" });

    const request = new Request("http://localhost/", {
      headers: { cookie: `better-auth.session_token=${customerA!.token}` },
    });
    const session = await getSession(request);

    const organizer = await createUserFixture(db, { role: "organizer", email: "org2@rbac.com" });
    const event = await createEventFixture(db, { organizerId: organizer.id, status: "published" });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 10, maxPerOrder: 4 });

    const handler = buildOrderHandler();
    const response = await handler({
      actor: { role: session.role, userId: session.userId },
      body: {
        eventId: event.id,
        customerId: customerB.id,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });

  test("organizer cannot create an order", async () => {
    await cleanDatabase(db);

    const signupResult = await auth.api.signUpEmail({
      body: {
        email: "organizer@rbac.com",
        password: "password123",
        name: "RBAC Organizer",
        role: "organizer",
      },
    });

    const request = new Request("http://localhost/", {
      headers: { cookie: `better-auth.session_token=${signupResult!.token}` },
    });
    const session = await getSession(request);

    const organizer = await createUserFixture(db, { role: "organizer", email: "org3@rbac.com" });
    const event = await createEventFixture(db, { organizerId: organizer.id, status: "published" });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 10, maxPerOrder: 4 });

    const handler = buildOrderHandler();
    const response = await handler({
      actor: { role: session.role, userId: session.userId },
      body: {
        eventId: event.id,
        customerId: session.userId,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run regression test**

Run: `npm run test:regression`
Expected: all regression tests pass including the new RBAC test.

- [ ] **Step 3: Commit**

```bash
git add tests/regression/auth/rbac-with-real-session.regression.test.ts
git commit -m "test(auth): add RBAC regression test with real Better Auth session"
```

---

## Task 14: Docs Update — Changelog, Task Files, Logs

**Files:**
- Create: `docs/development/Logs/SCH-001.md`
- Create: `docs/development/Logs/AUTH-001.md`
- Modify: `docs/development/TASKS/PHASE-006-auth-schema-completion.md`
- Modify: `docs/development/TASKS.md`
- Modify: `docs/development/CHANGELOG.md`

- [ ] **Step 1: Create `docs/development/Logs/SCH-001.md`**

```markdown
# SCH-001 — Schema Migration Evidence

> Data: 2026-03-29
> Status: Concluído

## Tabelas criadas

- `user` — id (uuid PK), name, email (unique), emailVerified, image, role, createdAt, updatedAt
- `session` — id, expiresAt, token (unique), userId (FK → user.id CASCADE)
- `account` — id, accountId, providerId, userId (FK → user.id CASCADE)
- `verification` — id, identifier, value, expiresAt

## Alterações em tabelas existentes

- `events.organizer_id` — FK adicionada: `→ user.id` (sem cascade)
- `orders.customer_id` — FK adicionada: `→ user.id` (sem cascade)
- `events.description` — text nullable
- `events.location` — text nullable
- `events.image_url` — text nullable

## Arquivo de migration

Ver `drizzle/` para o arquivo `.sql` gerado.
```

- [ ] **Step 2: Create `docs/development/Logs/AUTH-001.md`**

```markdown
# AUTH-001 — Auth Integration Evidence

> Data: 2026-03-29
> Status: Concluído

## Better Auth integrado

- Adapter: Drizzle + Neon PostgreSQL
- Estratégia: email + senha (OAuth-ready)
- Role padrão: `customer`
- Roles permitidos no cadastro público: `customer`, `organizer`
- Roles elevados (`admin`, `checker`) bloqueados no sign-up via hook

## Endpoints expostos

- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`

## Route adapters atualizados (6)

- `create-order.route-adapter.ts`
- `validate-checkin.route-adapter.ts`
- `events.route-adapter.ts` (publish + update)
- `coupons.route-adapter.ts` (create + update)

Todos usam `getSession(request)` como dependência injetável.
```

- [ ] **Step 3: Mark tasks as done in PHASE-006 file**

Edit `docs/development/TASKS/PHASE-006-auth-schema-completion.md` — mark all 10 tasks as `[x]` (done).

- [ ] **Step 4: Update TASKS.md progress**

Edit `docs/development/TASKS.md` — update Phase 006 row:

```
| 006 | Sprint 006 | `docs/development/TASKS/PHASE-006-auth-schema-completion.md` | 🟢 Concluída | 10/10 |
```

- [ ] **Step 5: Update CHANGELOG.md**

Add under `[Unreleased]` or create a new entry:

```markdown
## [Unreleased]

### Added (Sprint 006 — Auth Integration & Schema Completion)
- Better Auth integration with Drizzle adapter (email/password auth)
- `user`, `session`, `account`, `verification` tables via Drizzle schema
- FK enforcement: `events.organizer_id → user.id`, `orders.customer_id → user.id`
- Presentation fields in events: `description`, `location`, `image_url`
- `getSession()` injectable helper for per-request actor extraction
- `UserRepository` contract and `DrizzleUserRepository` implementation
- `unauthenticated` AppErrorCode with 401 HTTP mapping
- `createUserFixture` in test fixtures
- Auth integration tests: sign-up, sign-in, session extraction
- RBAC regression test with real Better Auth session

### Changed (Sprint 006)
- All 6 route adapters now extract actor from session (not headers/hardcoded)
- `checkerId` moved from `ValidateCheckinUseCaseDependencies` to `ValidateCheckinInput`
```

- [ ] **Step 6: Run full test suite**

Run: `npm run test`
Expected: all unit + regression + integration tests pass.

- [ ] **Step 7: Run lint:architecture**

Run: `npm run lint:architecture`
Expected: no violations.

- [ ] **Step 8: Commit**

```bash
git add docs/development/Logs/ \
        docs/development/TASKS/PHASE-006-auth-schema-completion.md \
        docs/development/TASKS.md \
        docs/development/CHANGELOG.md
git commit -m "docs(gov): close Sprint 006 with auth integration handoff documentation"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task covering it |
|-----------------|-----------------|
| Tabela `user` com `role` + sessão/account/verification | Task 3 |
| FK `orders.customer_id → user.id` | Task 4 |
| FK `events.organizer_id → user.id` | Task 4 |
| Campos `description`, `location`, `image_url` em events | Task 4 |
| `POST /api/auth/sign-up/email` funcional | Task 5 |
| `POST /api/auth/sign-in/email` funcional | Task 5 + 12 |
| `getSession` com `getSession(request)` injetável | Task 6 |
| `UserRecord` e `UserRepository` contract | Task 6 |
| `DrizzleUserRepository` | Task 6 |
| 6 route adapters com sessão real | Tasks 7–10 |
| Testes unitários de `getSession` | Task 6 |
| Testes unitários de route adapters atualizados | Tasks 7–10 |
| Testes de integração auth (sign-up, sign-in, sessão) | Task 12 |
| Regressão: RBAC policies com sessão real | Task 13 |
| `unauthenticated` error code + 401 | Task 1 |
| `checkerId` movido para input (bloqueante) | Task 2 |

### Critical ordering constraints

1. Task 1 (unauthenticated code) must precede Task 6 (getSession uses it)
2. Task 2 (checkerId) must precede Task 8 (route adapter uses updated use-case)
3. Task 3 (user schema) must precede Task 4 (FKs reference user table)
4. Tasks 3+4 (schema) must precede Task 11 (DB migration + fixtures)
5. Task 5 (Better Auth config) must precede Tasks 6, 12, 13 (they use auth)
6. Tasks 7–10 (route adapters) require Task 6 (getSession) to exist
7. Task 12 (integration tests) requires tasks 3–6 + 11 (DB migrated, auth configured)

### Type consistency

- `SessionContext.role` is `UserRole = "customer" | "organizer" | "admin" | "checker"`
- `SecurityActor.role` is `"customer" | "organizer" | "admin" | "checker"` — compatible via cast
- `ValidateCheckinInput.checkerId` is `string` — matches `actor.userId: string`
- `user.id` is `uuid` — matches existing `uuid("organizer_id")` and `uuid("customer_id")`
