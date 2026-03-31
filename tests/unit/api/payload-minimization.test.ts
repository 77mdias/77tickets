import { describe, expect, test } from "vitest";

import { createListPublishedEventsUseCase } from "@/server/application/use-cases/list-published-events.use-case";
import { createGetCustomerOrdersUseCase } from "@/server/application/use-cases/get-customer-orders.use-case";

// ── Helpers ──────────────────────────────────────────────────────────────────

const baseEvent = {
  id: "evt-1",
  slug: "test-event",
  title: "Test Event",
  description: "SHOULD NOT APPEAR IN LIST",
  location: "São Paulo",
  imageUrl: null,
  startsAt: new Date("2026-06-01T18:00:00Z"),
  endsAt: null,
  status: "published" as const,
  organizerId: "org-1",
};

const baseOrder = {
  id: "ord-1",
  customerId: "cust-1",
  eventId: "evt-1",
  status: "paid" as const,
  subtotalInCents: 10000,
  discountInCents: 0,
  totalInCents: 10000,
  createdAt: new Date("2026-05-01T10:00:00Z"),
};

const baseOrderItem = {
  lotId: "lot-1",
  quantity: 2,
  unitPriceInCents: 5000,
};

const baseTicket = {
  id: "tkt-1",
  code: "TOKEN-ABC",
  status: "active" as const,
  eventId: "evt-1",
  orderId: "ord-1",
  checkedInAt: null,
};

// ── list-published-events ─────────────────────────────────────────────────────

describe("payload minimization: list-published-events", () => {
  const makeMockRepo = () => ({
    listPublished: async () => [baseEvent],
  });

  test("does not include description in list items", async () => {
    const useCase = createListPublishedEventsUseCase({
      eventRepository: makeMockRepo(),
    });
    const result = await useCase({});
    expect(result.events[0]).not.toHaveProperty("description");
  });

  test("does not include organizerId in list items", async () => {
    const useCase = createListPublishedEventsUseCase({
      eventRepository: makeMockRepo(),
    });
    const result = await useCase({});
    expect(result.events[0]).not.toHaveProperty("organizerId");
  });

  test("does not include status in list items", async () => {
    const useCase = createListPublishedEventsUseCase({
      eventRepository: makeMockRepo(),
    });
    const result = await useCase({});
    expect(result.events[0]).not.toHaveProperty("status");
  });

  test("does not include endsAt in list items", async () => {
    const useCase = createListPublishedEventsUseCase({
      eventRepository: makeMockRepo(),
    });
    const result = await useCase({});
    expect(result.events[0]).not.toHaveProperty("endsAt");
  });

  test("includes exactly the allowed list fields", async () => {
    const useCase = createListPublishedEventsUseCase({
      eventRepository: makeMockRepo(),
    });
    const result = await useCase({});
    const item = result.events[0];

    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("slug");
    expect(item).toHaveProperty("title");
    expect(item).toHaveProperty("startsAt");
    expect(item).toHaveProperty("imageUrl");
    expect(item).toHaveProperty("location");
    expect(Object.keys(item)).toHaveLength(6);
  });

  test("description value from repo does not leak into output", async () => {
    const useCase = createListPublishedEventsUseCase({
      eventRepository: makeMockRepo(),
    });
    const result = await useCase({});
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("SHOULD NOT APPEAR IN LIST");
  });
});

// ── get-customer-orders ───────────────────────────────────────────────────────

describe("payload minimization: get-customer-orders", () => {
  const makeDeps = () => ({
    orderRepository: {
      listByCustomerId: async () => [
        { order: baseOrder, items: [baseOrderItem] },
      ],
    },
    ticketRepository: {
      listByCustomerId: async () => [baseTicket],
    },
  });

  test("does not include internal order fields like couponId", async () => {
    const useCase = createGetCustomerOrdersUseCase(makeDeps());
    const result = await useCase({ customerId: "cust-1" });
    const order = result.orders[0];
    expect(order).not.toHaveProperty("couponId");
    expect(order).not.toHaveProperty("paymentIntentId");
  });

  test("includes required order summary fields", async () => {
    const useCase = createGetCustomerOrdersUseCase(makeDeps());
    const result = await useCase({ customerId: "cust-1" });
    const order = result.orders[0];
    expect(order).toHaveProperty("id");
    expect(order).toHaveProperty("eventId");
    expect(order).toHaveProperty("status");
    expect(order).toHaveProperty("totalInCents");
    expect(order).toHaveProperty("createdAt");
  });

  test("ticket summary uses token alias, not raw internal code field name", async () => {
    const useCase = createGetCustomerOrdersUseCase(makeDeps());
    const result = await useCase({ customerId: "cust-1" });
    const ticket = result.orders[0].tickets[0];
    // The use-case maps `code` → `token` to keep the field name customer-facing
    expect(ticket).toHaveProperty("token");
    expect(ticket).not.toHaveProperty("code");
  });

  test("ticket summary does not include admin-only fields", async () => {
    const useCase = createGetCustomerOrdersUseCase(makeDeps());
    const result = await useCase({ customerId: "cust-1" });
    const ticket = result.orders[0].tickets[0];
    // These would be admin-only fields that must not appear
    expect(ticket).not.toHaveProperty("lotId");
    expect(ticket).not.toHaveProperty("issuedAt");
  });

  test("order items contain only pricing and quantity fields, not admin internals", async () => {
    const useCase = createGetCustomerOrdersUseCase(makeDeps());
    const result = await useCase({ customerId: "cust-1" });
    const item = result.orders[0].items[0];
    expect(item).toHaveProperty("lotId");
    expect(item).toHaveProperty("quantity");
    expect(item).toHaveProperty("unitPriceInCents");
    // No admin-only overrides or internal tracking fields
    expect(item).not.toHaveProperty("orderId");
    expect(item).not.toHaveProperty("id");
  });

  test("orders only belong to the requested customer", async () => {
    // This verifies the use-case passes the right customerId to the repository
    let capturedId: string | undefined;
    const deps = {
      orderRepository: {
        listByCustomerId: async (id: string) => {
          capturedId = id;
          return [];
        },
      },
      ticketRepository: {
        listByCustomerId: async () => [],
      },
    };
    const useCase = createGetCustomerOrdersUseCase(deps);
    await useCase({ customerId: "cust-42" });
    expect(capturedId).toBe("cust-42");
  });
});
