import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [CheckinController],
})
export class CheckinModule {}
