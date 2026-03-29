export interface PublishEventInput {
  eventId: string;
}

export interface PublishEventResult {
  eventId: string;
  status: "published";
}
