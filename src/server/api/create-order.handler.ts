import type { CreateOrderUseCase } from "../application/use-cases";

import { mapAppErrorToResponse, type ErrorResponse } from "./error-mapper";
import { createOrderSchema } from "./schemas";
import { parseInput } from "./validation";

export interface CreateOrderRequest {
  body: unknown;
}

export interface CreateOrderSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<CreateOrderUseCase>>;
  };
}

export type CreateOrderHandlerResponse = CreateOrderSuccessResponse | ErrorResponse;

export interface CreateOrderHandlerDependencies {
  createOrder: CreateOrderUseCase;
}

export const createCreateOrderHandler = (
  dependencies: CreateOrderHandlerDependencies,
) => async (request: CreateOrderRequest): Promise<CreateOrderHandlerResponse> => {
  try {
    const input = parseInput(createOrderSchema, request.body);
    const result = await dependencies.createOrder(input);

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
