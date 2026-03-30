import { type AppErrorPayload } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type { SessionContext } from "../auth";
import { mapAppErrorToResponse } from "../error-mapper";
import type {
  GetCustomerOrdersHandlerResponse,
  GetCustomerOrdersRequest,
} from "./get-customer-orders.handler";

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

export interface GetCustomerOrdersRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleGetCustomerOrders: (
    request: GetCustomerOrdersRequest,
  ) => Promise<GetCustomerOrdersHandlerResponse>;
}

export const createGetCustomerOrdersRouteAdapter =
  (dependencies: GetCustomerOrdersRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };

      const response = await dependencies.handleGetCustomerOrders({ actor });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
