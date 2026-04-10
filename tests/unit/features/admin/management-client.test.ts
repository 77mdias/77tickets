import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  buildCreateEventPayload,
  buildCreateLotPayload,
  buildCreateCouponPayload,
  buildListEventOrdersQuery,
  buildManagementActorHeaders,
  buildPublishEventPayload,
  buildUpdateLotPayload,
  buildUpdateCouponPayload,
  buildUpdateEventStatusPayload,
  extractManagementErrorMessage,
  postManagementOperation,
} from "../../../../src/features/admin/management-client";
import * as apiClient from "../../../../src/lib/api-client";

vi.mock("../../../../src/lib/api-client");

const toExpectedIso = (value: string): string => new Date(value).toISOString();

describe("buildManagementActorHeaders", () => {
  test("builds actor headers with trimmed actor id", () => {
    const headers = buildManagementActorHeaders({
      actorId: " 00000000-0000-0000-0000-000000000099 ",
      role: "admin",
    });

    expect(headers).toEqual({
      "content-type": "application/json",
      "x-actor-id": "00000000-0000-0000-0000-000000000099",
      "x-actor-role": "admin",
    });
  });
});

describe("build event payloads", () => {
  test("builds publish payload with trimmed event id", () => {
    expect(
      buildPublishEventPayload({
        eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
      }),
    ).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    });
  });

  test("builds update-status payload with explicit target status", () => {
    expect(
      buildUpdateEventStatusPayload({
        eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
        targetStatus: "cancelled",
      }),
    ).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      targetStatus: "cancelled",
    });
  });

  test("builds create event payload with trimmed values and normalized dates", () => {
    expect(
      buildCreateEventPayload({
        title: " Summer Fest ",
        description: "  Annual fundraiser  ",
        location: "  Main Hall  ",
        imageUrl: "  https://example.com/poster.png  ",
        startsAt: "2027-06-01T10:00",
        endsAt: "2027-06-01T20:00",
      }),
    ).toEqual({
      title: "Summer Fest",
      description: "Annual fundraiser",
      location: "Main Hall",
      imageUrl: "https://example.com/poster.png",
      startsAt: toExpectedIso("2027-06-01T10:00"),
      endsAt: toExpectedIso("2027-06-01T20:00"),
    });
  });
});

describe("build lot payloads", () => {
  test("builds create lot payload with trimmed values and nullable end date", () => {
    expect(
      buildCreateLotPayload({
        eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
        title: " VIP ",
        priceInCents: " 15000 ",
        totalQuantity: " 250 ",
        maxPerOrder: " 4 ",
        saleStartsAt: "2027-06-01T10:00",
        saleEndsAt: " ",
        status: "active",
      }),
    ).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      title: "VIP",
      priceInCents: 15000,
      totalQuantity: 250,
      maxPerOrder: 4,
      saleStartsAt: toExpectedIso("2027-06-01T10:00"),
      saleEndsAt: null,
      status: "active",
    });
  });

  test("builds update lot payload with trimmed values and preserved lot id", () => {
    expect(
      buildUpdateLotPayload({
        lotId: " 6c7ac8b8-4a86-4d9c-b1a8-4da5cb5f1ce2 ",
        title: " General Admission ",
        priceInCents: " 8000 ",
        totalQuantity: " 100 ",
        maxPerOrder: " 2 ",
        saleStartsAt: "2027-06-01T12:00",
        saleEndsAt: "2027-06-01T18:00",
        status: "paused",
      }),
    ).toEqual({
      lotId: "6c7ac8b8-4a86-4d9c-b1a8-4da5cb5f1ce2",
      title: "General Admission",
      priceInCents: 8000,
      totalQuantity: 100,
      maxPerOrder: 2,
      saleStartsAt: toExpectedIso("2027-06-01T12:00"),
      saleEndsAt: toExpectedIso("2027-06-01T18:00"),
      status: "paused",
    });
  });
});

describe("build list orders query", () => {
  test("omits empty status", () => {
    expect(
      buildListEventOrdersQuery({
        status: " ",
      }),
    ).toEqual({});
  });

  test("includes status when provided", () => {
    expect(
      buildListEventOrdersQuery({
        status: "paid",
      }),
    ).toEqual({
      status: "paid",
    });
  });
});

describe("build coupon payloads", () => {
  test("builds create coupon payload for fixed discounts", () => {
    const payload = buildCreateCouponPayload({
      eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
      code: " SAVE20 ",
      discountType: "fixed",
      discountInCents: "1500",
      discountPercentage: "",
      maxRedemptions: "100",
      validFrom: "2026-06-01T00:00",
      validUntil: "2026-06-30T23:59",
    });

    expect(payload).toMatchObject({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      code: "SAVE20",
      discountType: "fixed",
      discountInCents: 1500,
      discountPercentage: null,
      maxRedemptions: 100,
    });
  });

  test("builds update coupon payload for percentage discounts", () => {
    const payload = buildUpdateCouponPayload({
      couponId: " 4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e ",
      code: " SAVE10 ",
      discountType: "percentage",
      discountInCents: "",
      discountPercentage: "20",
      maxRedemptions: "50",
      validFrom: "2026-06-01T00:00",
      validUntil: "2026-06-30T23:59",
    });

    expect(payload).toMatchObject({
      couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
      code: "SAVE10",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 50,
    });
  });
});

describe("extractManagementErrorMessage", () => {
  test("returns backend error message when present", () => {
    const message = extractManagementErrorMessage({
      error: {
        code: "conflict",
        message: "Publish conflict",
      },
    });

    expect(message).toBe("Publish conflict");
  });

  test("returns fallback for malformed payload", () => {
    expect(extractManagementErrorMessage(null)).toBe(
      "Could not complete administrative operation. Please review your input and try again.",
    );
  });
});

describe("postManagementOperation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("sends PUT requests with a JSON body", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValue({ lotId: "lot-1" });

    const result = await postManagementOperation({
      endpoint: "/api/lots/lot-1",
      actor: {
        actorId: " 00000000-0000-0000-0000-000000000099 ",
        role: "admin",
      },
      method: "PUT",
      payload: { lotId: "lot-1" },
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith("/api/lots/lot-1", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-actor-id": "00000000-0000-0000-0000-000000000099",
        "x-actor-role": "admin",
      },
      body: JSON.stringify({ lotId: "lot-1" }),
    });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ lotId: "lot-1" });
  });

  test("sends GET requests with query parameters and no body", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValue({ orders: [] });

    const result = await postManagementOperation({
      endpoint: "/api/events/2f180791-a8f5-4cf8-b703-0f220a44f7c8/orders",
      actor: {
        actorId: "00000000-0000-0000-0000-000000000099",
        role: "organizer",
      },
      method: "GET",
      query: buildListEventOrdersQuery({
        status: "paid",
      }),
    });

    expect(apiClient.apiFetch).toHaveBeenCalledTimes(1);
    expect(apiClient.apiFetch).toHaveBeenCalledWith(
      "/api/events/2f180791-a8f5-4cf8-b703-0f220a44f7c8/orders?status=paid",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ orders: [] });
  });
});
