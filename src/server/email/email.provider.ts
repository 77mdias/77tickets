import type { EventRecord, OrderRecord, TicketRecord } from "../repositories";

export interface OrderConfirmationEmailTicket extends TicketRecord {
  qrDataUrl: string;
}

export interface SendOrderConfirmationEmailInput {
  recipientEmail: string;
  order: OrderRecord;
  event: EventRecord;
  tickets: OrderConfirmationEmailTicket[];
  appBaseUrl?: string;
}

export interface SendEventReminderEmailInput {
  recipientEmail: string;
  order: OrderRecord;
  event: EventRecord;
  appBaseUrl?: string;
}

export interface EmailProvider {
  sendOrderConfirmation(input: SendOrderConfirmationEmailInput): Promise<void>;
  sendEventReminder(input: SendEventReminderEmailInput): Promise<void>;
}

