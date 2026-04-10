import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [ApplicationModule, AuthModule, DatabaseModule],
  controllers: [CheckinController],
})
export class CheckinModule {}
