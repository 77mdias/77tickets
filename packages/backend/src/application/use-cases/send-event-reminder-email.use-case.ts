import { createNotFoundError } from "../errors";
import type { EventRepository, OrderRepository, UserRepository } from "../../repositories";
import type { EmailProvider } from "../../email/email.provider";

export interface SendEventReminderEmailInput {
  eventId: string;
}

export interface SendEventReminderEmailResult {
  processed: number;
}

export interface SendEventReminderEmailUseCaseDependencies {
  orderRepository: Pick<OrderRepository, "listByEventId">;
  eventRepository: Pick<EventRepository, "findById">;
  userRepository: Pick<UserRepository, "findById">;
  emailProvider: Pick<EmailProvider, "sendEventReminder">;
}

export type SendEventReminderEmailUseCase = (
  input: SendEventReminderEmailInput,
) => Promise<SendEventReminderEmailResult>;

export const createSendEventReminderEmailUseCase = (
  dependencies: SendEventReminderEmailUseCaseDependencies,
): SendEventReminderEmailUseCase => {
  return async (input) => {
    const event = await dependencies.eventRepository.findById(input.eventId);

    if (!event) {
      throw createNotFoundError("Event not found", {
        details: { reason: "event_not_found" },
      });
    }

    const orders = await dependencies.orderRepository.listByEventId(input.eventId);

    let processed = 0;

    for (const orderWithItems of orders) {
      if (orderWithItems.order.status !== "paid") {
        continue;
      }

      const customer = await dependencies.userRepository.findById(
        orderWithItems.order.customerId,
      );

      if (!customer) {
        continue;
      }

      await dependencies.emailProvider.sendEventReminder({
        recipientEmail: customer.email,
        order: orderWithItems.order,
        event,
      });

      processed += 1;
    }

    return { processed };
  };
};
