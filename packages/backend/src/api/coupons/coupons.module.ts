import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';
import { CouponsController } from './coupons.controller';

@Module({
  imports: [ApplicationModule, AuthModule],
  controllers: [CouponsController],
})
export class CouponsModule {}
