import { expect, test, vi } from "vitest";

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

type CreateOrderUseCaseFactory = (dependencies: {
  now: () => Date;
  generateOrderId: () => string;
  generateTicketCode?: () => string;
  orderRepository: {
    create: (...args: unknown[]) => Promise<unknown>;
  };
  lotRepository: {
    findByIds: (lotIds: string[]) => Promise<LotData[]>;
    decrementAvailableQuantity: (lotId: string, quantity: number) => Promise<boolean>;
  };
  couponRepository: {
    findByCodeForEvent: (code: string, eventId: string) => Promise<{
      id: string;
      eventId: string;
      code: string;
      maxRedemptions: number | null;
      redemptionCount: number;
      validFrom: Date;
      validUntil: Date;
      discountInCents: number | null;
      discountPercentage: number | null;
    } | null>;
    incrementRedemptionCount: (couponId: string) => Promise<void>;
  };
  observability?: {
    trackCreateOrderExecution: (entry: Record<string, unknown>) => void | Promise<void>;
  };
}) => (input: {
  eventId: string;
  customerId: string;
  items: Array<{ lotId: string; quantity: number } & Record<string, unknown>>;
  couponCode?: string;
}) => Promise<unknown> | unknown;

const FIXED_NOW = new Date("2026-03-27T12:00:00.000Z");
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const CUSTOMER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const LOT_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const COUPON_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";

async function loadCreateOrderFactory(): Promise<CreateOrderUseCaseFactory> {
  const useCaseModule = await import("../../../src/server/application/use-cases/create-order.use-case");
  const createCreateOrderUseCase = (
    useCaseModule as { createCreateOrderUseCase?: unknown }
  ).createCreateOrderUseCase;

  if (typeof createCreateOrderUseCase !== "function") {
    throw new Error(
      "ORD-002 RED: expected createCreateOrderUseCase to be exported by create-order.use-case.ts",
    );
  }

  return createCreateOrderUseCase as CreateOrderUseCaseFactory;
}

function makeLotRepository(lot: LotData): {
  findByIds: (lotIds: string[]) => Promise<LotData[]>;
  decrementAvailableQuantity: (lotId: string, quantity: number) => Promise<boolean>;
} {
  return {
    findByIds: async (lotIds) => lotIds.includes(lot.id) ? [lot] : [],
    decrementAvailableQuantity: async () => true,
  };
}

test("ORD-002 RED: calculates totals from server lot price and ignores manipulated client price", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const orderRepositoryCreate = vi.fn(async (...args: unknown[]) => args[0]);
  const generateTicketCode = vi
    .fn()
    .mockReturnValueOnce("TKT-UNIT-001")
    .mockReturnValueOnce("TKT-UNIT-002");

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "VIP",
    priceInCents: 10000,
    totalQuantity: 100,
    availableQuantity: 100,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-red-001",
    generateTicketCode,
    orderRepository: { create: orderRepositoryCreate },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => null,
      incrementRedemptionCount: async () => undefined,
    },
  });

  await useCase({
    eventId: EVENT_ID,
    customerId: CUSTOMER_ID,
    items: [
      {
        lotId: LOT_ID,
        quantity: 2,
        unitPriceInCents: 1,
      },
    ],
  });

  expect(orderRepositoryCreate).toHaveBeenCalled();

  const [persistedOrder, persistedItems] = orderRepositoryCreate.mock.calls[0] ?? [];
  const persistedTickets = orderRepositoryCreate.mock.calls[0]?.[2];
  expect(persistedOrder).toMatchObject({
    subtotalInCents: 20000,
    discountInCents: 0,
    totalInCents: 20000,
  });
  expect(persistedItems).toEqual([
    {
      lotId: LOT_ID,
      quantity: 2,
      unitPriceInCents: 10000,
    },
  ]);
  expect(persistedTickets).toEqual([
    {
      eventId: EVENT_ID,
      lotId: LOT_ID,
      code: "TKT-UNIT-001",
    },
    {
      eventId: EVENT_ID,
      lotId: LOT_ID,
      code: "TKT-UNIT-002",
    },
  ]);
  expect(generateTicketCode).toHaveBeenCalledTimes(2);
});

test("ORD-002 RED: rejects purchase when lot has insufficient stock", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "General",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 1,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-red-002",
    orderRepository: {
      create: async () => ({ id: "order-red-002" }),
    },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => null,
      incrementRedemptionCount: async () => undefined,
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      customerId: CUSTOMER_ID,
      items: [{ lotId: LOT_ID, quantity: 2 }],
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: {
      reason: "insufficient_stock",
    },
  });
});

