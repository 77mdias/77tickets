import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import {
  CREATE_ORDER_USE_CASE,
  GET_CUSTOMER_ORDERS_USE_CASE,
  SIMULATE_PAYMENT_USE_CASE,
  CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE,
} from '../../application/application.module';
import type { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import type { GetCustomerOrdersUseCase } from '../../application/use-cases/get-customer-orders.use-case';
import type { SimulatePaymentUseCase } from '../../application/use-cases/simulate-payment.use-case';
import type { CreateStripeCheckoutSessionUseCase } from '../../application/use-cases/create-stripe-checkout-session.use-case';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

const createOrderSchema = z
  .object({
    eventId: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            lotId: z.string().uuid(),
            quantity: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
    couponCode: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

@Controller('api/orders')
export class OrdersController {
  constructor(
    @Inject(CREATE_ORDER_USE_CASE) private readonly createOrder: CreateOrderUseCase,
    @Inject(GET_CUSTOMER_ORDERS_USE_CASE)
    private readonly getCustomerOrders: GetCustomerOrdersUseCase,
    @Inject(SIMULATE_PAYMENT_USE_CASE)
    private readonly simulatePayment: SimulatePaymentUseCase,
    @Inject(CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE)
    private readonly createStripeCheckoutSession: CreateStripeCheckoutSessionUseCase,
  ) {}

  @Post()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async create(@Body() body: unknown, @CurrentUser() user: { id: string; role: string }) {
    const input = createOrderSchema.parse(body);
    return this.createOrder({
      ...input,
      customerId: user.id,
    });
  }

  @Get('mine')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async mine(@CurrentUser() user: { id: string }) {
    return this.getCustomerOrders({ customerId: user.id });
  }

  @Post(':id/simulate-payment')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async simulatePaymentRoute(@Param('id') orderId: string) {
    return this.simulatePayment({ orderId });
  }

  @Post(':id/checkout')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async checkout(@Param('id') orderId: string, @CurrentUser() user: { id: string }) {
    return this.createStripeCheckoutSession({ orderId, customerId: user.id });
  }
}
