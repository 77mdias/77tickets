import { expect, test, vi } from "vitest";

const CUSTOMER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORDER_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";

test("ORD-006 RED: returns customer orders with items and ticket tokens", async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/get-customer-orders.use-case"
  );

  const createGetCustomerOrdersUseCase = useCaseModule.createGetCustomerOrdersUseCase;

  const listByCustomerIdOrders = vi.fn(async () => [
    {
      order: {
        id: ORDER_ID,
        customerId: CUSTOMER_ID,
        eventId: EVENT_ID,
        status: "pending" as const,
        subtotalInCents: 20000,
        discountInCents: 0,
        totalInCents: 20000,
        createdAt: new Date("2099-05-10T10:00:00.000Z"),
      },
      items: [
        {
          lotId: "00000000-0000-0000-0000-000000000100",
          quantity: 2,
          unitPriceInCents: 10000,
        },
      ],
    },
  ]);

  const listByCustomerIdTickets = vi.fn(async () => [
    {
      id: "00000000-0000-0000-0000-000000000200",
      eventId: EVENT_ID,
      orderId: ORDER_ID,
      lotId: "00000000-0000-0000-0000-000000000100",
      code: "TKT-CUSTOMER-001",
      status: "active" as const,
      checkedInAt: null,
    },
  ]);

  const useCase = createGetCustomerOrdersUseCase({
    orderRepository: { listByCustomerId: listByCustomerIdOrders },
    ticketRepository: { listByCustomerId: listByCustomerIdTickets },
  });

  const result = await useCase({ customerId: CUSTOMER_ID });

  expect(listByCustomerIdOrders).toHaveBeenCalledWith(CUSTOMER_ID);
  expect(listByCustomerIdTickets).toHaveBeenCalledWith(CUSTOMER_ID);
  expect(result).toEqual({
    orders: [
      {
        id: ORDER_ID,
        eventId: EVENT_ID,
        status: "pending",
        subtotalInCents: 20000,
        discountInCents: 0,
        totalInCents: 20000,
        createdAt: new Date("2099-05-10T10:00:00.000Z"),
        items: [
          {
            lotId: "00000000-0000-0000-0000-000000000100",
            quantity: 2,
            unitPriceInCents: 10000,
          },
        ],
        tickets: [
          {
            id: "00000000-0000-0000-0000-000000000200",
            token: "TKT-CUSTOMER-001",
            status: "active",
            eventId: EVENT_ID,
            orderId: ORDER_ID,
            checkedInAt: null,
          },
        ],
      },
    ],
  });
});

test("ORD-006 RED: keeps orders isolated and does not attach tickets from other orders", async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/get-customer-orders.use-case"
  );

  const createGetCustomerOrdersUseCase = useCaseModule.createGetCustomerOrdersUseCase;

  const useCase = createGetCustomerOrdersUseCase({
    orderRepository: {
      listByCustomerId: vi.fn(async () => [
        {
          order: {
            id: ORDER_ID,
            customerId: CUSTOMER_ID,
            eventId: EVENT_ID,
            status: "paid" as const,
            subtotalInCents: 10000,
            discountInCents: 0,
            totalInCents: 10000,
            createdAt: new Date("2099-05-10T10:00:00.000Z"),
          },
          items: [],
        },
      ]),
    },
    ticketRepository: {
      listByCustomerId: vi.fn(async () => [
        {
          id: "00000000-0000-0000-0000-000000000201",
          eventId: EVENT_ID,
          orderId: "00000000-0000-0000-0000-000000000999",
          lotId: "00000000-0000-0000-0000-000000000100",
          code: "TKT-OTHER-ORDER",
          status: "active" as const,
          checkedInAt: null,
        },
      ]),
    },
  });

  const result = await useCase({ customerId: CUSTOMER_ID });

  expect(result.orders[0].tickets).toEqual([]);
});
