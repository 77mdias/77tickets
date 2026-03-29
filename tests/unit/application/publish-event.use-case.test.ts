import { expect, test, vi } from "vitest";

import type { PublishEventResult } from "../../../src/server/application/events";

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

type PublishEventUseCaseFactory = (dependencies: {
  organizerId: string;
  eventRepository: {
    findById: (eventId: string) => Promise<EventRecord | null>;
    save: (event: EventRecord) => Promise<void>;
  };
  lotRepository: {
    findByEventId: (eventId: string) => Promise<LotRecord[]>;
  };
}) => (input: { eventId: string }) => Promise<PublishEventResult>;

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";

async function loadPublishEventFactory(): Promise<PublishEventUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/publish-event.use-case"
  );

  const createPublishEventUseCase = (
    useCaseModule as { createPublishEventUseCase?: unknown }
  ).createPublishEventUseCase;

  if (typeof createPublishEventUseCase !== "function") {
    throw new Error(
      "EVT-002 RED: expected createPublishEventUseCase to be exported by publish-event.use-case.ts",
    );
  }

  return createPublishEventUseCase as PublishEventUseCaseFactory;
}

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
  eventExists?: boolean;
  eventStatus?: EventStatus;
  eventOrganizerId?: string;
  lots?: LotRecord[];
}) {
  const eventExists = options?.eventExists ?? true;
  const eventStatus = options?.eventStatus ?? "draft";
  const eventOrganizerId = options?.eventOrganizerId ?? ORGANIZER_ID;
  const lots = options?.lots ?? [DEFAULT_LOT];

  const save = vi.fn(async () => undefined);

  return {
    organizerId: ORGANIZER_ID,
    eventRepository: {
      findById: vi.fn(async () =>
        eventExists
          ? {
              id: EVENT_ID,
              organizerId: eventOrganizerId,
              slug: "test-event",
              title: "Test Event",
              status: eventStatus,
              startsAt: new Date("2026-05-01T10:00:00.000Z"),
              endsAt: null,
            }
          : null,
      ),
      save,
    },
    lotRepository: {
      findByEventId: vi.fn(async () => lots),
    },
  };
}

test("EVT-002 RED: publishes draft event with valid lot configuration", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies();
  const publishEvent = createPublishEventUseCase(dependencies);

  const result = await publishEvent({ eventId: EVENT_ID });

  expect(result).toEqual({ eventId: EVENT_ID, status: "published" });
  expect(dependencies.eventRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ id: EVENT_ID, status: "published" }),
  );
});

test("EVT-002 RED: rejects with not-found when event does not exist", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies({ eventExists: false });
  const publishEvent = createPublishEventUseCase(dependencies);

  await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
    code: "not-found",
  });
  expect(dependencies.eventRepository.save).not.toHaveBeenCalled();
});

test("EVT-002 RED: rejects publishing an already published event", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies({ eventStatus: "published" });
  const publishEvent = createPublishEventUseCase(dependencies);

  await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "event_already_published" },
  });
  expect(dependencies.eventRepository.save).not.toHaveBeenCalled();
});

test("EVT-002 RED: rejects publishing a cancelled event", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies({ eventStatus: "cancelled" });
  const publishEvent = createPublishEventUseCase(dependencies);

  await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "event_cancelled" },
  });
  expect(dependencies.eventRepository.save).not.toHaveBeenCalled();
});

test("EVT-002 RED: rejects when organizer does not own the event", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies({ eventOrganizerId: OTHER_ORGANIZER_ID });
  const publishEvent = createPublishEventUseCase(dependencies);

  await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
    code: "authorization",
    details: { reason: "ownership_violation" },
  });
  expect(dependencies.eventRepository.save).not.toHaveBeenCalled();
});

test("EVT-002 RED: rejects when event has no lots configured", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies({ lots: [] });
  const publishEvent = createPublishEventUseCase(dependencies);

  await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "no_lots" },
  });
  expect(dependencies.eventRepository.save).not.toHaveBeenCalled();
});

test("EVT-002 RED: rejects when no lot has a sale window configured", async () => {
  const createPublishEventUseCase = await loadPublishEventFactory();
  const dependencies = makeDependencies({
    lots: [{ ...DEFAULT_LOT, saleStartsAt: null }],
  });
  const publishEvent = createPublishEventUseCase(dependencies);

  await expect(publishEvent({ eventId: EVENT_ID })).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "no_sale_window" },
  });
  expect(dependencies.eventRepository.save).not.toHaveBeenCalled();
});
