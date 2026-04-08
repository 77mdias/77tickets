# Testing

**Analysis Date:** 2025-01-31

---

## Strategy

Testing follows strict **TDD**. All features, bug fixes, and behavior changes require a failing test first. A change is only done when tests pass and architectural boundaries remain intact.

**Three test suites** are maintained:
- `tests/unit` — domain rules, use-cases, handlers, schemas, feature components (fast, no I/O)
- `tests/regression` — reproduce and lock previously broken behaviors
- `tests/integration` — route + persistence boundaries against a real Neon PostgreSQL test DB

---

## Running Tests

```bash
# Run unit + regression tests (no DB required)
bun run test:unit

# Run regression tests only
bun run test:regression

# Run integration tests (requires TEST_DATABASE_URL)
bun run test:integration

# Watch mode (unit tests only)
bun run test:watch

# Run all suites (unit + regression + integration)
bun run test

# CI quality gate (lint + unit + regression + build)
bun run ci:quality

# CI integration gate
bun run ci:integration
```

---

## Test Framework

**Runner:** Vitest  
**Config files:**
- `vitest.config.ts` — unit and regression tests, `node` environment, `@` path alias
- `vitest.integration.config.ts` — integration tests, extends base config, adds global setup, disables `fileParallelism`, `testTimeout: 15000`

**Assertion:** Vitest built-in `expect` (Jest-compatible API)

**Mocking:** `vi.fn()`, `vi.mock()` from Vitest

**Coverage:** v8 provider, reporters: `text` + `html`

---

## Test Structure

### Directory Layout

```
tests/
├── fixtures/
│   └── index.ts              # Factory functions for all domain entities
├── unit/
│   ├── api/                  # Error shape, rate limiter, payload minimization
│   ├── app/api/              # Next.js API route handlers (cron, orders)
│   ├── application/          # Use-case tests (OLD path, being migrated)
│   ├── architecture/         # ESLint guardrail tests, import alias enforcement
│   ├── features/             # UI feature component tests
│   ├── server/
│   │   ├── api/
│   │   │   ├── handlers/     # Handler unit tests
│   │   │   ├── schemas/      # Zod schema validation tests
│   │   │   └── middleware/
│   │   ├── application/
│   │   │   ├── security/     # Policy tests
│   │   │   └── use-cases/    # Use-case tests (current path)
│   │   ├── domain/           # Domain rule tests (order.rules, lot.rules, etc.)
│   │   ├── email/            # Email provider and template tests
│   │   ├── infrastructure/   # DB client and schema tests
│   │   ├── payment/          # Stripe provider tests
│   │   └── repositories/     # Repository contract tests
│   └── use-cases/            # Cross-cutting use-case tests (e.g., concurrency)
├── regression/
│   ├── auth/
│   ├── checkin/
│   ├── events/
│   ├── orders/
│   ├── runtime/
│   ├── payment-flow.regression.test.ts
│   ├── stock-and-state.regression.test.ts
│   └── email-not-sent-for-non-paid-orders.test.ts
└── integration/
    ├── api/                  # Full route + persistence integration tests
    │   ├── auth/
    │   ├── checkin/
    │   ├── coupons/
    │   ├── events/
    │   ├── lots/
    │   ├── orders/
    │   └── webhooks/
    ├── repositories/         # Drizzle repository integration tests
    ├── server/               # Schema migration tests
    ├── setup/
    │   ├── global-setup.ts   # DB reset + migration before integration suite
    │   └── index.ts          # createTestDb(), cleanDatabase(), TEST_USER_IDS
    └── smoke.integration.test.ts
```

### File Naming

- Unit tests: `<subject>.test.ts` co-located in test directory mirroring source path
- Regression tests: `<subject>.regression.test.ts`
- Integration tests: `<subject>.integration.test.ts`

---

## Test Types

### Unit Tests (`tests/unit/`)

