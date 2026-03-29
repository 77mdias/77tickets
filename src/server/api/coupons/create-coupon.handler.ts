import { createNotFoundError } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import { assertEventManagementAccess } from "../../application/security";
import type { CreateCouponUseCase } from "../../application/use-cases";
import type { EventRepository } from "../../repositories";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { createCouponSchema } from "../schemas";
import { parseInput } from "../validation";

export interface CreateCouponRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface CreateCouponSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<CreateCouponUseCase>>;
  };
}

export type CreateCouponHandlerResponse = CreateCouponSuccessResponse | ErrorResponse;

export interface CreateCouponHandlerDependencies {
  eventRepository: Pick<EventRepository, "findById">;
  createCoupon: CreateCouponUseCase;
}

export const createCreateCouponHandler = (
  dependencies: CreateCouponHandlerDependencies,
) => {
  return async (
    request: CreateCouponRequest,
  ): Promise<CreateCouponHandlerResponse> => {
    try {
      const input = parseInput(createCouponSchema, request.body);
      const event = await dependencies.eventRepository.findById(input.eventId);

      if (!event) {
        throw createNotFoundError("Event not found");
      }

      assertEventManagementAccess({
        actor: request.actor,
        eventOrganizerId: event.organizerId,
      });

      const result = await dependencies.createCoupon(input);

      return {
        status: 200,
        body: {
          data: result,
        },
      };
    } catch (error) {
      return mapAppErrorToResponse(error);
    }
  };
};
