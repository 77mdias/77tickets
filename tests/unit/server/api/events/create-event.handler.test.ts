import { expect, test, vi } from "vitest";

import { createCreateEventHandler } from "../../../../../src/server/api/events/create-event.handler";

const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

test("returns 400 validation error for invalid payload", async () => {
  const createEvent = vi.fn();

  const handler = createCreateEventHandler({
    createEvent,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      title: "",
      startsAt: "invalid-date",
      endsAt: null,
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(createEvent).not.toHaveBeenCalled();
});

test("blocks customer role from creating events", async () => {
  const createEvent = vi.fn();

  const handler = createCreateEventHandler({
    createEvent,
  });

  const response = await handler({
    actor: {
      role: "customer",
      userId: "00000000-0000-0000-0000-000000000002",
    },
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

test("allows organizer and delegates actor context server-side", async () => {
  const createEvent = vi.fn(async () => ({
    eventId: "f39f01ec-17b6-49fd-95dc-83ddb03e0cf1",
    slug: "festival-de-verao-2027",
    status: "draft" as const,
  }));

  const handler = createCreateEventHandler({
    createEvent,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      title: "  Festival de Verao 2027  ",
      description: "  Musica ao vivo  ",
      location: "  Sao Paulo  ",
      startsAt: "2027-01-10T18:00:00.000Z",
      endsAt: "2027-01-10T23:00:00.000Z",
      imageUrl: "https://cdn.example.com/event.png",
    },
  });

  expect(response.status).toBe(201);
  expect(createEvent).toHaveBeenCalledWith({
    title: "Festival de Verao 2027",
    description: "Musica ao vivo",
    location: "Sao Paulo",
    startsAt: new Date("2027-01-10T18:00:00.000Z"),
    endsAt: new Date("2027-01-10T23:00:00.000Z"),
    imageUrl: "https://cdn.example.com/event.png",
    actorId: ORGANIZER_ID,
  });
});

test("allows admin globally", async () => {
  const createEvent = vi.fn(async () => ({
    eventId: "f39f01ec-17b6-49fd-95dc-83ddb03e0cf1",
    slug: "festival-de-verao-2027",
    status: "draft" as const,
  }));

  const handler = createCreateEventHandler({
    createEvent,
  });

  const response = await handler({
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
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
