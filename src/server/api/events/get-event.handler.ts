import type { GetEventDetailUseCase } from "../../application/use-cases";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { getEventParamsSchema } from "../schemas";
import { parseInput } from "../validation";

export interface GetEventRequest {
  params: unknown;
}

export interface GetEventSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<GetEventDetailUseCase>>;
  };
}

export type GetEventHandlerResponse = GetEventSuccessResponse | ErrorResponse;

export interface GetEventHandlerDependencies {
  getEventDetail: GetEventDetailUseCase;
}

export const createGetEventHandler = (dependencies: GetEventHandlerDependencies) => {
  return async (request: GetEventRequest): Promise<GetEventHandlerResponse> => {
    try {
      const input = parseInput(getEventParamsSchema, request.params);
      const result = await dependencies.getEventDetail(input);

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
