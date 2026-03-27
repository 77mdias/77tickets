import { eq } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { orderItems, orders } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type {
  OrderItemRecord,
  OrderRecord,
  OrderRepository,
  OrderStatus,
  OrderWithItemsRecord,
} from "../order.repository.contracts";
import { mapPersistenceError } from "./map-persistence-error";

export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly db: Db) {}

  // Note: neon-http driver does not support DB-level transactions.
  // The order is inserted first; if order_items insert fails the order row remains orphaned.
  // Application-layer retry/compensation is required for production-grade atomicity.
  async create(
    order: OrderRecord,
    items: OrderItemRecord[],
  ): Promise<OrderWithItemsRecord> {
    try {
      const [insertedOrder] = await this.db
        .insert(orders)
        .values({
          id: order.id,
          customerId: order.customerId,
          eventId: order.eventId,
          status: order.status,
          subtotalInCents: order.subtotalInCents,
          discountInCents: order.discountInCents,
          totalInCents: order.totalInCents,
          createdAt: order.createdAt,
        })
        .returning();

      let createdItems: OrderItemRecord[] = [];

      if (items.length > 0) {
        const insertedItems = await this.db
          .insert(orderItems)
          .values(
            items.map((item) => ({
              orderId: insertedOrder.id,
              lotId: item.lotId,
              quantity: item.quantity,
              unitPriceInCents: item.unitPriceInCents,
            })),
          )
          .returning();

        createdItems = insertedItems.map(toOrderItemRecord);
      }

      return { order: toOrderRecord(insertedOrder), items: createdItems };
    } catch (error) {
      throw mapPersistenceError(error, "create order");
    }
  }

  async findById(orderId: EntityId): Promise<OrderWithItemsRecord | null> {
    const [orderRow] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderRow) return null;

    const itemRows = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return {
      order: toOrderRecord(orderRow),
      items: itemRows.map(toOrderItemRecord),
    };
  }

  async updateStatus(orderId: EntityId, status: OrderStatus): Promise<void> {
    try {
      await this.db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, orderId));
    } catch (error) {
      throw mapPersistenceError(error, "update order status");
    }
  }
}

function toOrderRecord(row: typeof orders.$inferSelect): OrderRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    eventId: row.eventId,
    status: row.status,
    subtotalInCents: row.subtotalInCents,
    discountInCents: row.discountInCents,
    totalInCents: row.totalInCents,
    createdAt: row.createdAt,
  };
}

function toOrderItemRecord(
  row: typeof orderItems.$inferSelect,
): OrderItemRecord {
  return {
    lotId: row.lotId,
    quantity: row.quantity,
    unitPriceInCents: row.unitPriceInCents,
  };
}
