import { apiFetch } from "@/lib/api-client";

export type ManagementActorRole = "organizer" | "admin";

export interface ManagementActorValues {
  actorId: string;
  role: ManagementActorRole;
}

export interface PublishEventFormValues {
  eventId: string;
}

export interface UpdateEventStatusFormValues {
  eventId: string;
  targetStatus: "draft" | "published" | "cancelled";
}

export interface CreateEventFormValues {
  title: string;
  description: string;
  location: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
}

export interface CreateLotFormValues {
  eventId: string;
  title: string;
  priceInCents: string;
  totalQuantity: string;
  maxPerOrder: string;
  saleStartsAt: string;
  saleEndsAt: string;
  status: "active" | "paused" | "sold_out" | "closed";
}

export interface UpdateLotFormValues {
  lotId: string;
  title: string;
  priceInCents: string;
  totalQuantity: string;
  maxPerOrder: string;
  saleStartsAt: string;
  saleEndsAt: string;
  status: "active" | "paused" | "sold_out" | "closed";
}

export interface ListEventOrdersQueryValues {
  status?: "pending" | "paid" | "expired" | "cancelled" | "";
}

export type CouponDiscountType = "fixed" | "percentage";

export interface CouponFormValuesBase {
  code: string;
  discountType: CouponDiscountType;
  discountInCents: string;
  discountPercentage: string;
  maxRedemptions: string;
  validFrom: string;
  validUntil: string;
}

export interface CreateCouponFormValues extends CouponFormValuesBase {
  eventId: string;
}

export interface UpdateCouponFormValues extends CouponFormValuesBase {
  couponId: string;
}

export interface ManagementOperationResult {
  ok: boolean;
  status: number;
  data: unknown;
  message: string;
}

const FALLBACK_ERROR_MESSAGE =
  "Could not complete administrative operation. Please review your input and try again.";

const FALLBACK_NETWORK_MESSAGE =
  "Could not reach administrative endpoint. Please review your input and try again.";

const toIsoDateString = (value: string): string => {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toISOString();
};

const toNullableIsoDateString = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return toIsoDateString(trimmed);
};

const toNullableTrimmedString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toNumber = (value: string): number => Number(value.trim());

export const buildManagementActorHeaders = (
  actor: ManagementActorValues,
): Record<string, string> => ({
  "content-type": "application/json",
  "x-actor-id": actor.actorId.trim(),
  "x-actor-role": actor.role,
});

export const buildPublishEventPayload = (values: PublishEventFormValues) => ({
  eventId: values.eventId.trim(),
});

export const buildUpdateEventStatusPayload = (values: UpdateEventStatusFormValues) => ({
  eventId: values.eventId.trim(),
  targetStatus: values.targetStatus,
});

export const buildCreateEventPayload = (values: CreateEventFormValues) => ({
  title: values.title.trim(),
  description: toNullableTrimmedString(values.description),
  location: toNullableTrimmedString(values.location),
  imageUrl: toNullableTrimmedString(values.imageUrl),
  startsAt: toIsoDateString(values.startsAt),
  endsAt: toIsoDateString(values.endsAt),
});

export const buildCreateLotPayload = (values: CreateLotFormValues) => ({
  eventId: values.eventId.trim(),
  ...buildLotPayloadCore(values),
});

export const buildUpdateLotPayload = (values: UpdateLotFormValues) => ({
  lotId: values.lotId.trim(),
  ...buildLotPayloadCore(values),
});

export const buildListEventOrdersQuery = (values: ListEventOrdersQueryValues) => {
  const query: { status?: ListEventOrdersQueryValues["status"] } = {};

  const status = values.status?.trim();
  if (status) {
    query.status = status as NonNullable<ListEventOrdersQueryValues["status"]>;
  }

  return query;
};

