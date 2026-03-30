import type { ValidateCheckinFailureResult } from "../../application/checkin";
import { assertCheckinAccess } from "../../application/security";
import {
  createAuthorizationError,
  createConflictError,
  createNotFoundError,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type { ValidateCheckinUseCase } from "../../application/use-cases";
import type { EventRepository } from "../../repositories";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { validateCheckinSchema } from "../schemas";
import { parseInput } from "../validation";

export interface ValidateCheckinRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface ValidateCheckinSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<ValidateCheckinUseCase>> & {
      outcome: "approved";
    };
  };
}

export type ValidateCheckinHandlerResponse =
  | ValidateCheckinSuccessResponse
  | ErrorResponse;

export interface ValidateCheckinHandlerDependencies {
  validateCheckin: ValidateCheckinUseCase;
  eventRepository: Pick<EventRepository, "findById">;
}

const mapCheckinRejectionToError = (
  reason: ValidateCheckinFailureResult["reason"],
): Error => {
  if (reason === "ticket_not_found") {
    return createNotFoundError("Ticket not found", {
      details: { reason },
    });
  }

  if (reason === "unauthorized_checker") {
    return createAuthorizationError("Forbidden", {
      details: { reason },
    });
  }

  return createConflictError("Check-in rejected", {
    details: { reason },
  });
};

export const createValidateCheckinHandler = (
  dependencies: ValidateCheckinHandlerDependencies,
) =>
  async (
    request: ValidateCheckinRequest,
  ): Promise<ValidateCheckinHandlerResponse> => {
    try {
      const input = parseInput(validateCheckinSchema, request.body);
      const eventOrganizerId =
        request.actor.role === "organizer"
          ? (await dependencies.eventRepository.findById(input.eventId))
              ?.organizerId ?? null
          : null;

      assertCheckinAccess({
        actor: request.actor,
        eventOrganizerId,
      });

      const result = await dependencies.validateCheckin({
        ...input,
        checkerId: request.actor.userId,
      });

      if (result.outcome === "rejected") {
        throw mapCheckinRejectionToError(result.reason);
      }

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
