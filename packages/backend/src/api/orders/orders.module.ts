import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { GuardsModule } from '../../auth/guards.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [ApplicationModule, GuardsModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
