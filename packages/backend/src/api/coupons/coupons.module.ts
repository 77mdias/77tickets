import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { GuardsModule } from '../../auth/guards.module';
import { CouponsController } from './coupons.controller';

@Module({
  imports: [ApplicationModule, GuardsModule],
  controllers: [CouponsController],
})
export class CouponsModule {}
