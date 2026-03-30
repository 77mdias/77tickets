import { type AppErrorPayload } from "../../application/errors";
import { mapAppErrorToResponse } from "../error-mapper";
import type {
  GetEventHandlerResponse,
  GetEventRequest,
} from "./get-event.handler";
import type {
  ListEventsHandlerResponse,
  ListEventsRequest,
} from "./list-events.handler";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const searchParamsToObject = (url: string): Record<string, string> => {
  const searchParams = new URL(url).searchParams;
  const query: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }

  return query;
};

export interface ListEventsRouteAdapterDependencies {
  handleListEvents: (
    request: ListEventsRequest,
  ) => Promise<ListEventsHandlerResponse>;
}

export interface GetEventRouteAdapterDependencies {
  handleGetEvent: (request: GetEventRequest) => Promise<GetEventHandlerResponse>;
}

export const createListEventsRouteAdapter =
  (dependencies: ListEventsRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const response = await dependencies.handleListEvents({
        query: searchParamsToObject(request.url),
      });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createGetEventRouteAdapter =
  (dependencies: GetEventRouteAdapterDependencies) =>
  async (
    _request: Request,
    context: { params: Promise<{ slug: string }> },
  ): Promise<Response> => {
    try {
      const params = await context.params;
      const response = await dependencies.handleGetEvent({ params });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
