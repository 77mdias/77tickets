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

const toNullablePositiveInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
};

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

  const eventId = (payload as { eventId?: unknown }).eventId;
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

export const postManagementOperation = async <TPayload>(input: {
  endpoint: string;
  actor: ManagementActorValues;
  payload: TPayload;
}): Promise<ManagementOperationResult> => {
  try {
    const response = await fetch(input.endpoint, {
      method: "POST",
      headers: buildManagementActorHeaders(input.actor),
      body: JSON.stringify(input.payload),
    });

    const parsed = await readJsonSafely(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: parsed,
        message: extractManagementErrorMessage(parsed),
      };
    }

    const data =
      typeof parsed === "object" && parsed !== null
        ? (parsed as { data?: unknown }).data
        : undefined;

    return {
      ok: true,
      status: response.status,
      data,
      message: formatSuccessMessage(data),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      message: FALLBACK_NETWORK_MESSAGE,
    };
  }
};
