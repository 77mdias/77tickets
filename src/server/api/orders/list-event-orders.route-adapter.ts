import { type AppErrorPayload } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type { SessionContext } from "../auth";
import { mapAppErrorToResponse } from "../error-mapper";
import type {
  ListEventOrdersHandlerResponse,
  ListEventOrdersRequest,
} from "./list-event-orders.handler";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

export interface ListEventOrdersRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleListEventOrders: (
    request: ListEventOrdersRequest,
  ) => Promise<ListEventOrdersHandlerResponse>;
}

export const createListEventOrdersRouteAdapter =
  (dependencies: ListEventOrdersRouteAdapterDependencies) =>
  async (
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

      const response = await dependencies.handleListEventOrders({
        actor,
        params: { eventId: params.slug },
      });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