- No database, no network, no filesystem I/O
- Use-cases tested with factory injection (mock repositories via `vi.fn()`)
- Domain rule tests are pure function tests (`expect(canTransitionOrder(...)).toBe(true)`)
- Schema tests use `schema.safeParse()` directly
- Handler tests inject mock use-cases

**Domain rule test pattern:**
```typescript
import { describe, expect, test } from "vitest";
import { canTransitionOrder, validateOrderTransition } from "@/server/domain/orders/order.rules";

describe("canTransitionOrder", () => {
  test("allows pending → paid", () => {
    expect(canTransitionOrder("pending", "paid")).toBe(true);
  });
  test("rejects paid → expired", () => {
    expect(canTransitionOrder("paid", "expired")).toBe(false);
  });
});
```

**Use-case test pattern (factory injection):**
```typescript
import { expect, test, vi } from "vitest";

function makeBaseDependencies(overrides = {}) {
  return {
    now: () => FIXED_NOW,
    generateOrderId: () => "ord-test-001",
    orderRepository: { create: vi.fn(async () => ({ order: { id: "ord-test-001" }, items: [] })) },
    lotRepository: {
      findByIds: vi.fn(async (ids) => ids.includes(LOT_ID) ? [makeActiveLot()] : []),
      decrementAvailableQuantity: vi.fn(async () => true),
    },
    couponRepository: {
      findByCodeForEvent: vi.fn(async () => null),
      incrementRedemptionCount: vi.fn(async () => undefined),
    },
    ...overrides,
  };
}

test("purchase fails when lot sale window has expired", async () => {
  const deps = makeBaseDependencies({ lotRepository: { ... } });
  const createOrder = createCreateOrderUseCase(deps);
  await expect(createOrder({ ... })).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "out_of_window" },
  });
});
```

**Schema test pattern:**
```typescript
import { expect, test } from "vitest";
import { createOrderSchema } from "../../../../../src/server/api/schemas";

test("createOrderSchema rejects unknown fields", () => {
  const result = createOrderSchema.safeParse({ ..., clientTotalInCents: 1 });
  expect(result.success).toBe(false);
  expect(result.error.issues).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "unrecognized_keys" })]),
  );
});
```

### Regression Tests (`tests/regression/`)

- Lock previously broken behaviors to prevent re-introduction
- Follow the same mock/factory injection pattern as unit tests
- Named with `regression` suffix and often scoped with a bug/feature ID in `describe` string

```typescript
describe("ORD-004 regression coverage: order expiration and invalid state", () => {
  test("expired order is not eligible to keep active ticket", () => { ... });
});
```

### Integration Tests (`tests/integration/`)

- Require `TEST_DATABASE_URL` environment variable (Neon PostgreSQL)
- Tests are skipped if `TEST_DATABASE_URL` is not set via `describe.skipIf(!process.env.TEST_DATABASE_URL)`
- Run sequentially (`fileParallelism: false`)
- Global setup resets and re-migrates the DB schema before the suite runs

**Integration test pattern:**
```typescript
import { describe, expect, test } from "vitest";
import { createTestDb, cleanDatabase, TEST_USER_IDS } from "../../setup";
import { createEventFixture, createLotFixture } from "../../../fixtures";

describe.skipIf(!process.env.TEST_DATABASE_URL)("create order endpoint integration", () => {
  const db = createTestDb();

  test("returns 200 and stable payload for a valid checkout request", async () => {
    await cleanDatabase(db);
    const event = await createEventFixture(db, { status: "published" });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 5 });
    // ... invoke handler directly, assert on response shape
  });
});
```

### Architecture Tests (`tests/unit/architecture/`)

- Verify ESLint boundary guardrails work at test time
- Use `ESLint.lintText()` to assert that violating imports produce lint errors
- Example: `tests/unit/architecture/eslint-guardrails.test.ts`

---

## Fixtures and Factories

**Location:** `tests/fixtures/index.ts`

**Pattern:** Each factory function accepts a `db` (from `createTestDb()`) and an optional partial overrides object. Inserts a row and returns the inserted record.

