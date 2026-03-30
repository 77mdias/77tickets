import { createAuthorizationError } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type { GetCustomerOrdersUseCase } from "../../application/use-cases";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";

export interface GetCustomerOrdersRequest {
  actor: SecurityActor;
}

export interface GetCustomerOrdersSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<GetCustomerOrdersUseCase>>;
  };
}

export type GetCustomerOrdersHandlerResponse =
  | GetCustomerOrdersSuccessResponse
  | ErrorResponse;

export interface GetCustomerOrdersHandlerDependencies {
  getCustomerOrders: GetCustomerOrdersUseCase;
}

const assertGetCustomerOrdersAccess = (actor: SecurityActor): void => {
  if (actor.role === "customer" || actor.role === "admin") {
    return;
  }

  throw createAuthorizationError("Forbidden");
};

export const createGetCustomerOrdersHandler = (
  dependencies: GetCustomerOrdersHandlerDependencies,
) => {
  return async (
    request: GetCustomerOrdersRequest,
  ): Promise<GetCustomerOrdersHandlerResponse> => {
    try {
      assertGetCustomerOrdersAccess(request.actor);

      const result = await dependencies.getCustomerOrders({
        customerId: request.actor.userId,
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
