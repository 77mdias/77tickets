import type { UpdateLotInput, UpdateLotResult } from "../events";
import { createConflictError, createNotFoundError } from "../errors";
import { assertEventManagementAccess } from "../security";
import type { EventRepository, LotRecord, LotRepository } from "../../repositories";

export type { UpdateLotInput, UpdateLotResult };

export type UpdateLotUseCase = (input: UpdateLotInput) => Promise<UpdateLotResult>;

export interface UpdateLotUseCaseDependencies {
  eventRepository: Pick<EventRepository, "findById">;
  lotRepository: Pick<LotRepository, "findById" | "save">;
}

const createUpdateLotConflictError = (reason: string) =>
  createConflictError("Update lot conflict", { details: { reason } });

const getSoldQuantity = (lot: LotRecord): number => lot.totalQuantity - lot.availableQuantity;

const resolveUpdatedLot = (existingLot: LotRecord, input: UpdateLotInput): LotRecord => {
  const soldQuantity = getSoldQuantity(existingLot);
  const nextTotalQuantity = input.totalQuantity ?? existingLot.totalQuantity;
  const nextSaleStartsAt =
    input.saleStartsAt !== undefined ? input.saleStartsAt : existingLot.saleStartsAt;
  const nextSaleEndsAt =
    input.saleEndsAt !== undefined ? input.saleEndsAt : existingLot.saleEndsAt;

  if (nextTotalQuantity <= 0 || (input.maxPerOrder !== undefined && input.maxPerOrder <= 0)) {
    throw createUpdateLotConflictError("invalid_lot_quantity");
  }

  if (
    nextSaleStartsAt !== null &&
    nextSaleEndsAt !== null &&
    nextSaleStartsAt > nextSaleEndsAt
  ) {
    throw createUpdateLotConflictError("invalid_sale_window");
  }

  if (nextTotalQuantity < soldQuantity) {
    throw createUpdateLotConflictError("total_quantity_below_sold_quantity");
  }

  return {
    ...existingLot,
    title: input.title ?? existingLot.title,
    priceInCents: input.priceInCents ?? existingLot.priceInCents,
    totalQuantity: nextTotalQuantity,
    availableQuantity: nextTotalQuantity - soldQuantity,
    maxPerOrder: input.maxPerOrder ?? existingLot.maxPerOrder,
    saleStartsAt: nextSaleStartsAt,
    saleEndsAt: nextSaleEndsAt,
    status: input.status ?? existingLot.status,
  };
};

export const createUpdateLotUseCase = (
  dependencies: UpdateLotUseCaseDependencies,
): UpdateLotUseCase => {
  return async (input) => {
    const lot = await dependencies.lotRepository.findById(input.lotId);

    if (!lot) {
      throw createNotFoundError("Lot not found");
    }

    const event = await dependencies.eventRepository.findById(lot.eventId);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    assertEventManagementAccess({
      actor: input.actor,
      eventOrganizerId: event.organizerId,
    });

    const updatedLot = resolveUpdatedLot(lot, input);

    await dependencies.lotRepository.save(updatedLot);

    return {
      lotId: updatedLot.id,
      eventId: updatedLot.eventId,
      status: updatedLot.status,
      availableQuantity: updatedLot.availableQuantity,
      totalQuantity: updatedLot.totalQuantity,
    };
  };
};
