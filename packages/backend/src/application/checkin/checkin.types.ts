export interface ValidateCheckinInput {
  ticketId: string;
  eventId: string;
  checkerId: string;
}

export interface ValidateCheckinAuditMetadata {
  ticketId: string;
  eventId: string;
  checkerId: string;
  validatedAt: string;
}

export interface ValidateCheckinSuccessResult
  extends ValidateCheckinAuditMetadata {
  outcome: "approved";
}

export interface ValidateCheckinFailureResult
  extends ValidateCheckinAuditMetadata {
  outcome: "rejected";
  reason:
    | "ticket_not_found"
    | "event_mismatch"
    | "ticket_used"
    | "ticket_cancelled"
    | "ticket_expired"
    | "order_not_eligible"
    | "unauthorized_checker";
}

export type ValidateCheckinResult =
  | ValidateCheckinSuccessResult
  | ValidateCheckinFailureResult;
