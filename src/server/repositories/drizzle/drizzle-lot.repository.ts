import { eq, sql } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { lots } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type { LotRecord, LotRepository } from "../lot.repository.contracts";

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

  async decrementAvailableQuantity(
    lotId: EntityId,
    quantity: number,
  ): Promise<void> {
    await this.db
      .update(lots)
      .set({
        availableQuantity: sql`${lots.availableQuantity} - ${quantity}`,
      })
      .where(eq(lots.id, lotId));
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
