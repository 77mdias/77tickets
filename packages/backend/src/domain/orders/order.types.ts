import type { EntityId } from "../shared.types";

export type OrderStatus = "pending" | "paid" | "expired" | "cancelled";

export interface OrderItem {
  lotId: EntityId;
  quantity: number;
  unitPriceInCents: number;
}

export interface Order {
  id: EntityId;
  customerId: EntityId;
  eventId: EntityId;
  status: OrderStatus;
  items: OrderItem[];
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: Date;
}
