import { describe, expect, test } from "vitest";

import { createCreateCouponHandler } from "../../../../src/server/api/coupons/create-coupon.handler";
import { createUpdateCouponHandler } from "../../../../src/server/api/coupons/update-coupon.handler";
import type { SecurityActor } from "../../../../src/server/application/security";
import {
  createCreateCouponUseCase,
  createUpdateCouponUseCase,
} from "../../../../src/server/application/use-cases";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
} from "../../../../src/server/repositories/drizzle";
import { createCouponFixture, createEventFixture } from "../../../fixtures";
import { cleanDatabase, createTestDb } from "../../setup";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const COUPON_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const ORGANIZER_A = "00000000-0000-0000-0000-000000000001";
const ORGANIZER_B = "00000000-0000-0000-0000-000000000002";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("coupon governance auth integration", () => {
  const db = createTestDb();

  const createCreateHandler = () => {
    const couponRepository = new DrizzleCouponRepository(db);
    const eventRepository = new DrizzleEventRepository(db);

    const createCoupon = createCreateCouponUseCase({
      couponRepository,
    });

    return createCreateCouponHandler({
      eventRepository,
      createCoupon,
    });
  };

  const createUpdateHandler = () => {
    const couponRepository = new DrizzleCouponRepository(db);
    const eventRepository = new DrizzleEventRepository(db);

    const updateCoupon = createUpdateCouponUseCase({
      couponRepository,
    });

    return createUpdateCouponHandler({
      couponRepository,
      eventRepository,
      updateCoupon,
    });
  };

  test("blocks organizer when creating coupon for another organizer event", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      id: EVENT_ID,
      organizerId: ORGANIZER_A,
      status: "published",
    });

    const handler = createCreateHandler();

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: {
        eventId: event.id,
        code: "SAVE20",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        validFrom: "2026-06-01T00:00:00.000Z",
        validUntil: "2026-06-30T23:59:59.000Z",
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });

  test("allows admin to create coupon globally and persists normalized code", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      status: "published",
    });

    const handler = createCreateHandler();

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: {
        eventId: event.id,
        code: " save20 ",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        validFrom: "2026-06-01T00:00:00.000Z",
        validUntil: "2026-06-30T23:59:59.000Z",
      },
    });

    expect(response.status).toBe(200);

    if (response.status !== 200) return;

    expect(response.body.data).toMatchObject({
      eventId: event.id,
      code: "SAVE20",
      discountType: "percentage",
      maxRedemptions: 100,
    });

    const persisted = await new DrizzleCouponRepository(db).findByCodeForEvent("SAVE20", event.id);
    expect(persisted).not.toBeNull();
  });

  test("blocks organizer when updating coupon from another organizer event", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      organizerId: ORGANIZER_A,
      status: "published",
    });

    const coupon = await createCouponFixture(db, event.id, {
      id: COUPON_ID,
      code: "SAVE10",
      validFrom: new Date("2026-06-01T00:00:00.000Z"),
      validUntil: new Date("2026-06-30T23:59:59.000Z"),
    });

    const handler = createUpdateHandler();

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: {
        couponId: coupon.id,
        code: "SAVE20",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        validFrom: "2026-06-01T00:00:00.000Z",
        validUntil: "2026-06-30T23:59:59.000Z",
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });

  test("rejects invalid coupon window with conflict reason", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      status: "published",
    });

    const handler = createCreateHandler();

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: {
        eventId: event.id,
        code: "SAVE20",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        validFrom: "2026-06-30T23:59:59.000Z",
        validUntil: "2026-06-01T00:00:00.000Z",
      },
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "conflict",
      details: { reason: "invalid_coupon_window" },
    });
  });
});

