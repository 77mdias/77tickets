import type { CreateLotInput, CreateLotResult } from "../events";
import { createConflictError, createNotFoundError } from "../errors";
import { assertEventManagementAccess } from "../security";
import type { EventRepository, LotRecord, LotRepository } from "../../repositories";

export type { CreateLotInput, CreateLotResult };

export type CreateLotUseCase = (input: CreateLotInput) => Promise<CreateLotResult>;

export interface CreateLotUseCaseDependencies {
  generateLotId: () => string;
  eventRepository: Pick<EventRepository, "findById">;
  lotRepository: Pick<LotRepository, "save">;
}

const createCreateLotConflictError = (reason: string) =>
  createConflictError("Create lot conflict", { details: { reason } });

const assertCreateLotInputIsValid = (input: CreateLotInput): void => {
  if (input.totalQuantity <= 0 || input.maxPerOrder <= 0) {
    throw createCreateLotConflictError("invalid_lot_quantity");
  }

  if (
    input.saleStartsAt !== null &&
    input.saleEndsAt !== null &&
    input.saleStartsAt > input.saleEndsAt
  ) {
    throw createCreateLotConflictError("invalid_sale_window");
  }
};

const buildLotRecord = (
  lotId: string,
  input: CreateLotInput,
): LotRecord => ({
  id: lotId,
  eventId: input.eventId,
  title: input.title,
  priceInCents: input.priceInCents,
  totalQuantity: input.totalQuantity,
  availableQuantity: input.totalQuantity,
  maxPerOrder: input.maxPerOrder,
  saleStartsAt: input.saleStartsAt,
  saleEndsAt: input.saleEndsAt,
  status: "active",
});

export const createCreateLotUseCase = (
  dependencies: CreateLotUseCaseDependencies,
): CreateLotUseCase => {
  return async (input) => {
    const event = await dependencies.eventRepository.findById(input.eventId);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    assertEventManagementAccess({
      actor: input.actor,
      eventOrganizerId: event.organizerId,
    });
    assertCreateLotInputIsValid(input);

    const lotId = dependencies.generateLotId();
    const lot = buildLotRecord(lotId, input);

    await dependencies.lotRepository.save(lot);

    return {
      lotId,
      eventId: input.eventId,
      status: "active",
      availableQuantity: lot.availableQuantity,
    };
  };
};
