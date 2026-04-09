import type { CreateEventInput, CreateEventResult } from "../events";
import type { EventRecord } from "../../repositories";

export type { CreateEventInput, CreateEventResult };

export type CreateEventUseCase = (input: CreateEventInput) => Promise<CreateEventResult>;

interface CreateEventRepository {
  findBySlug(slug: string): Promise<EventRecord | null>;
  save(event: EventRecord): Promise<void>;
}

export interface CreateEventUseCaseDependencies {
  generateEventId: () => string;
  eventRepository: CreateEventRepository;
}

const normalizeSlugSegment = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const slugifyTitle = (title: string): string => {
  const normalized = normalizeSlugSegment(title);
  return normalized.length > 0 ? normalized : "event";
};

const resolveUniqueSlug = async (
  repository: CreateEventRepository,
  title: string,
): Promise<string> => {
  const baseSlug = slugifyTitle(title);

  for (let attempt = 1; ; attempt += 1) {
    const candidate = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
    const existingEvent = await repository.findBySlug(candidate);

    if (!existingEvent) {
      return candidate;
    }
  }
};

export const createCreateEventUseCase = (
  dependencies: CreateEventUseCaseDependencies,
): CreateEventUseCase => {
  return async (input) => {
    const eventId = dependencies.generateEventId();
    const slug = await resolveUniqueSlug(dependencies.eventRepository, input.title);

    await dependencies.eventRepository.save({
      id: eventId,
      organizerId: input.actorId,
      slug,
      title: input.title,
      description: input.description,
      location: input.location,
      imageUrl: input.imageUrl,
      status: "draft",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });

    return {
      eventId,
      slug,
      status: "draft",
    };
  };
};
