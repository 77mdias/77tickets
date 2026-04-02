import type { EventRepository } from "../../repositories";

export interface ListPublishedEventsInput {
  q?: string;
  date?: string;
  location?: string;
  category?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface PublishedEventListItem {
  id: string;
  slug: string;
  title: string;
  startsAt: Date;
  imageUrl: string | null;
  location: string | null;
}

export interface ListPublishedEventsResult {
  page: number;
  limit: number;
  nextCursor: string | null;
  events: PublishedEventListItem[];
}

export type ListPublishedEventsUseCase = (
  input: ListPublishedEventsInput,
) => Promise<ListPublishedEventsResult>;

export interface ListPublishedEventsUseCaseDependencies {
  eventRepository: Pick<EventRepository, "listPublished">;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value: number | undefined, fallback: number): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
};

const normalizeLimit = (value: number | undefined): number =>
  Math.min(MAX_LIMIT, normalizePositiveInteger(value, DEFAULT_LIMIT));

export const createListPublishedEventsUseCase = (
  dependencies: ListPublishedEventsUseCaseDependencies,
): ListPublishedEventsUseCase => {
  return async (input) => {
    const page = normalizePositiveInteger(input.page, DEFAULT_PAGE);
    const limit = normalizeLimit(input.limit);
    const repositoryResult = await dependencies.eventRepository.listPublished({
      q: input.q,
      date: input.date,
      location: input.location,
      category: input.category,
      cursor: input.cursor,
      page,
      limit,
    });
    const publishedEventsPage = Array.isArray(repositoryResult)
      ? { items: repositoryResult, hasMore: false }
      : repositoryResult;
    const lastEvent = publishedEventsPage.items.at(-1);
    const nextCursor =
      publishedEventsPage.hasMore && lastEvent
        ? encodeCursor(lastEvent.startsAt, lastEvent.id)
        : null;

    return {
      page,
      limit,
      nextCursor,
      events: publishedEventsPage.items.map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        startsAt: event.startsAt,
        imageUrl: event.imageUrl,
        location: event.location,
      })),
    };
  };
};

const encodeCursor = (startsAt: Date, id: string): string =>
  toBase64Url(
    JSON.stringify({
      startsAt: startsAt.toISOString(),
      id,
    }),
  );

const toBase64Url = (value: string): string =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
