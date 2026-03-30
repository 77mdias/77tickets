import type { ListPublishedEventsUseCase } from "../../application/use-cases";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { listEventsQuerySchema } from "../schemas";
import { parseInput } from "../validation";

export interface ListEventsRequest {
  query: unknown;
}

export interface ListEventsSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<ListPublishedEventsUseCase>>;
  };
}

export type ListEventsHandlerResponse = ListEventsSuccessResponse | ErrorResponse;

export interface ListEventsHandlerDependencies {
  listPublishedEvents: ListPublishedEventsUseCase;
}

export const createListEventsHandler = (dependencies: ListEventsHandlerDependencies) => {
  return async (request: ListEventsRequest): Promise<ListEventsHandlerResponse> => {
    try {
      const input = parseInput(listEventsQuerySchema, request.query);
      const result = await dependencies.listPublishedEvents(input);

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
