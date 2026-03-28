import { describe, expect, test } from "vitest";

import { createCreateOrderHandler } from "../../../../src/server/api/create-order.handler";
import type { SecurityActor } from "../../../../src/server/application/security";
import { createCreateOrderUseCase } from "../../../../src/server/application/use-cases/create-order.use-case";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "../../../../src/server/repositories/drizzle";
import { createCouponFixture, createEventFixture, createLotFixture } from "../../../fixtures";
import { cleanDatabase, createTestDb } from "../../setup";

const FIXED_NOW = new Date("2026-03-28T12:00:00.000Z");
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const CUSTOMER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const ORDER_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const CUSTOMER_ACTOR: SecurityActor = {
  role: "customer",
  userId: CUSTOMER_ID,
};

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "create order endpoint integration",
  () => {
    const db = createTestDb();

    const createHandler = () => {
      const useCase = createCreateOrderUseCase({
        now: () => FIXED_NOW,
        generateOrderId: () => ORDER_ID,
        generateTicketCode: (() => {
          let ticketIndex = 0;

          return () => {
            ticketIndex += 1;
            return `TKT-API-003-${ticketIndex.toString().padStart(3, "0")}`;
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

    test("returns 200 and stable payload for a valid checkout request", async () => {
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
      await createCouponFixture(db, event.id, {
        code: "SAVE20",
        discountPercentage: 20,
        discountInCents: null,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: new Date("2026-12-31T23:59:59.000Z"),
      });

      const handler = createHandler();
      const response = await handler({
        actor: CUSTOMER_ACTOR,
        body: {
          eventId: event.id,
          customerId: CUSTOMER_ID,
          items: [{ lotId: lot.id, quantity: 2 }],
          couponCode: "SAVE20",
        },
      });

      expect(response.status).toBe(200);

      if (response.status !== 200) {
        return;
      }

      expect(response.body.data).not.toBeInstanceOf(Promise);
      expect(response.body.data).toMatchObject({
        orderId: ORDER_ID,
        eventId: event.id,
        customerId: CUSTOMER_ID,
        status: "pending",
        subtotalInCents: 20000,
        discountInCents: 4000,
        totalInCents: 16000,
        items: [{ lotId: lot.id, quantity: 2, unitPriceInCents: 10000 }],
      });
    });

    test("returns 409 conflict with structured reason when stock is insufficient", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, {
        status: "published",
      });
      const lot = await createLotFixture(db, event.id, {
        availableQuantity: 1,
      });

      const handler = createHandler();
      const response = await handler({
        actor: CUSTOMER_ACTOR,
        body: {
          eventId: event.id,
          customerId: CUSTOMER_ID,
          items: [{ lotId: lot.id, quantity: 2 }],
        },
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({
        code: "conflict",
        message: "Create order conflict",
        details: {
          reason: "insufficient_stock",
        },
      });
    });

    test("returns 409 conflict with structured reason when coupon is invalid", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, {
        status: "published",
      });
      const lot = await createLotFixture(db, event.id, {
        availableQuantity: 3,
      });

      const handler = createHandler();
      const response = await handler({
        actor: CUSTOMER_ACTOR,
        body: {
          eventId: event.id,
          customerId: CUSTOMER_ID,
          items: [{ lotId: lot.id, quantity: 1 }],
          couponCode: "INVALID10",
        },
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({
        code: "conflict",
        message: "Create order conflict",
        details: {
          reason: "invalid_coupon",
        },
      });
    });

    test("returns 400 validation error for invalid request payload", async () => {
      await cleanDatabase(db);

      const handler = createHandler();
      const response = await handler({
        actor: CUSTOMER_ACTOR,
        body: {
          eventId: "invalid-uuid",
          customerId: "invalid-uuid",
          items: [],
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("validation");
      expect(response.body.error.message).toBe("Invalid request payload");
      expect(response.body.error.details).toMatchObject({
        issues: expect.any(Array),
      });
    });
  },
);
