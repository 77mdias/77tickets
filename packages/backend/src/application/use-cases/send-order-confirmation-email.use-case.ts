import QRCode from "qrcode";

import { createNotFoundError } from "../errors";
import type { EventRepository, OrderRepository, TicketRepository, UserRepository } from "../../repositories";
import type { EmailProvider, OrderConfirmationEmailTicket } from "../../email/email.provider";

export interface SendOrderConfirmationEmailInput {
  orderId: string;
}

export interface SendOrderConfirmationEmailUseCaseDependencies {
  orderRepository: Pick<OrderRepository, "findById">;
  ticketRepository: Pick<TicketRepository, "listByOrderId">;
  eventRepository: Pick<EventRepository, "findById">;
  userRepository: Pick<UserRepository, "findById">;
  emailProvider: Pick<EmailProvider, "sendOrderConfirmation">;
  generateQrDataUrl?: (value: string) => Promise<string>;
}

export type SendOrderConfirmationEmailUseCase = (
  input: SendOrderConfirmationEmailInput,
) => Promise<void>;

const defaultGenerateQrDataUrl = async (value: string): Promise<string> =>
  QRCode.toDataURL(value);

export const createSendOrderConfirmationEmailUseCase = (
  dependencies: SendOrderConfirmationEmailUseCaseDependencies,
): SendOrderConfirmationEmailUseCase => {
  const generateQrDataUrl = dependencies.generateQrDataUrl ?? defaultGenerateQrDataUrl;

  return async (input) => {
    const orderWithItems = await dependencies.orderRepository.findById(input.orderId);

    if (!orderWithItems) {
      throw createNotFoundError("Order not found", {
        details: { reason: "order_not_found" },
      });
    }

    if (orderWithItems.order.status !== "paid") {
      return;
    }

    const [event, customer] = await Promise.all([
      dependencies.eventRepository.findById(orderWithItems.order.eventId),
      dependencies.userRepository.findById(orderWithItems.order.customerId),
    ]);

    if (!event) {
      throw createNotFoundError("Event not found", {
        details: { reason: "event_not_found" },
      });
    }

    if (!customer) {
      throw createNotFoundError("Customer not found", {
        details: { reason: "customer_not_found" },
      });
    }

    const tickets = await dependencies.ticketRepository.listByOrderId(orderWithItems.order.id);

    const ticketsWithQr = await Promise.all(
      tickets.map(async (ticket): Promise<OrderConfirmationEmailTicket> => ({
        ...ticket,
        qrDataUrl: await generateQrDataUrl(ticket.code),
      })),
    );

    await dependencies.emailProvider.sendOrderConfirmation({
      recipientEmail: customer.email,
      order: orderWithItems.order,
      event,
      tickets: ticketsWithQr,
    });
  };
};
