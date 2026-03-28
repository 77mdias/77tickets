export interface CheckoutFormValues {
  eventId: string;
  lotId: string;
  quantity: string;
  couponCode: string;
}

export interface CheckoutPayload {
  eventId: string;
  items: Array<{
    lotId: string;
    quantity: number;
  }>;
  couponCode?: string;
}

export const buildCheckoutPayload = (values: CheckoutFormValues): CheckoutPayload => {
  const couponCode = values.couponCode.trim();

  return {
    eventId: values.eventId.trim(),
    items: [
      {
        lotId: values.lotId.trim(),
        quantity: Number(values.quantity),
      },
    ],
    ...(couponCode ? { couponCode } : {}),
  };
};

export const extractCheckoutErrorMessage = (payload: unknown): string => {
  const fallback = "Could not complete checkout. Please review your input and try again.";

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
