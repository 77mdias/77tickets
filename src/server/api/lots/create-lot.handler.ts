import type { SecurityActor } from "../../application/security";
import type { CreateLotUseCase } from "../../application/use-cases";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { createLotSchema } from "../schemas";
import { parseInput } from "../validation";

export interface CreateLotRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface CreateLotInput {
  eventId: string;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  actor: SecurityActor;
}

export interface CreateLotResult {
  lotId: string;
  eventId: string;
  status: "active";
  availableQuantity: number;
}

export interface CreateLotSuccessResponse {
  status: 201;
  body: {
    data: CreateLotResult;
  };
}

export type CreateLotHandlerResponse = CreateLotSuccessResponse | ErrorResponse;

export interface CreateLotHandlerDependencies {
  createLot: CreateLotUseCase;
}

export const createCreateLotHandler = (dependencies: CreateLotHandlerDependencies) => {
  return async (
    request: CreateLotRequest,
  ): Promise<CreateLotHandlerResponse> => {
    try {
      const input = parseInput(createLotSchema, request.body);
      const result = await dependencies.createLot({
        ...input,
        actor: request.actor,
      });

      return {
        status: 201,
        body: {
          data: result,
        },
      };
    } catch (error) {
      return mapAppErrorToResponse(error);
    }
  };
};
