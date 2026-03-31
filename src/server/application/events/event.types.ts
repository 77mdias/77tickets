import type { EventLifecycleStatus } from "../../domain/events";
import type { LotStatus } from "../../domain/lots";
import type { SecurityActor } from "../security";

export interface CreateEventInput {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  imageUrl: string | null;
  actorId: string;
}

export interface CreateEventResult {
  eventId: string;
  slug: string;
  status: "draft";
}

export interface CreateLotInput {
  eventId: string;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  actor: SecurityActor;
}

export interface CreateLotResult {
  lotId: string;
  eventId: string;
  status: "active";
  availableQuantity: number;
}

export interface UpdateLotInput {
  lotId: string;
  actor: SecurityActor;
  title?: string;
  priceInCents?: number;
  totalQuantity?: number;
  maxPerOrder?: number;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  status?: LotStatus;
}

export interface UpdateLotResult {
  lotId: string;
  eventId: string;
  status: LotStatus;
  availableQuantity: number;
  totalQuantity: number;
}

export interface ListEventOrdersInput {
  eventId: string;
  actor: SecurityActor;
}

export interface EventOrderListItem {
  orderId: string;
  customerId: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: Date;
  items: Array<{
    lotId: string;
    lotTitle: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
}

export interface ListEventOrdersResult {
  eventId: string;
  orders: EventOrderListItem[];
}

export interface PublishEventInput {
  eventId: string;
}

export interface PublishEventResult {
  eventId: string;
  status: "published";
}

export interface UpdateEventStatusInput {
  eventId: string;
  targetStatus: EventLifecycleStatus;
}

export interface UpdateEventStatusResult {
  eventId: string;
  status: EventLifecycleStatus;
}
