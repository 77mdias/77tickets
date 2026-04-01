import { describe, expect, test, vi } from "vitest";

import { createListEventOrdersHandler } from "../../../../src/server/api/orders/list-event-orders.handler";
import { createListEventOrdersUseCase } from "../../../../src/server/application/use-cases/list-event-orders.use-case";
import type { SecurityActor } from "../../../../src/server/application/security";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_A = "00000000-0000-0000-0000-000000000001";
const ORGANIZER_B = "00000000-0000-0000-0000-000000000002";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

const createEventRepository = (organizerId: string | null = ORGANIZER_A) => ({
  findById: vi.fn(async () => {
    if (organizerId === null) {
      return null;
    }

    return {
      id: EVENT_ID,
      organizerId,
      slug: "list-orders-auth-event",
      title: "List Orders Auth Event",
      status: "published" as const,
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: null,
    };
  }),
  findBySlug: vi.fn(async () => null),
});

const createOrderRepository = () => ({
  listByEventId: vi.fn(async () => []),
});

describe("list-event-orders auth integration", () => {
  test("blocks customer role", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const orderRepository = createOrderRepository();

    const useCase = createListEventOrdersUseCase({
      eventRepository,
      orderRepository,
    });

    const handler = createListEventOrdersHandler({ listEventOrders: useCase });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      params: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(orderRepository.listByEventId).not.toHaveBeenCalled();
  });

  test("blocks checker role", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const orderRepository = createOrderRepository();

    const useCase = createListEventOrdersUseCase({
      eventRepository,
      orderRepository,
    });

    const handler = createListEventOrdersHandler({ listEventOrders: useCase });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      params: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(orderRepository.listByEventId).not.toHaveBeenCalled();
  });

  test("blocks organizer outside ownership scope", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const orderRepository = createOrderRepository();

    const useCase = createListEventOrdersUseCase({
      eventRepository,
      orderRepository,
    });

    const handler = createListEventOrdersHandler({ listEventOrders: useCase });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      params: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(orderRepository.listByEventId).not.toHaveBeenCalled();
  });

  test("allows organizer within ownership scope", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const orderRepository = createOrderRepository();

    const useCase = createListEventOrdersUseCase({
      eventRepository,
      orderRepository,
    });

    const handler = createListEventOrdersHandler({ listEventOrders: useCase });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      params: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(orderRepository.listByEventId).toHaveBeenCalledWith(EVENT_ID);
  });

  test("allows admin globally", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const orderRepository = createOrderRepository();

    const useCase = createListEventOrdersUseCase({
      eventRepository,
      orderRepository,
    });

    const handler = createListEventOrdersHandler({ listEventOrders: useCase });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      params: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(orderRepository.listByEventId).toHaveBeenCalledWith(EVENT_ID);
  });
});