const buildCouponPayloadBase = (values: CouponFormValuesBase) => ({
  code: values.code.trim(),
  discountType: values.discountType,
  discountInCents:
    values.discountType === "fixed" ? toNullablePositiveInt(values.discountInCents) : null,
  discountPercentage:
    values.discountType === "percentage"
      ? toNullablePositiveInt(values.discountPercentage)
      : null,
  maxRedemptions: Number(values.maxRedemptions.trim()),
  validFrom: toIsoDateString(values.validFrom),
  validUntil: toIsoDateString(values.validUntil),
});

export const buildCreateCouponPayload = (values: CreateCouponFormValues) => ({
  eventId: values.eventId.trim(),
  ...buildCouponPayloadBase(values),
});

export const buildUpdateCouponPayload = (values: UpdateCouponFormValues) => ({
  couponId: values.couponId.trim(),
  ...buildCouponPayloadBase(values),
});

const buildLotPayloadCore = (
  values:
    | CreateLotFormValues
    | UpdateLotFormValues,
) => ({
  title: values.title.trim(),
  priceInCents: toNumber(values.priceInCents),
  totalQuantity: toNumber(values.totalQuantity),
  maxPerOrder: toNumber(values.maxPerOrder),
  saleStartsAt: toIsoDateString(values.saleStartsAt),
  saleEndsAt: toNullableIsoDateString(values.saleEndsAt),
  status: values.status,
});

const toNullablePositiveInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
};

export const extractManagementErrorMessage = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) {
    return FALLBACK_ERROR_MESSAGE;
  }

  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) {
    return FALLBACK_ERROR_MESSAGE;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : FALLBACK_ERROR_MESSAGE;
};

const formatSuccessMessage = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) {
    return "Administrative operation completed successfully.";
  }

  const orders = (payload as { orders?: unknown }).orders;
  if (Array.isArray(orders)) {
    return `Loaded ${orders.length} orders.`;
  }

  const eventId = (payload as { eventId?: unknown }).eventId;
  const title = (payload as { title?: unknown }).title;
  if (typeof eventId === "string" && typeof title === "string" && title.trim()) {
    return `Event ${title} (${eventId}) saved successfully.`;
  }

  const lotId = (payload as { lotId?: unknown }).lotId;
  if (typeof lotId === "string") {
    if (typeof title === "string" && title.trim()) {
      return `Lot ${title} (${lotId}) saved successfully.`;
    }

    return `Lot ${lotId} saved successfully.`;
  }

  const status = (payload as { status?: unknown }).status;

  if (typeof eventId === "string" && typeof status === "string") {
    return `Event ${eventId} updated with status ${status}.`;
  }

  const couponId = (payload as { couponId?: unknown }).couponId;
  const code = (payload as { code?: unknown }).code;

  if (typeof couponId === "string") {
    if (typeof code === "string" && code.trim()) {
      return `Coupon ${code} (${couponId}) saved successfully.`;
    }

    return `Coupon ${couponId} saved successfully.`;
  }

  return "Administrative operation completed successfully.";
};

const readJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const appendQuery = (
  endpoint: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): string => {
  if (!query) {
    return endpoint;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const serialized = searchParams.toString();
  if (!serialized) {
    return endpoint;
  }

  return endpoint.includes("?") ? `${endpoint}&${serialized}` : `${endpoint}?${serialized}`;
};

export const postManagementOperation = async <TPayload>(input: {
  endpoint: string;
  actor: ManagementActorValues;
  method?: "GET" | "POST" | "PUT";
  payload?: TPayload;
  query?: Record<string, string | number | boolean | null | undefined>;
}): Promise<ManagementOperationResult> => {
  try {
    const method = input.method ?? "POST";
    const url = appendQuery(input.endpoint, input.query);
    const options: RequestInit = {
      method,
      headers: buildManagementActorHeaders(input.actor),
      ...(method === "GET" || input.payload === undefined
        ? {}
        : { body: JSON.stringify(input.payload) }),
    };

    const data = await apiFetch<unknown>(url, options);

    return {
      ok: true,
      status: 200,
      data,
      message: formatSuccessMessage(data),
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : FALLBACK_NETWORK_MESSAGE;
    return {
      ok: false,
      status: 0,
      data: null,
      message,
    };
  }
};
