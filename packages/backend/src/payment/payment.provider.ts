export interface PaymentOrderSnapshot {
  id: string;
  customerId: string;
  eventId: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  totalInCents: number;
}

export interface PaymentCheckoutItem {
  lotId: string;
  quantity: number;
  unitPriceInCents: number;
}

export interface PaymentCheckoutSessionInput {
  order: PaymentOrderSnapshot;
  items: PaymentCheckoutItem[];
}

export interface PaymentWebhookEvent {
  type: string;
  data: {
    object: {
      metadata?: {
        orderId?: string;
      };
    };
  };
}

export interface PaymentProvider {
  createCheckoutSession(input: PaymentCheckoutSessionInput): Promise<{ checkoutUrl: string }>;
  constructWebhookEvent(payload: string, signature: string): PaymentWebhookEvent;
}
