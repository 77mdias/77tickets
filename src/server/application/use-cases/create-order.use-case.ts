import type { CreateOrderInput, CreateOrderResult } from "../orders";

export type { CreateOrderInput, CreateOrderResult };

export type CreateOrderUseCase = (input: CreateOrderInput) => CreateOrderResult;
