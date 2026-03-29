import { describe, expect, test, vi } from "vitest";

import { createPublishEventHandler } from "../../../../src/server/api/events/publish-event.handler";
import { createUpdateEventHandler } from "../../../../src/server/api/events/update-event.handler";
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
      slug: "events-auth",
      title: "Events Auth",
      status: "draft" as const,
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: null,
    };
  }),
});

describe("events auth integration", () => {
  test("publish blocks customer role", async () => {
    const publishEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "published" as const,
    }));

    const handler = createPublishEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createPublishEventForOrganizer: vi.fn(() => publishEvent),
    });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      body: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(publishEvent).not.toHaveBeenCalled();
  });

  test("publish blocks organizer outside ownership scope", async () => {
    const publishEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "published" as const,
    }));

    const handler = createPublishEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createPublishEventForOrganizer: vi.fn(() => publishEvent),
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(publishEvent).not.toHaveBeenCalled();
  });

  test("publish allows admin globally", async () => {
    const publishEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "published" as const,
    }));

    const handler = createPublishEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createPublishEventForOrganizer: vi.fn(() => publishEvent),
    });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(publishEvent).toHaveBeenCalledWith({ eventId: EVENT_ID });
  });

  test("update blocks organizer outside ownership scope", async () => {
    const updateEventStatus = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "cancelled" as const,
    }));

    const handler = createUpdateEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createUpdateEventStatusForOrganizer: vi.fn(() => updateEventStatus),
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: { eventId: EVENT_ID, targetStatus: "cancelled" },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(updateEventStatus).not.toHaveBeenCalled();
  });

  test("update allows admin globally", async () => {
    const updateEventStatus = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "cancelled" as const,
    }));

    const handler = createUpdateEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createUpdateEventStatusForOrganizer: vi.fn(() => updateEventStatus),
    });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: { eventId: EVENT_ID, targetStatus: "cancelled" },
    });

    expect(response.status).toBe(200);
    expect(updateEventStatus).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      targetStatus: "cancelled",
    });
  });

  test("update blocks customer role", async () => {
    const updateEventStatus = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "cancelled" as const,
    }));

    const handler = createUpdateEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createUpdateEventStatusForOrganizer: vi.fn(() => updateEventStatus),
    });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      body: { eventId: EVENT_ID, targetStatus: "cancelled" },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(updateEventStatus).not.toHaveBeenCalled();
  });
});
