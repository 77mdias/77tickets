interface AuditTrailLogger {
  info: (...args: unknown[]) => void;
}

export interface AuditTrailDependencies {
  logger?: AuditTrailLogger;
}

export interface OrderCreatedAuditEntry {
  orderId: string;
  customerId: string;
  eventId: string;
  totalInCents: number;
  timestamp: string;
}

export interface CheckinValidatedAuditEntry {
  ticketId: string;
  checkerId: string;
  eventId: string;
  outcome: string;
  timestamp: string;
}

export interface EventPublishedAuditEntry {
  eventId: string;
  organizerId: string;
  timestamp: string;
}

export const createAuditTrail = (dependencies: AuditTrailDependencies = {}) => {
  const logger = dependencies.logger ?? console;

  return {
    logOrderCreated: (entry: OrderCreatedAuditEntry): void => {
      logger.info("[audit-trail][order.created]", JSON.stringify(entry));
    },
    logCheckinValidated: (entry: CheckinValidatedAuditEntry): void => {
      logger.info("[audit-trail][checkin.validated]", JSON.stringify(entry));
    },
    logEventPublished: (entry: EventPublishedAuditEntry): void => {
      logger.info("[audit-trail][event.published]", JSON.stringify(entry));
    },
  };
};
