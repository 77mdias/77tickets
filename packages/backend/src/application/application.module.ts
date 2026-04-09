import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DatabaseModule, EVENT_REPOSITORY, LOT_REPOSITORY, ORDER_REPOSITORY, TICKET_REPOSITORY, COUPON_REPOSITORY, USER_REPOSITORY } from '../infrastructure/database/database.module';
import { EmailModule, EMAIL_PROVIDER } from '../email/email.module';
import { PaymentModule, PAYMENT_PROVIDER } from '../payment/payment.module';

import { createCancelOrderOnPaymentFailureUseCase } from './use-cases/cancel-order-on-payment-failure.use-case';
import { createConfirmOrderPaymentUseCase } from './use-cases/confirm-order-payment.use-case';
import { createCreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { createCreateEventUseCase } from './use-cases/create-event.use-case';
import { createCreateLotUseCase } from './use-cases/create-lot.use-case';
import { createCreateOrderUseCase } from './use-cases/create-order.use-case';
import { createCreateStripeCheckoutSessionUseCase } from './use-cases/create-stripe-checkout-session.use-case';
import { createGetCustomerOrdersUseCase } from './use-cases/get-customer-orders.use-case';
import { createGetEventAnalyticsUseCase } from './use-cases/get-event-analytics.use-case';
import { createGetEventDetailUseCase } from './use-cases/get-event-detail.use-case';
import { createListEventOrdersUseCase } from './use-cases/list-event-orders.use-case';
import { createListPublishedEventsUseCase } from './use-cases/list-published-events.use-case';
import { createPublishEventUseCase } from './use-cases/publish-event.use-case';
import { createSendEventReminderEmailUseCase } from './use-cases/send-event-reminder-email.use-case';
import { createSendOrderConfirmationEmailUseCase } from './use-cases/send-order-confirmation-email.use-case';
import { createSimulatePaymentUseCase } from './use-cases/simulate-payment.use-case';
import { createUpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { createUpdateEventStatusUseCase } from './use-cases/update-event-status.use-case';
import { createUpdateLotUseCase } from './use-cases/update-lot.use-case';
import { createValidateCheckinUseCase } from './use-cases/validate-checkin.use-case';

export const CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE = 'CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE';
export const CONFIRM_ORDER_PAYMENT_USE_CASE = 'CONFIRM_ORDER_PAYMENT_USE_CASE';
export const CREATE_COUPON_USE_CASE = 'CREATE_COUPON_USE_CASE';
export const CREATE_EVENT_USE_CASE = 'CREATE_EVENT_USE_CASE';
export const CREATE_LOT_USE_CASE = 'CREATE_LOT_USE_CASE';
export const CREATE_ORDER_USE_CASE = 'CREATE_ORDER_USE_CASE';
export const CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE = 'CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE';
export const GET_CUSTOMER_ORDERS_USE_CASE = 'GET_CUSTOMER_ORDERS_USE_CASE';
export const GET_EVENT_ANALYTICS_USE_CASE = 'GET_EVENT_ANALYTICS_USE_CASE';
export const GET_EVENT_DETAIL_USE_CASE = 'GET_EVENT_DETAIL_USE_CASE';
export const LIST_EVENT_ORDERS_USE_CASE = 'LIST_EVENT_ORDERS_USE_CASE';
export const LIST_PUBLISHED_EVENTS_USE_CASE = 'LIST_PUBLISHED_EVENTS_USE_CASE';
// createPublishEventUseCase requires organizerId at construction time (per-request).
// Controllers inject this factory and call it with the authenticated user's ID.
export const CREATE_PUBLISH_EVENT_FOR_ORGANIZER = 'CREATE_PUBLISH_EVENT_FOR_ORGANIZER';
export const SEND_EVENT_REMINDER_EMAIL_USE_CASE = 'SEND_EVENT_REMINDER_EMAIL_USE_CASE';
export const SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE = 'SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE';
export const SIMULATE_PAYMENT_USE_CASE = 'SIMULATE_PAYMENT_USE_CASE';
export const UPDATE_COUPON_USE_CASE = 'UPDATE_COUPON_USE_CASE';
export const UPDATE_EVENT_STATUS_USE_CASE = 'UPDATE_EVENT_STATUS_USE_CASE';
export const UPDATE_LOT_USE_CASE = 'UPDATE_LOT_USE_CASE';
export const VALIDATE_CHECKIN_USE_CASE = 'VALIDATE_CHECKIN_USE_CASE';

@Module({
  imports: [DatabaseModule, EmailModule, PaymentModule],
  providers: [
    {
      provide: CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE,
      inject: [ORDER_REPOSITORY, LOT_REPOSITORY],
      useFactory: (orderRepository: any, lotRepository: any) =>
        createCancelOrderOnPaymentFailureUseCase({ orderRepository, lotRepository }),
    },
    {
      provide: SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE,
      inject: [ORDER_REPOSITORY, TICKET_REPOSITORY, EVENT_REPOSITORY, USER_REPOSITORY, EMAIL_PROVIDER],
      useFactory: (orderRepository: any, ticketRepository: any, eventRepository: any, userRepository: any, emailProvider: any) =>
        createSendOrderConfirmationEmailUseCase({
          orderRepository,
          ticketRepository,
          eventRepository,
          userRepository,
          emailProvider,
        }),
    },
    {
      provide: CONFIRM_ORDER_PAYMENT_USE_CASE,
      inject: [ORDER_REPOSITORY, TICKET_REPOSITORY, COUPON_REPOSITORY, SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE],
      useFactory: (orderRepository: any, ticketRepository: any, couponRepository: any, sendOrderConfirmationEmail: any) =>
        createConfirmOrderPaymentUseCase({
          orderRepository,
          ticketRepository,
          couponRepository,
          sendOrderConfirmationEmail,
        }),
    },
    {
      provide: CREATE_COUPON_USE_CASE,
      inject: [COUPON_REPOSITORY],
      useFactory: (couponRepository: any) =>
        createCreateCouponUseCase({ couponRepository }),
    },
    {
      provide: CREATE_EVENT_USE_CASE,
      inject: [EVENT_REPOSITORY],
      useFactory: (eventRepository: any) =>
        createCreateEventUseCase({
          generateEventId: () => randomUUID(),
          eventRepository,
        }),
    },
    {
      provide: CREATE_LOT_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepository: any, lotRepository: any) =>
        createCreateLotUseCase({
          generateLotId: () => randomUUID(),
          eventRepository,
          lotRepository,
        }),
    },
    {
      provide: CREATE_ORDER_USE_CASE,
      inject: [ORDER_REPOSITORY, LOT_REPOSITORY, COUPON_REPOSITORY],
      useFactory: (orderRepository: any, lotRepository: any, couponRepository: any) =>
        createCreateOrderUseCase({
          now: () => new Date(),
          generateOrderId: () => randomUUID(),
          orderRepository,
          lotRepository,
          couponRepository,
        }),
    },
    {
      provide: CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE,
      inject: [ORDER_REPOSITORY, PAYMENT_PROVIDER],
      useFactory: (orderRepository: any, paymentProvider: any) =>
        createCreateStripeCheckoutSessionUseCase({ orderRepository, paymentProvider }),
    },
    {
      provide: GET_CUSTOMER_ORDERS_USE_CASE,
      inject: [ORDER_REPOSITORY, TICKET_REPOSITORY],
      useFactory: (orderRepository: any, ticketRepository: any) =>
        createGetCustomerOrdersUseCase({ orderRepository, ticketRepository }),
    },
    {
      provide: GET_EVENT_ANALYTICS_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY, ORDER_REPOSITORY, TICKET_REPOSITORY],
      useFactory: (eventRepository: any, lotRepository: any, orderRepository: any, ticketRepository: any) =>
        createGetEventAnalyticsUseCase({
          eventRepository,
          lotRepository,
          orderRepository,
          ticketRepository,
        }),
    },
    {
      provide: GET_EVENT_DETAIL_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepository: any, lotRepository: any) =>
        createGetEventDetailUseCase({
          now: () => new Date(),
          eventRepository,
          lotRepository,
        }),
    },
    {
      provide: LIST_EVENT_ORDERS_USE_CASE,
      inject: [EVENT_REPOSITORY, ORDER_REPOSITORY],
      useFactory: (eventRepository: any, orderRepository: any) =>
        createListEventOrdersUseCase({ eventRepository, orderRepository }),
    },
    {
      provide: LIST_PUBLISHED_EVENTS_USE_CASE,
      inject: [EVENT_REPOSITORY],
      useFactory: (eventRepository: any) =>
        createListPublishedEventsUseCase({ eventRepository }),
    },
    {
      provide: CREATE_PUBLISH_EVENT_FOR_ORGANIZER,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepository: any, lotRepository: any) =>
        (organizerId: string) =>
          createPublishEventUseCase({ organizerId, eventRepository, lotRepository }),
    },
    {
      provide: SEND_EVENT_REMINDER_EMAIL_USE_CASE,
      inject: [ORDER_REPOSITORY, EVENT_REPOSITORY, USER_REPOSITORY, EMAIL_PROVIDER],
      useFactory: (orderRepository: any, eventRepository: any, userRepository: any, emailProvider: any) =>
        createSendEventReminderEmailUseCase({
          orderRepository,
          eventRepository,
          userRepository,
          emailProvider,
        }),
    },
    {
      provide: SIMULATE_PAYMENT_USE_CASE,
      inject: [CONFIRM_ORDER_PAYMENT_USE_CASE],
      useFactory: (confirmOrderPayment: any) =>
        createSimulatePaymentUseCase({ confirmOrderPayment }),
    },
    {
      provide: UPDATE_COUPON_USE_CASE,
      inject: [COUPON_REPOSITORY],
      useFactory: (couponRepository: any) =>
        createUpdateCouponUseCase({ couponRepository }),
    },
    {
      provide: UPDATE_EVENT_STATUS_USE_CASE,
      inject: [EVENT_REPOSITORY],
      useFactory: (eventRepository: any) =>
        createUpdateEventStatusUseCase({ eventRepository }),
    },
    {
      provide: UPDATE_LOT_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepository: any, lotRepository: any) =>
        createUpdateLotUseCase({ eventRepository, lotRepository }),
    },
    {
      provide: VALIDATE_CHECKIN_USE_CASE,
      inject: [TICKET_REPOSITORY, ORDER_REPOSITORY],
      useFactory: (ticketRepository: any, orderRepository: any) =>
        createValidateCheckinUseCase({
          now: () => new Date(),
          ticketRepository,
          orderRepository,
        }),
    },
  ],
  exports: [
    CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE,
    CONFIRM_ORDER_PAYMENT_USE_CASE,
    CREATE_COUPON_USE_CASE,
    CREATE_EVENT_USE_CASE,
    CREATE_LOT_USE_CASE,
    CREATE_ORDER_USE_CASE,
    CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE,
    GET_CUSTOMER_ORDERS_USE_CASE,
    GET_EVENT_ANALYTICS_USE_CASE,
    GET_EVENT_DETAIL_USE_CASE,
    LIST_EVENT_ORDERS_USE_CASE,
    LIST_PUBLISHED_EVENTS_USE_CASE,
    CREATE_PUBLISH_EVENT_FOR_ORGANIZER,
    SEND_EVENT_REMINDER_EMAIL_USE_CASE,
    SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE,
    SIMULATE_PAYMENT_USE_CASE,
    UPDATE_COUPON_USE_CASE,
    UPDATE_EVENT_STATUS_USE_CASE,
    UPDATE_LOT_USE_CASE,
    VALIDATE_CHECKIN_USE_CASE,
  ],
})
export class ApplicationModule {}
