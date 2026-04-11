import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { CouponsController } from './coupons.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [CouponsController],
})
export class CouponsModule {}
