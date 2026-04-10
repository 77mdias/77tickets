import { createNotFoundError } from "../errors";
import type { EventRepository, LotRepository } from "../../repositories";

export interface GetEventDetailInput {
  slug: string;
}

export interface EventDetailResult {
  event: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    location: string | null;
    imageUrl: string | null;
    startsAt: Date;
    endsAt: Date | null;
  };
  lots: Array<{
    id: string;
    title: string;
    priceInCents: number;
    totalQuantity: number;
    maxPerOrder: number;
    available: number;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
  }>;
}

export type GetEventDetailUseCase = (
  input: GetEventDetailInput,
) => Promise<EventDetailResult>;

export interface GetEventDetailUseCaseDependencies {
  now: () => Date;
  eventRepository: Pick<EventRepository, "findPublishedBySlug">;
  lotRepository: Pick<LotRepository, "findByEventId">;
}

const isWithinSaleWindow = (
  lot: { saleStartsAt: Date | null; saleEndsAt: Date | null },
  now: Date,
): boolean => {
  if (lot.saleStartsAt && lot.saleStartsAt > now) {
    return false;
  }

  if (lot.saleEndsAt && lot.saleEndsAt < now) {
    return false;
  }

  return true;
};

export const createGetEventDetailUseCase = (
  dependencies: GetEventDetailUseCaseDependencies,
): GetEventDetailUseCase => {
  return async (input) => {
    const event = await dependencies.eventRepository.findPublishedBySlug(input.slug);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    const now = dependencies.now();
    const lots = await dependencies.lotRepository.findByEventId(event.id);

    return {
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        location: event.location,
        imageUrl: event.imageUrl,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      },
      lots: lots
        .filter((lot) => lot.status === "active")
        .map((lot) => ({
          id: lot.id,
          title: lot.title,
          priceInCents: lot.priceInCents,
          totalQuantity: lot.totalQuantity,
          maxPerOrder: lot.maxPerOrder,
          available:
            lot.availableQuantity > 0 && isWithinSaleWindow(lot, now)
              ? lot.availableQuantity
              : 0,
          saleStartsAt: lot.saleStartsAt,
          saleEndsAt: lot.saleEndsAt,
        })),
    };
  };
};
