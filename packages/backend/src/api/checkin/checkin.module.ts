import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { GuardsModule } from '../../auth/guards.module';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [ApplicationModule, GuardsModule],
  controllers: [CheckinController],
})
export class CheckinModule {}
