import type { EventRepository } from "../../repositories";

export interface ListPublishedEventsInput {
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
    const offset = (page - 1) * limit;

    const events = await dependencies.eventRepository.listPublished({ limit, offset });

    return {
      page,
      limit,
      events: events.map((event) => ({
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
