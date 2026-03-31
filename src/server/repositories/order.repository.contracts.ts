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

export interface OrderItemWithLotRecord extends OrderItemRecord {
  lotTitle: string;
}

export interface OrderTicketRecord {
  eventId: EntityId;
  lotId: EntityId;
  code: string;
}

export interface OrderWithItemsRecord {
  order: OrderRecord;
  items: OrderItemRecord[];
}

export interface OrderWithItemsAndLotRecord {
  order: OrderRecord;
  items: OrderItemWithLotRecord[];
}

export interface OrderRepository {
  findById(orderId: EntityId): Promise<OrderWithItemsRecord | null>;
  listByCustomerId(customerId: EntityId): Promise<OrderWithItemsRecord[]>;
  listByEventId(eventId: EntityId): Promise<OrderWithItemsAndLotRecord[]>;
  create(
    order: OrderRecord,
    items: OrderItemRecord[],
    tickets?: OrderTicketRecord[],
  ): Promise<OrderWithItemsRecord>;
  updateStatus(orderId: EntityId, status: OrderStatus): Promise<void>;
}
