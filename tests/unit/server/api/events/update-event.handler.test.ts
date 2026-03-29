import { expect, test, vi } from "vitest";

import { createUpdateEventHandler } from "../../../../../src/server/api/events/update-event.handler";
import { createConflictError } from "../../../../../src/server/application/errors";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "00000000-0000-0000-0000-000000000999";

const createEventRepository = (organizerId = ORGANIZER_ID) => ({
  findById: vi.fn(async () => ({
    id: EVENT_ID,
    organizerId,
    slug: "update-handler-event",
    title: "Update Handler Event",
    status: "draft" as const,
    startsAt: new Date("2027-06-01T10:00:00.000Z"),
    endsAt: null,
  })),
});

test("returns 400 validation error for invalid payload", async () => {
  const eventRepository = createEventRepository();
  const createUpdateEventStatusForOrganizer = vi.fn();

  const handler = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      eventId: "invalid-uuid",
      targetStatus: "cancelled",
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(eventRepository.findById).not.toHaveBeenCalled();
  expect(createUpdateEventStatusForOrganizer).not.toHaveBeenCalled();
});

test("blocks organizer outside ownership scope", async () => {
  const eventRepository = createEventRepository(OTHER_ORGANIZER_ID);
  const createUpdateEventStatusForOrganizer = vi.fn();

  const handler = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      eventId: EVENT_ID,
      targetStatus: "cancelled",
    },
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
  expect(createUpdateEventStatusForOrganizer).not.toHaveBeenCalled();
});

test("allows admin and delegates to update use-case with event owner context", async () => {
  const eventRepository = createEventRepository(OTHER_ORGANIZER_ID);
  const updateEventStatus = vi.fn(async () => ({
    eventId: EVENT_ID,
    status: "cancelled" as const,
  }));

  const createUpdateEventStatusForOrganizer = vi.fn(() => updateEventStatus);

  const handler = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer,
  });

  const response = await handler({
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
    body: {
      eventId: EVENT_ID,
      targetStatus: "cancelled",
    },
  });

  expect(response.status).toBe(200);
  expect(createUpdateEventStatusForOrganizer).toHaveBeenCalledWith(OTHER_ORGANIZER_ID);
  expect(updateEventStatus).toHaveBeenCalledWith({
    eventId: EVENT_ID,
    targetStatus: "cancelled",
  });
});

test("maps use-case conflict errors with stable response shape", async () => {
  const eventRepository = createEventRepository();
  const createUpdateEventStatusForOrganizer = vi.fn(() =>
    vi.fn(async () => {
      throw createConflictError("Update event conflict", {
        details: { reason: "publish_requires_publish_endpoint" },
      });
    }),
  );

  const handler = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      eventId: EVENT_ID,
      targetStatus: "published",
    },
  });

  expect(response.status).toBe(409);
  expect(response.body.error.code).toBe("conflict");
  expect(response.body.error.details).toEqual({
    reason: "publish_requires_publish_endpoint",
  });
});
