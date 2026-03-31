import { expect, test } from "vitest";

/**
 * HDN-010: Concurrency stress test for stock decrement.
 *
 * Uses an in-memory counter to simulate atomic SQL decrement with
 * a WHERE available_quantity >= quantity guard. Verifies that
 * concurrent orders cannot oversell a lot.
 */

type LotData = {
  id: string;
  eventId: string;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  availableQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  status: "active" | "paused" | "sold_out" | "closed";
};

async function loadCreateOrderFactory() {
  const useCaseModule = await import("../../../src/server/application/use-cases/create-order.use-case");
  const createCreateOrderUseCase = (
    useCaseModule as { createCreateOrderUseCase?: unknown }
  ).createCreateOrderUseCase;

  if (typeof createCreateOrderUseCase !== "function") {
    throw new Error("expected createCreateOrderUseCase to be exported");
  }

  return createCreateOrderUseCase as (deps: unknown) => (input: unknown) => Promise<unknown>;
}

const FIXED_NOW = new Date("2026-03-27T12:00:00.000Z");
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const LOT_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";

test("HDN-010: concurrent orders decrement stock atomically, last one gets insufficient_stock", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  // stock = 2, 3 concurrent orders each want 1 ticket
  // expected: exactly 2 succeed, 1 fails with insufficient_stock
  let availableQuantity = 2;

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "General",
    priceInCents: 5000,
    totalQuantity: 2,
    availableQuantity: 2,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  let orderCounter = 0;

  const makeUseCase = () => {
    const lotRepository = {
      findByIds: async (ids: string[]) => ids.includes(lot.id) ? [lot] : [],
      decrementAvailableQuantity: async (_lotId: string, quantity: number): Promise<boolean> => {
        // Simulate atomic SQL: WHERE available_quantity >= quantity
        if (availableQuantity < quantity) {
          return false;
        }
        availableQuantity -= quantity;
        return true;
      },
    };

    orderCounter += 1;
    const orderId = `order-concurrent-${orderCounter}`;

    return (createCreateOrderUseCase as (deps: {
      now: () => Date;
      generateOrderId: () => string;
      orderRepository: { create: (...args: unknown[]) => Promise<unknown> };
      lotRepository: typeof lotRepository;
      couponRepository: {
        findByCodeForEvent: () => Promise<null>;
        incrementRedemptionCount: () => Promise<void>;
      };
    }) => (input: unknown) => Promise<unknown>)({
      now: () => FIXED_NOW,
      generateOrderId: () => orderId,
      orderRepository: {
        create: async () => ({ id: orderId }),
      },
      lotRepository,
      couponRepository: {
        findByCodeForEvent: async () => null,
        incrementRedemptionCount: async () => undefined,
      },
    });
  };

  const input = {
    eventId: EVENT_ID,
    customerId: "customer-123",
    items: [{ lotId: LOT_ID, quantity: 1 }],
  };

  // Launch 3 concurrent orders
  const results = await Promise.allSettled([
    makeUseCase()(input),
    makeUseCase()(input),
    makeUseCase()(input),
  ]);

  const successes = results.filter((r) => r.status === "fulfilled");
  const failures = results.filter((r) => r.status === "rejected");

  expect(successes).toHaveLength(2);
  expect(failures).toHaveLength(1);

  const failedResult = failures[0];
  expect(failedResult?.status).toBe("rejected");
  if (failedResult?.status === "rejected") {
    expect(failedResult.reason).toMatchObject({
      code: "conflict",
      details: { reason: "insufficient_stock" },
    });
  }

  // Stock should have been decremented exactly twice
  expect(availableQuantity).toBe(0);
});

test("HDN-010: no oversell — all concurrent orders fail when stock = 0", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  let availableQuantity = 0;

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "Sold Out",
    priceInCents: 5000,
    totalQuantity: 0,
    availableQuantity: 0,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "sold_out",
  };

  let orderCounter = 0;

  const makeUseCase = () => {
    const lotRepository = {
      findByIds: async (ids: string[]) => ids.includes(lot.id) ? [lot] : [],
      decrementAvailableQuantity: async (_lotId: string, quantity: number): Promise<boolean> => {
        if (availableQuantity < quantity) {
          return false;
        }
        availableQuantity -= quantity;
        return true;
      },
    };

    orderCounter += 1;
    const orderId = `order-zero-${orderCounter}`;

    return (createCreateOrderUseCase as (deps: {
      now: () => Date;
      generateOrderId: () => string;
      orderRepository: { create: (...args: unknown[]) => Promise<unknown> };
      lotRepository: typeof lotRepository;
      couponRepository: {
        findByCodeForEvent: () => Promise<null>;
        incrementRedemptionCount: () => Promise<void>;
      };
    }) => (input: unknown) => Promise<unknown>)({
      now: () => FIXED_NOW,
      generateOrderId: () => orderId,
      orderRepository: {
        create: async () => ({ id: orderId }),
      },
      lotRepository,
      couponRepository: {
        findByCodeForEvent: async () => null,
        incrementRedemptionCount: async () => undefined,
      },
    });
  };

  const input = {
    eventId: EVENT_ID,
    customerId: "customer-123",
    items: [{ lotId: LOT_ID, quantity: 1 }],
  };

  // All 3 orders should fail — no stock
  // Note: lot validation (validateLotForPurchase) catches sold_out status first
  const results = await Promise.allSettled([
    makeUseCase()(input),
    makeUseCase()(input),
    makeUseCase()(input),
  ]);

  const failures = results.filter((r) => r.status === "rejected");
  expect(failures).toHaveLength(3);

  // Stock remains 0
  expect(availableQuantity).toBe(0);
});
