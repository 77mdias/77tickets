import type { EntityId } from "./common.repository.contracts";
import type { OrderStatus } from "../domain/orders";

export type { OrderStatus };

export interface OrderRecord {
  id: EntityId;
  customerId: EntityId;
  eventId: EntityId;
  status: OrderStatus;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: Date;
}

export interface OrderItemRecord {
  lotId: EntityId;
  quantity: number;
  unitPriceInCents: number;
}

export interface OrderWithItemsRecord {
  order: OrderRecord;
  items: OrderItemRecord[];
}

export interface OrderRepository {
  findById(orderId: EntityId): Promise<OrderWithItemsRecord | null>;
  create(order: OrderRecord, items: OrderItemRecord[]): Promise<OrderWithItemsRecord>;
  updateStatus(orderId: EntityId, status: OrderStatus): Promise<void>;
}
