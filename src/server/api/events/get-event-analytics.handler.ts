import type { GetEventAnalyticsUseCase } from "../../application/use-cases";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { getEventParamsSchema } from "../schemas";
import { parseInput } from "../validation";
import type { SecurityActor } from "../../application/security";

export interface GetEventAnalyticsRequest {
  actor: SecurityActor;
  params: unknown;
}

export interface GetEventAnalyticsSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<GetEventAnalyticsUseCase>>;
  };
}

export type GetEventAnalyticsHandlerResponse =
  | GetEventAnalyticsSuccessResponse
  | ErrorResponse;

export interface GetEventAnalyticsHandlerDependencies {
  getEventAnalytics: GetEventAnalyticsUseCase;
}

export const createGetEventAnalyticsHandler = (
  dependencies: GetEventAnalyticsHandlerDependencies,
) => {
  return async (
    request: GetEventAnalyticsRequest,
  ): Promise<GetEventAnalyticsHandlerResponse> => {
    try {
      const input = parseInput(getEventParamsSchema, request.params);
      const result = await dependencies.getEventAnalytics({
        eventId: input.slug,
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
