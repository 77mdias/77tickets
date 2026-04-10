import type { EntityId } from "../shared.types";

export type LotStatus = "active" | "paused" | "sold_out" | "closed";

export interface Lot {
  id: EntityId;
  eventId: EntityId;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  availableQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date;
  saleEndsAt: Date | null;
  status: LotStatus;
}
