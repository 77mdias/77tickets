import { expect, test, vi } from "vitest";

type EventStatus = "draft" | "published" | "cancelled";

type EventRecord = {
  id: string;
  organizerId: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  status: EventStatus;
  startsAt: Date;
  endsAt: Date | null;
};

type CreateEventResult = {
  eventId: string;
  slug: string;
  status: "draft";
};

type CreateEventUseCaseFactory = (dependencies: {
  generateEventId: () => string;
  eventRepository: {
    findBySlug: (slug: string) => Promise<EventRecord | null>;
    save: (event: EventRecord) => Promise<void>;
  };
}) => (input: {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  imageUrl: string | null;
  actorId: string;
}) => Promise<CreateEventResult>;

const EVENT_ID = "f39f01ec-17b6-49fd-95dc-83ddb03e0cf1";
const ACTOR_ID = "6c9e73e8-6ba8-4d48-9f84-6b057c85a603";

async function loadCreateEventFactory(): Promise<CreateEventUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/create-event.use-case"
  );

  const createCreateEventUseCase = (
    useCaseModule as { createCreateEventUseCase?: unknown }
  ).createCreateEventUseCase;

  if (typeof createCreateEventUseCase !== "function") {
    throw new Error(
      "EVT-008 RED: expected createCreateEventUseCase to be exported by create-event.use-case.ts",
    );
  }

  return createCreateEventUseCase as CreateEventUseCaseFactory;
}

test("EVT-008 RED: creates a draft event and derives organizerId from actorId", async () => {
  const createCreateEventUseCase = await loadCreateEventFactory();
  const save = vi.fn(async () => undefined);

  const createEvent = createCreateEventUseCase({
    generateEventId: () => EVENT_ID,
    eventRepository: {
      findBySlug: vi.fn(async () => null),
      save,
    },
  });

  const result = await createEvent({
    title: "Festival de Verao 2027",
    description: "Musica ao vivo",
    location: "Sao Paulo",
    startsAt: new Date("2027-01-10T18:00:00.000Z"),
    endsAt: new Date("2027-01-10T23:00:00.000Z"),
    imageUrl: "https://cdn.example.com/event.png",
    actorId: ACTOR_ID,
  });

  expect(save).toHaveBeenCalledWith({
    id: EVENT_ID,
    organizerId: ACTOR_ID,
    slug: "festival-de-verao-2027",
    title: "Festival de Verao 2027",
    description: "Musica ao vivo",
    location: "Sao Paulo",
    imageUrl: "https://cdn.example.com/event.png",
    status: "draft",
    startsAt: new Date("2027-01-10T18:00:00.000Z"),
    endsAt: new Date("2027-01-10T23:00:00.000Z"),
  });
  expect(result).toEqual({
    eventId: EVENT_ID,
    slug: "festival-de-verao-2027",
    status: "draft",
  });
});

test("EVT-008 RED: retries slug generation with numeric suffix until a unique slug is found", async () => {
  const createCreateEventUseCase = await loadCreateEventFactory();
  const findBySlug = vi
    .fn<(_: string) => Promise<EventRecord | null>>()
    .mockResolvedValueOnce({
      id: "existing-1",
      organizerId: ACTOR_ID,
      slug: "festival-de-verao-2027",
      title: "Festival de Verao 2027",
      description: null,
      location: null,
      imageUrl: null,
      status: "draft",
      startsAt: new Date("2027-01-01T00:00:00.000Z"),
      endsAt: null,
    })
    .mockResolvedValueOnce({
      id: "existing-2",
      organizerId: ACTOR_ID,
      slug: "festival-de-verao-2027-2",
      title: "Festival de Verao 2027",
      description: null,
      location: null,
      imageUrl: null,
      status: "draft",
      startsAt: new Date("2027-01-01T00:00:00.000Z"),
      endsAt: null,
    })
    .mockResolvedValueOnce(null);
  const save = vi.fn(async () => undefined);

  const createEvent = createCreateEventUseCase({
    generateEventId: () => EVENT_ID,
    eventRepository: {
      findBySlug,
      save,
    },
  });

  const result = await createEvent({
    title: "Festival de Verao 2027",
    description: null,
    location: null,
    startsAt: new Date("2027-01-10T18:00:00.000Z"),
    endsAt: null,
    imageUrl: null,
    actorId: ACTOR_ID,
  });

  expect(findBySlug.mock.calls).toEqual([
    ["festival-de-verao-2027"],
    ["festival-de-verao-2027-2"],
    ["festival-de-verao-2027-3"],
  ]);
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      slug: "festival-de-verao-2027-3",
    }),
  );
  expect(result).toEqual({
    eventId: EVENT_ID,
    slug: "festival-de-verao-2027-3",
    status: "draft",
  });
});
