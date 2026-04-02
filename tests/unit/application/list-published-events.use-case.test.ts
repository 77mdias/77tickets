import { describe, expect, test, vi } from "vitest";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const encodeCursor = (startsAt: Date, id: string): string =>
  Buffer.from(
    JSON.stringify({
      startsAt: startsAt.toISOString(),
      id,
    }),
    "utf8",
  ).toString("base64url");

type ListPublishedEventsInputV2 = {
  q?: string;
  date?: string;
  location?: string;
  category?: string;
  cursor?: string;
  page?: number;
  limit?: number;
};

type PublishedEventListItem = {
  id: string;
  slug: string;
  title: string;
  startsAt: Date;
  imageUrl: string | null;
  location: string | null;
};

type ListPublishedEventsResultV2 = {
  page: number;
  limit: number;
  nextCursor: string | null;
  events: PublishedEventListItem[];
};

type RepositoryPage = {
  items: PublishedEventListItem[];
  hasMore: boolean;
};

const loadUseCase = async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/list-published-events.use-case"
  );

  return useCaseModule.createListPublishedEventsUseCase;
};

const createEventRecord = (
  overrides: Partial<PublishedEventListItem> = {},
): PublishedEventListItem => ({
  id: EVENT_ID,
  slug: "sprint-007-public-event",
  title: "Sprint 007 Public Event",
  startsAt: new Date("2099-05-10T18:00:00.000Z"),
  imageUrl: "https://cdn.example.com/event.png",
  location: "Sao Paulo",
  ...overrides,
});

describe("list-published-events use-case cursor/filter contract", () => {
  test("EVT-005 RED: passes combined filters through to the repository", async () => {
    const createListPublishedEventsUseCase = await loadUseCase();
    const listPublished = vi.fn(
      async (): Promise<RepositoryPage> => ({
        items: [createEventRecord()],
        hasMore: false,
      }),
    );
    const useCase = createListPublishedEventsUseCase({
      eventRepository: { listPublished },
    }) as (input: ListPublishedEventsInputV2) => Promise<ListPublishedEventsResultV2>;

    const result = await useCase({
      q: "music festival",
      date: "2026-06-10",
      location: "Sao Paulo",
      category: "concerts",
      cursor: "cursor-abc",
      page: 2,
      limit: 5,
    });

    expect(listPublished).toHaveBeenCalledWith({
      q: "music festival",
      date: "2026-06-10",
      location: "Sao Paulo",
      category: "concerts",
      cursor: "cursor-abc",
      page: 2,
      limit: 5,
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.events).toHaveLength(1);
  });

  test("EVT-005 RED: exposes nextCursor when the repository has more results", async () => {
    const createListPublishedEventsUseCase = await loadUseCase();
    const lastEvent = createEventRecord({
      id: "31cc0c23-a425-4f6b-9f7c-eb5efdb88d11",
      startsAt: new Date("2099-08-10T18:00:00.000Z"),
    });
    const page = {
      items: [createEventRecord(), lastEvent],
      hasMore: true,
    };
    const listPublished = vi.fn(async (): Promise<RepositoryPage> => page);
    const useCase = createListPublishedEventsUseCase({
      eventRepository: { listPublished },
    }) as (input: ListPublishedEventsInputV2) => Promise<ListPublishedEventsResultV2>;

    const result = await useCase({ page: 1, limit: 1 });

    expect(result.nextCursor).toBe(encodeCursor(lastEvent.startsAt, lastEvent.id));
  });

  test("EVT-005 RED: returns null nextCursor on the last page", async () => {
    const createListPublishedEventsUseCase = await loadUseCase();
    const page = {
      items: [createEventRecord()],
      hasMore: false,
    };
    const listPublished = vi.fn(async (): Promise<RepositoryPage> => page);
    const useCase = createListPublishedEventsUseCase({
      eventRepository: { listPublished },
    }) as (input: ListPublishedEventsInputV2) => Promise<ListPublishedEventsResultV2>;

    const result = await useCase({ page: 1, limit: 10 });

    expect(result.nextCursor).toBeNull();
  });

  test("EVT-005 RED: still supports legacy page and limit inputs", async () => {
    const createListPublishedEventsUseCase = await loadUseCase();
    const listPublished = vi.fn(
      async (): Promise<RepositoryPage> => ({
        items: [createEventRecord()],
        hasMore: false,
      }),
    );
    const useCase = createListPublishedEventsUseCase({
      eventRepository: { listPublished },
    }) as (input: ListPublishedEventsInputV2) => Promise<ListPublishedEventsResultV2>;

    const result = await useCase({ page: 3, limit: 25 });

    expect(listPublished).toHaveBeenCalledWith({ page: 3, limit: 25 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });
});
