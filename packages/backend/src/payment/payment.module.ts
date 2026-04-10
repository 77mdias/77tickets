import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createStripePaymentProvider } from './stripe.payment-provider';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createStripePaymentProvider({
          secretKey: config.getOrThrow<string>('STRIPE_SECRET_KEY'),
          webhookSecret: config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
          appBaseUrl: config.get<string>('APP_BASE_URL'),
        }),
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
