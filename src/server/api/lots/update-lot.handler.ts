import type { SecurityActor } from "../../application/security";
import type { UpdateLotUseCase } from "../../application/use-cases";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { updateLotSchema } from "../schemas";
import { parseInput } from "../validation";

export interface UpdateLotRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface UpdateLotCommand {
  lotId: string;
  actor: SecurityActor;
  title?: string;
  priceInCents?: number;
  totalQuantity?: number;
  maxPerOrder?: number;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  status?: "active" | "paused" | "sold_out" | "closed";
}

export interface UpdateLotResult {
  lotId: string;
  eventId: string;
  totalQuantity: number;
  availableQuantity: number;
  status: "active" | "paused" | "sold_out" | "closed";
}

export interface UpdateLotSuccessResponse {
  status: 200;
  body: {
    data: UpdateLotResult;
  };
}

export type UpdateLotHandlerResponse = UpdateLotSuccessResponse | ErrorResponse;

export interface UpdateLotHandlerDependencies {
  updateLot: UpdateLotUseCase;
}

export const createUpdateLotHandler = (dependencies: UpdateLotHandlerDependencies) => {
  return async (
    request: UpdateLotRequest,
  ): Promise<UpdateLotHandlerResponse> => {
    try {
      const input = parseInput(updateLotSchema, request.body);
      const result = await dependencies.updateLot({
        ...input,
        actor: request.actor,
      });

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
