import type { EntityId } from "../shared.types";

export type EventLifecycleStatus = "draft" | "published" | "cancelled";

export interface Event {
  id: EntityId;
  organizerId: EntityId;
  slug: string;
  title: string;
  status: EventLifecycleStatus;
  startsAt: Date;
  endsAt: Date | null;
}