test("ORD-002 RED: rejects purchase when lot is outside sale window", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "Early Bird",
    priceInCents: 8000,
    totalQuantity: 100,
    availableQuantity: 50,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-04-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-red-003",
    orderRepository: {
      create: async () => ({ id: "order-red-003" }),
    },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => null,
      incrementRedemptionCount: async () => undefined,
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      customerId: CUSTOMER_ID,
      items: [{ lotId: LOT_ID, quantity: 1 }],
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: {
      reason: "out_of_window",
    },
  });
});

test("ORD-002 RED: applies valid coupon discount in order total", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const orderRepositoryCreate = vi.fn(async (...args: unknown[]) => args[0]);
  const couponIncrement = vi.fn(async () => undefined);

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "VIP",
    priceInCents: 10000,
    totalQuantity: 100,
    availableQuantity: 100,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-red-004",
    orderRepository: { create: orderRepositoryCreate },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "SAVE20",
        maxRedemptions: 100,
        redemptionCount: 1,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: new Date("2026-12-31T23:59:59.000Z"),
        discountInCents: null,
        discountPercentage: 20,
      }),
      incrementRedemptionCount: couponIncrement,
    },
  });

  await useCase({
    eventId: EVENT_ID,
    customerId: CUSTOMER_ID,
    items: [{ lotId: LOT_ID, quantity: 2 }],
    couponCode: "SAVE20",
  });

  const [persistedOrder] = orderRepositoryCreate.mock.calls[0] ?? [];
  expect(persistedOrder).toMatchObject({
    subtotalInCents: 20000,
    discountInCents: 4000,
    totalInCents: 16000,
  });
  expect(couponIncrement).toHaveBeenCalledWith(COUPON_ID);
});

test("ORD-002 RED: rejects coupon when coupon is invalid for event/time window", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "General",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 100,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-red-005",
    orderRepository: {
      create: async () => ({ id: "order-red-005" }),
    },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "EXPIRED10",
        maxRedemptions: 100,
        redemptionCount: 2,
        validFrom: new Date("2025-01-01T00:00:00.000Z"),
        validUntil: new Date("2025-12-31T23:59:59.000Z"),
        discountInCents: null,
        discountPercentage: 10,
      }),
      incrementRedemptionCount: async () => undefined,
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      customerId: CUSTOMER_ID,
      items: [{ lotId: LOT_ID, quantity: 1 }],
      couponCode: "EXPIRED10",
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: {
      reason: "invalid_coupon",
    },
  });
});

test("UX-002 RED: tracks use-case success metrics without sensitive data", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const telemetryCalls: Array<Record<string, unknown>> = [];

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "General",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 100,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-ux-002-success",
    orderRepository: {
      create: async () => ({ id: "order-ux-002-success" }),
    },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => null,
      incrementRedemptionCount: async () => undefined,
    },
    observability: {
      trackCreateOrderExecution: async (entry) => {
        telemetryCalls.push(entry);
      },
    },
  });

  await useCase({
    eventId: EVENT_ID,
    customerId: CUSTOMER_ID,
    items: [{ lotId: LOT_ID, quantity: 1 }],
  });

  expect(telemetryCalls).toHaveLength(1);
  expect(telemetryCalls[0]).toMatchObject({
    event: "checkout.create_order.use_case",
    outcome: "success",
    errorCode: null,
    eventId: EVENT_ID,
    itemsCount: 1,
    couponApplied: false,
  });
  expect(telemetryCalls[0]).not.toHaveProperty("customerId");
});

test("UX-002 RED: tracks use-case failures with categorized error", async () => {
  const createCreateOrderUseCase = await loadCreateOrderFactory();

  const telemetryCalls: Array<Record<string, unknown>> = [];

  const lot: LotData = {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "General",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 1,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active",
  };

  const useCase = createCreateOrderUseCase({
    now: () => FIXED_NOW,
    generateOrderId: () => "order-ux-002-failure",
    orderRepository: {
      create: async () => ({ id: "order-ux-002-failure" }),
    },
    lotRepository: makeLotRepository(lot),
    couponRepository: {
      findByCodeForEvent: async () => null,
      incrementRedemptionCount: async () => undefined,
    },
    observability: {
      trackCreateOrderExecution: async (entry) => {
        telemetryCalls.push(entry);
      },
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      customerId: CUSTOMER_ID,
      items: [{ lotId: LOT_ID, quantity: 2 }],
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: {
      reason: "insufficient_stock",
    },
  });

  expect(telemetryCalls).toHaveLength(1);
  expect(telemetryCalls[0]).toMatchObject({
    event: "checkout.create_order.use_case",
    outcome: "failure",
    errorCode: "conflict",
    errorReason: "insufficient_stock",
    eventId: EVENT_ID,
    itemsCount: 1,
    couponApplied: false,
  });
});
