import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ApplicationModule } from '../../application/application.module';
import { PaymentModule } from '../../payment/payment.module';

@Module({
  imports: [ApplicationModule, PaymentModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
