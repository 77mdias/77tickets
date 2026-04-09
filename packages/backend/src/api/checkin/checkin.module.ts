import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [ApplicationModule, AuthModule],
  controllers: [CheckinController],
})
export class CheckinModule {}
