import type { ListEventOrdersUseCase } from "../../application/use-cases";
import type { SecurityActor } from "../../application/security";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { listEventOrdersSchema } from "../schemas";
import { parseInput } from "../validation";

export interface ListEventOrdersRequest {
  actor: SecurityActor;
  params: unknown;
}

export interface ListEventOrdersInput {
  eventId: string;
}

export interface EventOrderSummary {
  id: string;
  customerId: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: Date;
  items: Array<{
    lotId: string;
    lotTitle: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
}

export interface ListEventOrdersResult {
  orders: EventOrderSummary[];
}

export interface ListEventOrdersSuccessResponse {
  status: 200;
  body: {
    data: ListEventOrdersResult;
  };
}

export type ListEventOrdersHandlerResponse =
  | ListEventOrdersSuccessResponse
  | ErrorResponse;

export interface ListEventOrdersHandlerDependencies {
  listEventOrders: ListEventOrdersUseCase;
}

export const createListEventOrdersHandler = (
  dependencies: ListEventOrdersHandlerDependencies,
) => {
  return async (
    request: ListEventOrdersRequest,
  ): Promise<ListEventOrdersHandlerResponse> => {
    try {
      const input = parseInput(listEventOrdersSchema, request.params);
      const result = await dependencies.listEventOrders({
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
