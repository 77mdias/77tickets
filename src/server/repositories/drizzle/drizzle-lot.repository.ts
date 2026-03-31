import { eq, sql } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { lots } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type { LotRecord, LotRepository } from "../lot.repository.contracts";
import { mapPersistenceError } from "./map-persistence-error";

export class DrizzleLotRepository implements LotRepository {
  constructor(private readonly db: Db) {}

  async findById(lotId: EntityId): Promise<LotRecord | null> {
    const [row] = await this.db
      .select()
      .from(lots)
      .where(eq(lots.id, lotId))
      .limit(1);

    return row ? toLotRecord(row) : null;
  }

  async findByEventId(eventId: EntityId): Promise<LotRecord[]> {
    const rows = await this.db
      .select()
      .from(lots)
      .where(eq(lots.eventId, eventId));

    return rows.map(toLotRecord);
  }

  async save(lot: LotRecord): Promise<void> {
    try {
      await this.db
        .insert(lots)
        .values({
          id: lot.id,
          eventId: lot.eventId,
          title: lot.title,
          priceInCents: lot.priceInCents,
          totalQuantity: lot.totalQuantity,
          availableQuantity: lot.availableQuantity,
          maxPerOrder: lot.maxPerOrder,
          saleStartsAt: lot.saleStartsAt,
          saleEndsAt: lot.saleEndsAt,
          status: lot.status,
        })
        .onConflictDoUpdate({
          target: lots.id,
          set: {
            eventId: lot.eventId,
            title: lot.title,
            priceInCents: lot.priceInCents,
            totalQuantity: lot.totalQuantity,
            availableQuantity: lot.availableQuantity,
            maxPerOrder: lot.maxPerOrder,
            saleStartsAt: lot.saleStartsAt,
            saleEndsAt: lot.saleEndsAt,
            status: lot.status,
          },
        });
    } catch (error) {
      throw mapPersistenceError(error, "save lot");
    }
  }

  async decrementAvailableQuantity(
    lotId: EntityId,
    quantity: number,
  ): Promise<void> {
    try {
      await this.db
        .update(lots)
        .set({
          availableQuantity: sql`${lots.availableQuantity} - ${quantity}`,
        })
        .where(eq(lots.id, lotId));
    } catch (error) {
      throw mapPersistenceError(error, "decrement lot available quantity");
    }
  }
}

function toLotRecord(row: typeof lots.$inferSelect): LotRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    title: row.title,
    priceInCents: row.priceInCents,
    totalQuantity: row.totalQuantity,
    availableQuantity: row.availableQuantity,
    maxPerOrder: row.maxPerOrder,
    saleStartsAt: row.saleStartsAt,
    saleEndsAt: row.saleEndsAt,
    status: row.status,
  };
}
