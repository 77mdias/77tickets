import { expect, test, vi } from "vitest";

import { createUpdateEventStatusUseCase } from "../../../src/server/application/use-cases/update-event-status.use-case";

type EventStatus = "draft" | "published" | "cancelled";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";

const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

const makeDependencies = (options?: {
  eventExists?: boolean;
  eventStatus?: EventStatus;
}) => {
  const eventExists = options?.eventExists ?? true;
  const eventStatus = options?.eventStatus ?? "draft";

  return {
    eventRepository: {
      findById: vi.fn(async () => {
        if (!eventExists) {
          return null;
        }

        return {
          id: EVENT_ID,
          organizerId: ORGANIZER_ID,
          slug: "status-update-event",
          title: "Status Update Event",
          status: eventStatus,
          startsAt: new Date("2027-06-01T10:00:00.000Z"),
          endsAt: null,
        };
      }),
      save: vi.fn(async () => undefined),
    },
  };
};

test("updates draft event to cancelled", async () => {
  const dependencies = makeDependencies({ eventStatus: "draft" });
  const updateEventStatus = createUpdateEventStatusUseCase(dependencies);

  const result = await updateEventStatus({
    eventId: EVENT_ID,
    targetStatus: "cancelled",
  });

  expect(result).toEqual({
    eventId: EVENT_ID,
    status: "cancelled",
  });

  expect(dependencies.eventRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({
      id: EVENT_ID,
      status: "cancelled",
    }),
  );
});

test("updates published event to cancelled", async () => {
  const dependencies = makeDependencies({ eventStatus: "published" });
  const updateEventStatus = createUpdateEventStatusUseCase(dependencies);

  const result = await updateEventStatus({
    eventId: EVENT_ID,
    targetStatus: "cancelled",
  });

  expect(result).toEqual({
    eventId: EVENT_ID,
    status: "cancelled",
  });
});

test("returns not-found when event does not exist", async () => {
  const dependencies = makeDependencies({ eventExists: false });
  const updateEventStatus = createUpdateEventStatusUseCase(dependencies);

  await expect(
    updateEventStatus({
      eventId: EVENT_ID,
      targetStatus: "cancelled",
    }),
  ).rejects.toMatchObject({
    code: "not-found",
  });
});

test("blocks publish through update endpoint", async () => {
  const dependencies = makeDependencies({ eventStatus: "draft" });
  const updateEventStatus = createUpdateEventStatusUseCase(dependencies);

  await expect(
    updateEventStatus({
      eventId: EVENT_ID,
      targetStatus: "published",
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "publish_requires_publish_endpoint" },
  });
});

test("blocks draft as target status through update endpoint", async () => {
  const dependencies = makeDependencies({ eventStatus: "published" });
  const updateEventStatus = createUpdateEventStatusUseCase(dependencies);

  await expect(
    updateEventStatus({
      eventId: EVENT_ID,
      targetStatus: "draft",
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "invalid_transition" },
  });
});

test("blocks updates for already cancelled events", async () => {
  const dependencies = makeDependencies({ eventStatus: "cancelled" });
  const updateEventStatus = createUpdateEventStatusUseCase(dependencies);

  await expect(
    updateEventStatus({
      eventId: EVENT_ID,
      targetStatus: "cancelled",
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "event_already_cancelled" },
  });
});
