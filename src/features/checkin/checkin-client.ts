export interface CheckinFormValues {
  ticketId: string;
  eventId: string;
}

export interface CheckinPayload {
  ticketId: string;
  eventId: string;
}

export const buildCheckinPayload = (values: CheckinFormValues): CheckinPayload => ({
  ticketId: values.ticketId.trim(),
  eventId: values.eventId.trim(),
});

export const extractCheckinErrorMessage = (payload: unknown): string => {
  const fallback = "Could not validate ticket. Please review your input and try again.";

  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
};
