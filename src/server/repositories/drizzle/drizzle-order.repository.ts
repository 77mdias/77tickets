import { asc, eq, inArray } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { lots, orderItems, orders, tickets } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type {
  OrderItemRecord,
  OrderItemWithLotRecord,
  OrderRecord,
  OrderRepository,
  OrderStatus,
  OrderTicketRecord,
  OrderWithItemsRecord,
  OrderWithItemsAndLotRecord,
} from "../order.repository.contracts";
import { mapPersistenceError } from "./map-persistence-error";

export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly db: Db) {}

  async create(
    order: OrderRecord,
    items: OrderItemRecord[],
    ticketsToCreate: OrderTicketRecord[] = [],
  ): Promise<OrderWithItemsRecord> {
    try {
      return await this.db.transaction(async (tx) => {
        const [insertedOrder] = await tx
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
          const insertedItems = await tx
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

        if (ticketsToCreate.length > 0) {
          await tx.insert(tickets).values(
            ticketsToCreate.map((ticket) => ({
              eventId: ticket.eventId,
              orderId: insertedOrder.id,
              lotId: ticket.lotId,
              code: ticket.code,
            })),
          );
        }

        return { order: toOrderRecord(insertedOrder), items: createdItems };
      });
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

  async listByCustomerId(customerId: EntityId): Promise<OrderWithItemsRecord[]> {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(asc(orders.createdAt), asc(orders.id));

    if (orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((order) => order.id);
    const itemRows = await this.db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.orderId), asc(orderItems.id));

    const itemsByOrderId = new Map<string, OrderItemRecord[]>();

    for (const itemRow of itemRows) {
      const items = itemsByOrderId.get(itemRow.orderId) ?? [];
      items.push(toOrderItemRecord(itemRow));
      itemsByOrderId.set(itemRow.orderId, items);
    }

    return orderRows.map((orderRow) => ({
      order: toOrderRecord(orderRow),
      items: itemsByOrderId.get(orderRow.id) ?? [],
      }));
  }

  async listByEventId(eventId: EntityId): Promise<OrderWithItemsAndLotRecord[]> {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.eventId, eventId))
      .orderBy(asc(orders.createdAt), asc(orders.id));

    if (orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((order) => order.id);
    const itemRows = await this.db
      .select({
        orderId: orderItems.orderId,
        lotId: orderItems.lotId,
        lotTitle: lots.title,
        quantity: orderItems.quantity,
        unitPriceInCents: orderItems.unitPriceInCents,
      })
      .from(orderItems)
      .innerJoin(lots, eq(lots.id, orderItems.lotId))
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.orderId), asc(orderItems.id));

    const itemsByOrderId = new Map<string, OrderItemWithLotRecord[]>();

    for (const itemRow of itemRows) {
      const items = itemsByOrderId.get(itemRow.orderId) ?? [];
      items.push(toOrderItemWithLotRecord(itemRow));
      itemsByOrderId.set(itemRow.orderId, items);
    }

    return orderRows.map((orderRow) => ({
      order: toOrderRecord(orderRow),
      items: itemsByOrderId.get(orderRow.id) ?? [],
    }));
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

function toOrderItemWithLotRecord(row: {
  lotId: string;
  lotTitle: string;
  quantity: number;
  unitPriceInCents: number;
}): OrderItemWithLotRecord {
  return {
    lotId: row.lotId,
    lotTitle: row.lotTitle,
    quantity: row.quantity,
    unitPriceInCents: row.unitPriceInCents,
  };
}
