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

export interface CheckoutRedirectTarget {
  checkoutUrl: string;
  isExternal: boolean;
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

const getCheckoutUrlCandidate = (payload: unknown): unknown => {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const directCheckoutUrl = (payload as { checkoutUrl?: unknown }).checkoutUrl;
  if (directCheckoutUrl !== undefined) {
    return directCheckoutUrl;
  }

  const data = (payload as { data?: { checkoutUrl?: unknown } }).data;
  return data?.checkoutUrl;
};

export const extractCheckoutRedirectTarget = (
  payload: unknown,
): CheckoutRedirectTarget | null => {
  const checkoutUrl = getCheckoutUrlCandidate(payload);

  if (typeof checkoutUrl !== "string") {
    return null;
  }

  const normalizedCheckoutUrl = checkoutUrl.trim();
  if (!normalizedCheckoutUrl) {
    return null;
  }

  return {
    checkoutUrl: normalizedCheckoutUrl,
    isExternal:
      normalizedCheckoutUrl.startsWith("http://") || normalizedCheckoutUrl.startsWith("https://"),
  };
};
