import { describe, expect, test } from "vitest";

import { createCreateOrderHandler } from "../../../../src/server/api/create-order.handler";
import type { SecurityActor } from "../../../../src/server/application/security";
import { createCreateOrderUseCase } from "../../../../src/server/application/use-cases/create-order.use-case";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "../../../../src/server/repositories/drizzle";
import { createEventFixture, createLotFixture } from "../../../fixtures";
import { cleanDatabase, createTestDb } from "../../setup";

const FIXED_NOW = new Date("2026-03-28T12:00:00.000Z");
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORDER_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const CUSTOMER_A = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const CUSTOMER_B = "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("create order auth integration", () => {
  const db = createTestDb();

  const createHandler = () => {
    const useCase = createCreateOrderUseCase({
      now: () => FIXED_NOW,
      generateOrderId: () => ORDER_ID,
      generateTicketCode: (() => {
        let ticketIndex = 0;

        return () => {
          ticketIndex += 1;
          return `TKT-API-004-${ticketIndex.toString().padStart(3, "0")}`;
        };
      })(),
      orderRepository: new DrizzleOrderRepository(db),
      lotRepository: new DrizzleLotRepository(db),
      couponRepository: new DrizzleCouponRepository(db),
    });

    return createCreateOrderHandler({
      createOrder: useCase,
    });
  };

  test("blocks customer when trying to create order for another customer", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      id: EVENT_ID,
      status: "published",
    });
    const lot = await createLotFixture(db, event.id, {
      availableQuantity: 5,
      maxPerOrder: 5,
      priceInCents: 10000,
    });

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("customer", CUSTOMER_A),
      body: {
        eventId: event.id,
        customerId: CUSTOMER_B,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });

  test("blocks organizer and checker from creating orders", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      status: "published",
    });
    const lot = await createLotFixture(db, event.id, {
      availableQuantity: 5,
      maxPerOrder: 5,
      priceInCents: 10000,
    });

    const handler = createHandler();

    const organizerResponse = await handler({
      actor: buildActor("organizer", "00000000-0000-0000-0000-000000000010"),
      body: {
        eventId: event.id,
        customerId: CUSTOMER_A,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    const checkerResponse = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: {
        eventId: event.id,
        customerId: CUSTOMER_A,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    expect(organizerResponse.status).toBe(403);
    expect(organizerResponse.body.error.code).toBe("authorization");
    expect(checkerResponse.status).toBe(403);
    expect(checkerResponse.body.error.code).toBe("authorization");
  });

  test("allows admin to create order for another customer", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      status: "published",
    });
    const lot = await createLotFixture(db, event.id, {
      availableQuantity: 5,
      maxPerOrder: 5,
      priceInCents: 10000,
    });

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: {
        eventId: event.id,
        customerId: CUSTOMER_B,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });

    expect(response.status).toBe(200);

    if (response.status !== 200) {
      return;
    }

    expect(response.body.data.customerId).toBe(CUSTOMER_B);
  });
});
