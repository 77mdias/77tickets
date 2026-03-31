import { describe, expect, test, vi } from "vitest";

import { createCreateEventHandler } from "../../../../src/server/api/events/create-event.handler";
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
  test("create blocks customer role", async () => {
    const createEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      slug: "festival-de-verao-2027",
      status: "draft" as const,
    }));

    const handler = createCreateEventHandler({
      createEvent,
    });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      body: {
        title: "Festival de Verao 2027",
        description: "Musica ao vivo",
        location: "Sao Paulo",
        startsAt: "2027-01-10T18:00:00.000Z",
        endsAt: "2027-01-10T23:00:00.000Z",
        imageUrl: "https://cdn.example.com/event.png",
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(createEvent).not.toHaveBeenCalled();
  });

  test("create allows organizer with session actor scope", async () => {
    const createEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      slug: "festival-de-verao-2027",
      status: "draft" as const,
    }));

    const handler = createCreateEventHandler({
      createEvent,
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      body: {
        title: "Festival de Verao 2027",
        description: "Musica ao vivo",
        location: "Sao Paulo",
        startsAt: "2027-01-10T18:00:00.000Z",
        endsAt: "2027-01-10T23:00:00.000Z",
        imageUrl: "https://cdn.example.com/event.png",
      },
    });

    expect(response.status).toBe(201);
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ORGANIZER_A,
      }),
    );
  });

  test("create allows admin globally", async () => {
    const createEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      slug: "festival-de-verao-2027",
      status: "draft" as const,
    }));

    const handler = createCreateEventHandler({
      createEvent,
    });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: {
        title: "Festival de Verao 2027",
        description: "Musica ao vivo",
        location: "Sao Paulo",
        startsAt: "2027-01-10T18:00:00.000Z",
        endsAt: "2027-01-10T23:00:00.000Z",
        imageUrl: "https://cdn.example.com/event.png",
      },
    });

    expect(response.status).toBe(201);
    expect(createEvent).toHaveBeenCalled();
  });

  test("create blocks checker role", async () => {
    const createEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      slug: "festival-de-verao-2027",
      status: "draft" as const,
    }));

    const handler = createCreateEventHandler({
      createEvent,
    });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: {
        title: "Festival de Verao 2027",
        description: "Musica ao vivo",
        location: "Sao Paulo",
        startsAt: "2027-01-10T18:00:00.000Z",
        endsAt: "2027-01-10T23:00:00.000Z",
        imageUrl: "https://cdn.example.com/event.png",
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(createEvent).not.toHaveBeenCalled();
  });

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

  test("publish allows organizer within ownership scope", async () => {
    const publishEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "published" as const,
    }));

    const handler = createPublishEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createPublishEventForOrganizer: vi.fn(() => publishEvent),
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      body: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(200);
    expect(publishEvent).toHaveBeenCalledWith({ eventId: EVENT_ID });
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

  test("publish blocks checker role", async () => {
    const publishEvent = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "published" as const,
    }));

    const handler = createPublishEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createPublishEventForOrganizer: vi.fn(() => publishEvent),
    });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: { eventId: EVENT_ID },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(publishEvent).not.toHaveBeenCalled();
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

  test("update allows organizer within ownership scope", async () => {
    const updateEventStatus = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "cancelled" as const,
    }));

    const handler = createUpdateEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createUpdateEventStatusForOrganizer: vi.fn(() => updateEventStatus),
    });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
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

  test("update blocks checker role", async () => {
    const updateEventStatus = vi.fn(async () => ({
      eventId: EVENT_ID,
      status: "cancelled" as const,
    }));

    const handler = createUpdateEventHandler({
      eventRepository: createEventRepository(ORGANIZER_A),
      createUpdateEventStatusForOrganizer: vi.fn(() => updateEventStatus),
    });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: { eventId: EVENT_ID, targetStatus: "cancelled" },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(updateEventStatus).not.toHaveBeenCalled();
  });
});
