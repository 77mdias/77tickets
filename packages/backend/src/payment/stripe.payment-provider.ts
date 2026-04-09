import Stripe from "stripe";

import type {
  PaymentCheckoutSessionInput,
  PaymentProvider,
  PaymentWebhookEvent,
} from "./payment.provider";

export interface CreateStripePaymentProviderDependencies {
  secretKey?: string;
  webhookSecret?: string;
  appBaseUrl?: string;
}

const getRequiredEnv = (value: string | undefined, name: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is not configured`);
  }

  return normalized;
};

const getAppBaseUrl = (appBaseUrl?: string): string => {
  const fromDependency = appBaseUrl?.trim();
  if (fromDependency) {
    return fromDependency;
  }

  const fromEnv = process.env.BETTER_AUTH_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return "http://localhost:3000";
};

const mapLineItems = (items: PaymentCheckoutSessionInput["items"]): Stripe.Checkout.SessionCreateParams.LineItem[] =>
  items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: "brl",
      unit_amount: item.unitPriceInCents,
      product_data: {
        name: `Ingresso ${item.lotId}`,
      },
    },
  }));

export const createStripePaymentProvider = (
  dependencies: CreateStripePaymentProviderDependencies = {},
): PaymentProvider => {
  const secretKey = getRequiredEnv(dependencies.secretKey ?? process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");
  const webhookSecret = getRequiredEnv(
    dependencies.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET,
    "STRIPE_WEBHOOK_SECRET",
  );
  const appBaseUrl = getAppBaseUrl(dependencies.appBaseUrl);

  const stripe = new Stripe(secretKey);

  return {
    async createCheckoutSession(input) {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${appBaseUrl}/checkout/success`,
        cancel_url: `${appBaseUrl}/checkout/cancel`,
        line_items: mapLineItems(input.items),
        metadata: {
          orderId: input.order.id,
          customerId: input.order.customerId,
          eventId: input.order.eventId,
        },
        payment_intent_data: {
          metadata: {
            orderId: input.order.id,
            customerId: input.order.customerId,
            eventId: input.order.eventId,
          },
        },
      });

      if (!session.url) {
        throw new Error("Stripe checkout session URL is unavailable");
      }

      return { checkoutUrl: session.url };
    },

    constructWebhookEvent(payload, signature): PaymentWebhookEvent {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event as unknown as PaymentWebhookEvent;
    },
  };
};
