import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
