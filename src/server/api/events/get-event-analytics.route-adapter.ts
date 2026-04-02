import { type AppErrorPayload } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type { SessionContext } from "../auth";
import { mapAppErrorToResponse } from "../error-mapper";
import type {
  GetEventAnalyticsHandlerResponse,
  GetEventAnalyticsRequest,
} from "./get-event-analytics.handler";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

export interface GetEventAnalyticsRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleGetEventAnalytics: (
    request: GetEventAnalyticsRequest,
  ) => Promise<GetEventAnalyticsHandlerResponse>;
}

export const createGetEventAnalyticsRouteAdapter = (
  dependencies: GetEventAnalyticsRouteAdapterDependencies,
) => {
  return async (
    request: Request,
    context: { params: Promise<{ slug: string }> },
  ): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const params = await context.params;
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };

      const response = await dependencies.handleGetEventAnalytics({
        actor,
        params,
      });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
};
