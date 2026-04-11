import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GuardsModule } from './auth/guards.module';
import { EventsModule } from './api/events/events.module';
import { LotsModule } from './api/lots/lots.module';
import { OrdersModule } from './api/orders/orders.module';
import { CheckinModule } from './api/checkin/checkin.module';
import { CouponsModule } from './api/coupons/coupons.module';
import { WebhooksModule } from './api/webhooks/webhooks.module';
import { CronModule } from './api/cron/cron.module';
import { HealthModule } from './api/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GuardsModule,
    EventsModule,
    LotsModule,
    OrdersModule,
    CheckinModule,
    CouponsModule,
    WebhooksModule,
    CronModule,
    HealthModule,
  ],
})
export class AppModule {}
