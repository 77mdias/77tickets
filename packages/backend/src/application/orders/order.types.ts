export interface CreateOrderItemInput {
  lotId: string;
  quantity: number;
}

export interface CreateOrderInput {
  eventId: string;
  customerId: string;
  items: CreateOrderItemInput[];
  couponCode?: string;
}

export interface CreateOrderItemResult {
  lotId: string;
  quantity: number;
  unitPriceInCents: number;
}

export interface CreateOrderResult {
  orderId: string;
  eventId: string;
  customerId: string;
  status: "pending";
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  items: CreateOrderItemResult[];
}
