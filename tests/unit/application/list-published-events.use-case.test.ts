import { expect, test, vi } from "vitest";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";

test("EVT-005 RED: returns paginated published events in public listing shape", async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/list-published-events.use-case"
  );

  const createListPublishedEventsUseCase = useCaseModule.createListPublishedEventsUseCase;

  const listPublished = vi.fn(async () => [
    {
      id: EVENT_ID,
      organizerId: "00000000-0000-0000-0000-000000000001",
      slug: "sprint-007-public-event",
      title: "Sprint 007 Public Event",
      description: "internal description",
      location: "Sao Paulo",
      imageUrl: "https://cdn.example.com/event.png",
      status: "published" as const,
      startsAt: new Date("2099-05-10T18:00:00.000Z"),
      endsAt: new Date("2099-05-10T23:00:00.000Z"),
    },
  ]);

  const useCase = createListPublishedEventsUseCase({
    eventRepository: { listPublished },
  });

  const result = await useCase({ page: 2, limit: 5 });

  expect(listPublished).toHaveBeenCalledWith({ limit: 5, offset: 5 });
  expect(result).toEqual({
    page: 2,
    limit: 5,
    events: [
      {
        id: EVENT_ID,
        slug: "sprint-007-public-event",
        title: "Sprint 007 Public Event",
        startsAt: new Date("2099-05-10T18:00:00.000Z"),
        imageUrl: "https://cdn.example.com/event.png",
        location: "Sao Paulo",
      },
    ],
  });
});

test("EVT-005 RED: defaults pagination to page 1 and limit 10", async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/list-published-events.use-case"
  );

  const createListPublishedEventsUseCase = useCaseModule.createListPublishedEventsUseCase;
  const listPublished = vi.fn(async () => []);

  const useCase = createListPublishedEventsUseCase({
    eventRepository: { listPublished },
  });

  const result = await useCase({});

  expect(listPublished).toHaveBeenCalledWith({ limit: 10, offset: 0 });
  expect(result).toEqual({
    page: 1,
    limit: 10,
    events: [],
  });
});