```typescript
// Usage
import { createEventFixture, createLotFixture, createUserFixture } from "../../fixtures";

const event = await createEventFixture(db, { status: "published", organizerId: "..." });
const lot = await createLotFixture(db, event.id, { availableQuantity: 10, priceInCents: 5000 });
```

**Available factories:**
- `createUserFixture(db, overrides?)` — inserts into `user` table
- `createEventFixture(db, overrides?)` — inserts into `events` table
- `createLotFixture(db, eventId, overrides?)` — inserts into `lots` table
- `createCouponFixture(db, eventId, overrides?)` — inserts into `coupons` table
- Additional factories for orders, order items, tickets

**Cleanup:** Integration tests call `cleanDatabase(db)` per-test, which `TRUNCATE ... RESTART IDENTITY CASCADE` all tables and re-seeds well-known test users (`TEST_USER_IDS` from `tests/integration/setup/index.ts`).

---

## Integration Test Setup

**Global setup file:** `tests/integration/setup/global-setup.ts`

Runs once before the integration suite in a separate Node process:
1. Loads `.env` file manually (not auto-loaded in global setup context)
2. Validates `TEST_DATABASE_URL` is set and reachable
3. Drops all tables and ENUM types (`resetSchema`)
4. Re-runs Drizzle migrations on the clean database

**Per-test helpers from `tests/integration/setup/index.ts`:**
- `createTestDb()` — creates a `Db` instance from `TEST_DATABASE_URL`
- `cleanDatabase(db)` — truncates all tables, re-seeds well-known users
- `TEST_USER_IDS` — typed map of stable well-known user UUIDs for each role

---

## Key Test Patterns

**Fixed timestamps:** Tests use fixed `Date` constants (e.g., `FIXED_NOW = new Date("2026-03-27T12:00:00.000Z")`) injected through the `now` dependency to make time-sensitive tests deterministic.

**Error assertion:**
```typescript
await expect(useCase(input)).rejects.toMatchObject({
  code: "conflict",
  details: { reason: "out_of_window" },
});
```

**Async testing:** Use `async/await` throughout. No `.then()` chains.

**Behavior over implementation:** Tests assert on public API contracts (return values, thrown errors, response shapes), not internal implementation details.

**Describe grouping:** Related tests are grouped with `describe`. Single-concern tests for simple rules use standalone `test(...)` without `describe`.

**No shared mutable state:** Each test creates its own fixtures and dependencies. `cleanDatabase` is called at the start of each integration test, not in `beforeEach`/`afterEach`.

---

## Coverage Areas

| Area | Test Type | Files |
|---|---|---|
| Domain rules (order, lot, coupon, ticket) | Unit | `tests/unit/server/domain/` |
| Use-case business logic | Unit/Regression | `tests/unit/server/application/use-cases/`, `tests/unit/application/` |
| RBAC security policies | Unit | `tests/unit/server/application/security/` |
| API handler behavior | Unit | `tests/unit/server/api/` |
| Zod schema validation | Unit | `tests/unit/server/api/schemas/` |
| Email templates | Unit | `tests/unit/server/email/` |
| Infrastructure (DB client, schema) | Unit | `tests/unit/server/infrastructure/` |
| Payment provider (Stripe) | Unit | `tests/unit/server/payment/` |
| Feature components (UI) | Unit | `tests/unit/features/` |
| ESLint architectural boundaries | Unit | `tests/unit/architecture/` |
| Full API routes + DB | Integration | `tests/integration/api/` |
| Drizzle repository implementations | Integration | `tests/integration/repositories/` |
| Schema migration correctness | Integration | `tests/integration/server/` |
| Auth + RBAC regressions | Regression | `tests/regression/auth/` |
| Payment flow regressions | Regression | `tests/regression/payment-flow.regression.test.ts` |
| Order state regressions | Regression | `tests/regression/orders/` |
| Checkin regressions | Regression | `tests/regression/checkin/` |
