import type { CreateOrderInput, CreateOrderResult } from "../orders";
import { createConflictError, isAppError } from "../errors";
import { applyCouponDiscount, validateCouponEligibility } from "../../domain/coupons";
import { validateLotForPurchase } from "../../domain/lots";
import type {
  CouponRecord,
  CouponRepository,
  LotRecord,
  LotRepository,
  OrderItemRecord,
  OrderTicketRecord,
  OrderRepository,
} from "../../repositories";

export type { CreateOrderInput, CreateOrderResult };

export type CreateOrderUseCase = (input: CreateOrderInput) => Promise<CreateOrderResult>;

export interface CreateOrderUseCaseDependencies {
  now: () => Date;
  generateOrderId: () => string;
  generateTicketCode?: () => string;
  orderRepository: Pick<OrderRepository, "create">;
  lotRepository: Pick<LotRepository, "findById">;
  couponRepository: Pick<CouponRepository, "findByCodeForEvent" | "incrementRedemptionCount">;
  observability?: CreateOrderUseCaseObservability;
}

export interface CreateOrderUseCaseTelemetryEntry {
  event: "checkout.create_order.use_case";
  outcome: "success" | "failure";
  errorCode: "validation" | "authorization" | "not-found" | "conflict" | "internal" | null;
  errorReason: string | null;
  eventId: string;
  itemsCount: number;
  couponApplied: boolean;
}

export interface CreateOrderUseCaseObservability {
  trackCreateOrderExecution(entry: CreateOrderUseCaseTelemetryEntry): void | Promise<void>;
}

interface ResolvedOrderItem {
  lotId: string;
  quantity: number;
  unitPriceInCents: number;
}

const createOrderConflictError = (reason: string) =>
  createConflictError("Create order conflict", { details: { reason } });

const toCouponDiscountType = (coupon: CouponRecord): "fixed" | "percentage" =>
  coupon.discountPercentage !== null ? "percentage" : "fixed";

const normalizeSaleStartsAt = (lot: LotRecord): Date => lot.saleStartsAt ?? new Date(0);

const calculateSubtotal = (items: ResolvedOrderItem): number => items.quantity * items.unitPriceInCents;

const fallbackGenerateTicketCode = (): string => {
  const randomToken =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  return `TKT-${randomToken}`;
};

const createTicketsForItems = (
  items: ResolvedOrderItem[],
  eventId: string,
  generateTicketCode: () => string,
): OrderTicketRecord[] => {
  const tickets: OrderTicketRecord[] = [];

  for (const item of items) {
    for (let index = 0; index < item.quantity; index += 1) {
      tickets.push({
        eventId,
        lotId: item.lotId,
        code: generateTicketCode(),
      });
    }
  }

  return tickets;
};

const trackUseCaseExecution = async (
  observability: CreateOrderUseCaseObservability | undefined,
  entry: CreateOrderUseCaseTelemetryEntry,
): Promise<void> => {
  if (!observability) {
    return;
  }

  try {
    await observability.trackCreateOrderExecution(entry);
  } catch {
    // Best-effort observability. Use-case behavior must remain stable.
  }
};

export const createCreateOrderUseCase = (dependencies: CreateOrderUseCaseDependencies) => {
  const generateTicketCode = dependencies.generateTicketCode ?? fallbackGenerateTicketCode;

  const resolveItem = async (
    input: CreateOrderInput,
    item: CreateOrderInput["items"][number],
  ): Promise<ResolvedOrderItem> => {
    const lot = await dependencies.lotRepository.findById(item.lotId);

    if (!lot) {
      throw createOrderConflictError("lot_not_found");
    }

    if (lot.eventId !== input.eventId) {
      throw createOrderConflictError("lot_event_mismatch");
    }

    const lotValidation = validateLotForPurchase(
      {
        ...lot,
        saleStartsAt: normalizeSaleStartsAt(lot),
      },
      item.quantity,
      dependencies.now(),
    );

    if (!lotValidation.ok) {
      throw createOrderConflictError(lotValidation.reason);
    }

    return {
      lotId: lot.id,
      quantity: item.quantity,
      unitPriceInCents: lot.priceInCents,
    };
  };

  return async (input: CreateOrderInput): Promise<CreateOrderResult> => {
    try {
      const items = await Promise.all(input.items.map((item) => resolveItem(input, item)));

      const subtotalInCents = items.reduce(
        (subtotal, item) => subtotal + calculateSubtotal(item),
        0,
      );

      let discountInCents = 0;
      let couponIdToRedeem: string | null = null;

      if (input.couponCode !== undefined) {
        const coupon = await dependencies.couponRepository.findByCodeForEvent(
          input.couponCode,
          input.eventId,
        );

        if (!coupon) {
          throw createOrderConflictError("invalid_coupon");
        }

        const couponEligibility = validateCouponEligibility(
          {
            ...coupon,
            discountType: toCouponDiscountType(coupon),
          },
          input.eventId,
          dependencies.now(),
        );

        if (!couponEligibility.ok) {
          throw createOrderConflictError("invalid_coupon");
        }

        discountInCents = applyCouponDiscount(
          {
            ...coupon,
            discountType: toCouponDiscountType(coupon),
          },
          subtotalInCents,
        );
        couponIdToRedeem = coupon.id;
      }

      const totalInCents = subtotalInCents - discountInCents;
      const createdAt = dependencies.now();
      const orderId = dependencies.generateOrderId();

      await dependencies.orderRepository.create(
        {
          id: orderId,
          customerId: input.customerId,
          eventId: input.eventId,
          status: "pending",
          subtotalInCents,
          discountInCents,
          totalInCents,
          createdAt,
        },
        items.map<OrderItemRecord>((item) => ({
          lotId: item.lotId,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
        })),
        createTicketsForItems(items, input.eventId, generateTicketCode),
      );

      if (couponIdToRedeem !== null) {
        await dependencies.couponRepository.incrementRedemptionCount(couponIdToRedeem);
      }

      await trackUseCaseExecution(dependencies.observability, {
        event: "checkout.create_order.use_case",
        outcome: "success",
        errorCode: null,
        errorReason: null,
        eventId: input.eventId,
        itemsCount: input.items.length,
        couponApplied: input.couponCode !== undefined,
      });

      return {
        orderId,
        eventId: input.eventId,
        customerId: input.customerId,
        status: "pending",
        subtotalInCents,
        discountInCents,
        totalInCents,
        items,
      };
    } catch (error) {
      const appError = isAppError(error) ? error : null;
      const errorReason =
        appError?.details?.reason && typeof appError.details.reason === "string"
          ? appError.details.reason
          : null;

      await trackUseCaseExecution(dependencies.observability, {
        event: "checkout.create_order.use_case",
        outcome: "failure",
        errorCode: appError?.code ?? "internal",
        errorReason,
        eventId: input.eventId,
        itemsCount: input.items.length,
        couponApplied: input.couponCode !== undefined,
      });

      throw error;
    }
  };
};
