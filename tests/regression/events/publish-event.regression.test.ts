import { describe, expect, test, vi } from "vitest";

import { createPublishEventUseCase } from "@/server/application/use-cases/publish-event.use-case";

type EventStatus = "draft" | "published" | "cancelled";
type LotStatus = "active" | "paused" | "sold_out" | "closed";

type LotRecord = {
  id: string;
  eventId: string;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  availableQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  status: LotStatus;
};

type EventRecord = {
  id: string;
  organizerId: string;
  slug: string;
  title: string;
  status: EventStatus;
  startsAt: Date;
  endsAt: Date | null;
};

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

const DEFAULT_LOT: LotRecord = {
  id: "lot-001",
  eventId: EVENT_ID,
  title: "General",
  priceInCents: 5000,
  totalQuantity: 100,
  availableQuantity: 100,
  maxPerOrder: 4,
  saleStartsAt: new Date("2026-04-01T00:00:00.000Z"),
  saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
  status: "active",
};

function makeDependencies(options?: {
  eventStatus?: EventStatus;
  lots?: LotRecord[];
  endsAt?: Date | null;
}) {
  const eventStatus = options?.eventStatus ?? "draft";
  const lots = options?.lots ?? [DEFAULT_LOT];
  const endsAt = options?.endsAt !== undefined ? options.endsAt : null;

  const save = vi.fn(async () => undefined);

  return {
    organizerId: ORGANIZER_ID,
    eventRepository: {
      findById: vi.fn(async () => ({
        id: EVENT_ID,
        organizerId: ORGANIZER_ID,
        slug: "test-event",
        title: "Test Event",
        status: eventStatus,
        startsAt: new Date("2026-05-01T10:00:00.000Z"),
        endsAt,
      })),
      save,
    },
    lotRepository: {
      findByEventId: vi.fn(async () => lots),
    },
  };
}

// ---------------------------------------------------------------------------
// Group 1: Cancelled event protection
// ---------------------------------------------------------------------------

describe("EVT-004 regression: cancelled event protection", () => {
  test("EVT-004: blocks publish of cancelled event even when lots are valid", async () => {
    const deps = makeDependencies({ eventStatus: "cancelled" });
    const publishEvent = createPublishEventUseCase(deps);

    await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "event_cancelled" },
    });
    expect(deps.eventRepository.save).not.toHaveBeenCalled();
  });

  test("EVT-004: cancelled event is blocked before lot validation", async () => {
    const deps = makeDependencies({ eventStatus: "cancelled", lots: [] });
    const publishEvent = createPublishEventUseCase(deps);

    // Must throw event_cancelled, not no_lots — the cancellation guard fires before lot queries
    await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "event_cancelled" },
    });
    expect(deps.eventRepository.save).not.toHaveBeenCalled();
  });

  test("EVT-004: cancelled event produces event_cancelled not no_sale_window", async () => {
    const deps = makeDependencies({
      eventStatus: "cancelled",
      lots: [{ ...DEFAULT_LOT, saleStartsAt: null }],
    });
    const publishEvent = createPublishEventUseCase(deps);

    // Cancellation check must remain independent of lot configuration
    await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "event_cancelled" },
    });
    expect(deps.eventRepository.save).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Group 2: Status transition guard
// ---------------------------------------------------------------------------

describe("EVT-004 regression: status transition guard", () => {
  test("EVT-004: blocks republication of an already published event", async () => {
    const deps = makeDependencies({ eventStatus: "published" });
    const publishEvent = createPublishEventUseCase(deps);

    await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "event_already_published" },
    });
    expect(deps.eventRepository.save).not.toHaveBeenCalled();
  });

  test("EVT-004: draft is the only allowed source status for publish — full matrix", async () => {
    // draft → published: allowed
    const draftDeps = makeDependencies({ eventStatus: "draft" });
    const draftResult = await createPublishEventUseCase(draftDeps)({ eventId: EVENT_ID });
    expect(draftResult).toMatchObject({ status: "published" });

    // published → published: blocked
    const publishedDeps = makeDependencies({ eventStatus: "published" });
    await expect(
      createPublishEventUseCase(publishedDeps)({ eventId: EVENT_ID }),
    ).rejects.toMatchObject({ details: { reason: "event_already_published" } });

    // cancelled → published: blocked
    const cancelledDeps = makeDependencies({ eventStatus: "cancelled" });
    await expect(
      createPublishEventUseCase(cancelledDeps)({ eventId: EVENT_ID }),
    ).rejects.toMatchObject({ details: { reason: "event_cancelled" } });
  });
});

// ---------------------------------------------------------------------------
// Group 3: Idempotency — double publish
// ---------------------------------------------------------------------------

describe("EVT-004 regression: idempotency — double publish", () => {
  test("EVT-004: second publish attempt returns stable event_already_published error", async () => {
    let storedStatus: EventStatus = "draft";

    const save = vi.fn(async (event: EventRecord) => {
      storedStatus = event.status;
    });

    const deps = {
      organizerId: ORGANIZER_ID,
      eventRepository: {
        findById: vi.fn(async () => ({
          id: EVENT_ID,
          organizerId: ORGANIZER_ID,
          slug: "test-event",
          title: "Test Event",
          status: storedStatus, // closure: reads current storedStatus on each call
          startsAt: new Date("2026-05-01T10:00:00.000Z"),
          endsAt: null,
        })),
        save,
      },
      lotRepository: {
        findByEventId: vi.fn(async () => [DEFAULT_LOT]),
      },
    };

    const publishEvent = createPublishEventUseCase(deps);

    // First call succeeds and persists status=published
    const firstResult = await publishEvent({ eventId: EVENT_ID });
    expect(firstResult).toEqual({ eventId: EVENT_ID, status: "published" });
    expect(save).toHaveBeenCalledTimes(1);

    // Second call reads the updated storedStatus and must reject
    await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "event_already_published" },
    });
    expect(save).toHaveBeenCalledTimes(1); // no additional save
  });
});

// ---------------------------------------------------------------------------
// Group 4: Persistence fidelity
// ---------------------------------------------------------------------------

describe("EVT-004 regression: persistence fidelity", () => {
  test("EVT-004: save is called with exactly the original event fields plus status=published", async () => {
    const deps = makeDependencies();
    const publishEvent = createPublishEventUseCase(deps);

    await publishEvent({ eventId: EVENT_ID });

    expect(deps.eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EVENT_ID,
        organizerId: ORGANIZER_ID,
        slug: "test-event",
        title: "Test Event",
        startsAt: new Date("2026-05-01T10:00:00.000Z"),
        endsAt: null,
        status: "published",
      }),
    );
  });

  test("EVT-004: event with null endsAt preserves null in save call", async () => {
    const deps = makeDependencies({ endsAt: null });
    const publishEvent = createPublishEventUseCase(deps);

    await publishEvent({ eventId: EVENT_ID });

    expect(deps.eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: null }),
    );
  });

  test("EVT-004: event with defined endsAt preserves the exact date in save call", async () => {
    const endsAt = new Date("2026-12-31T23:00:00.000Z");
    const deps = makeDependencies({ endsAt });
    const publishEvent = createPublishEventUseCase(deps);

    await publishEvent({ eventId: EVENT_ID });

    expect(deps.eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt }),
    );
  });
});
