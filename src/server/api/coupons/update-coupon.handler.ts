import { createNotFoundError } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import { assertEventManagementAccess } from "../../application/security";
import type { UpdateCouponUseCase } from "../../application/use-cases";
import type { CouponRepository, EventRepository } from "../../repositories";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { updateCouponSchema } from "../schemas";
import { parseInput } from "../validation";

export interface UpdateCouponRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface UpdateCouponSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<UpdateCouponUseCase>>;
  };
}

export type UpdateCouponHandlerResponse = UpdateCouponSuccessResponse | ErrorResponse;

export interface UpdateCouponHandlerDependencies {
  couponRepository: Pick<CouponRepository, "findById">;
  eventRepository: Pick<EventRepository, "findById">;
  updateCoupon: UpdateCouponUseCase;
}

export const createUpdateCouponHandler = (
  dependencies: UpdateCouponHandlerDependencies,
) => {
  return async (
    request: UpdateCouponRequest,
  ): Promise<UpdateCouponHandlerResponse> => {
    try {
      const input = parseInput(updateCouponSchema, request.body);
      const coupon = await dependencies.couponRepository.findById(input.couponId);

      if (!coupon) {
        throw createNotFoundError("Coupon not found");
      }

      const event = await dependencies.eventRepository.findById(coupon.eventId);

      if (!event) {
        throw createNotFoundError("Event not found");
      }

      assertEventManagementAccess({
        actor: request.actor,
        eventOrganizerId: event.organizerId,
      });

      const result = await dependencies.updateCoupon(input);

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
