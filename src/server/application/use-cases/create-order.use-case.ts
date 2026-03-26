export interface CreateOrderInput {
  eventId: string;
  quantity: number;
}

export interface CreateOrderResult {
  orderId: string;
  eventId: string;
  quantity: number;
  status: "pending";
}

export type CreateOrderUseCase = (input: CreateOrderInput) => CreateOrderResult;
