import type { EntityId } from "./common.repository.contracts";
import type { LotStatus } from "../domain/lots";

export type { LotStatus };

export interface LotRecord {
  id: EntityId;
  eventId: EntityId;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  availableQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  status: LotStatus;
}

export interface LotRepository {
  findById(lotId: EntityId): Promise<LotRecord | null>;
  findByIds(lotIds: EntityId[]): Promise<LotRecord[]>;
  findByEventId(eventId: EntityId): Promise<LotRecord[]>;
  save(lot: LotRecord): Promise<void>;
  decrementAvailableQuantity(lotId: EntityId, quantity: number): Promise<boolean>;
  incrementAvailableQuantity(lotId: EntityId, quantity: number): Promise<void>;
}
