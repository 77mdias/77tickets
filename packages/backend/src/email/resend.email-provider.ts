import { Resend } from "resend";

import type {
  EmailProvider,
  SendEventReminderEmailInput,
  SendOrderConfirmationEmailInput,
} from "./email.provider";
import { renderEventReminderEmail } from "./templates/event-reminder.template";
import { renderOrderConfirmationEmail } from "./templates/order-confirmation.template";

interface Logger {
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface CreateResendEmailProviderDependencies {
  apiKey?: string;
  fromEmail?: string;
  appBaseUrl?: string;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
}

const DEFAULT_RETRY_DELAYS_IN_MS = [1000, 2000, 4000] as const;

const toTrimmedOrNull = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const createSleep = (): ((ms: number) => Promise<void>) => (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createDefaultLogger = (): Logger => ({
  warn: (message, metadata) => {
    console.warn(message, metadata);
  },
  error: (message, metadata) => {
    console.error(message, metadata);
  },
});

export const createResendEmailProvider = (
  dependencies: CreateResendEmailProviderDependencies = {},
): EmailProvider => {
  const apiKey = toTrimmedOrNull(dependencies.apiKey ?? process.env.RESEND_API_KEY);
  const fromEmail = toTrimmedOrNull(dependencies.fromEmail ?? process.env.EMAIL_FROM);
  const appBaseUrl =
    toTrimmedOrNull(
      dependencies.appBaseUrl ??
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL,
    ) ?? "http://localhost:3000";

  const sleep = dependencies.sleep ?? createSleep();
  const logger = dependencies.logger ?? createDefaultLogger();
  const resend = apiKey ? new Resend(apiKey) : null;

  const runWithRetry = async (
    action: () => Promise<void>,
    context: Record<string, unknown>,
  ): Promise<void> => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= DEFAULT_RETRY_DELAYS_IN_MS.length; attempt += 1) {
      try {
        await action();
        return;
      } catch (error) {
        lastError = error;
        logger.warn("Email send attempt failed", { ...context, attempt });
        await sleep(DEFAULT_RETRY_DELAYS_IN_MS[attempt - 1]);
      }
    }

    logger.error("Email send failed after all retries", {
      ...context,
      maxAttempts: DEFAULT_RETRY_DELAYS_IN_MS.length,
      error: lastError instanceof Error ? lastError.message : "unknown_error",
    });
  };

  const sendOrderConfirmation = async (
    input: SendOrderConfirmationEmailInput,
  ): Promise<void> => {
    if (!resend || !fromEmail) {
      logger.warn("Email provider is disabled due to missing configuration", {
        reason: "missing_resend_configuration",
      });
      return;
    }

    const html = renderOrderConfirmationEmail({
      ...input,
      appBaseUrl,
    });

    await runWithRetry(async () => {
      await resend.emails.send({
        from: fromEmail,
        to: input.recipientEmail,
        subject: `Compra confirmada - ${input.event.title}`,
        html,
      });
    }, {
      orderId: input.order.id,
      eventId: input.event.id,
      recipientEmail: input.recipientEmail,
      template: "order_confirmation",
    });
  };

  const sendEventReminder = async (
    input: SendEventReminderEmailInput,
  ): Promise<void> => {
    if (!resend || !fromEmail) {
      logger.warn("Email provider is disabled due to missing configuration", {
        reason: "missing_resend_configuration",
      });
      return;
    }

    const html = renderEventReminderEmail({
      ...input,
      appBaseUrl,
    });

    await runWithRetry(async () => {
      await resend.emails.send({
        from: fromEmail,
        to: input.recipientEmail,
        subject: `Lembrete: ${input.event.title} acontece em breve`,
        html,
      });
    }, {
      orderId: input.order.id,
      eventId: input.event.id,
      recipientEmail: input.recipientEmail,
      template: "event_reminder",
    });
  };

  return {
    sendOrderConfirmation,
    sendEventReminder,
  };
};

