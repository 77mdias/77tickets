import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [ApplicationModule, AuthModule, DatabaseModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
