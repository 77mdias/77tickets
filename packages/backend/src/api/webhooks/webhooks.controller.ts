import { BadRequestException, Controller, Headers, Inject, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PAYMENT_PROVIDER } from '../../payment/payment.module';
import { CONFIRM_ORDER_PAYMENT_USE_CASE, CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE } from '../../application/application.module';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: any,
    @Inject(CONFIRM_ORDER_PAYMENT_USE_CASE) private readonly confirmPayment: any,
    @Inject(CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE) private readonly cancelPayment: any,
  ) {}

  @Post('stripe')
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    let event: any;
    try {
      event = this.paymentProvider.constructEvent(req.rawBody, sig);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.confirmPayment({ stripeSessionId: event.data.object.id });
        break;
      case 'payment_intent.payment_failed':
        await this.cancelPayment({ stripeSessionId: event.data.object.id });
        break;
    }

    return { received: true };
  }
}
