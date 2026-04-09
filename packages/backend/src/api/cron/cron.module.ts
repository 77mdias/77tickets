import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CronController } from './cron.controller';
import { ApplicationModule } from '../../application/application.module';

@Module({
  imports: [ConfigModule, ApplicationModule],
  controllers: [CronController],
})
export class CronModule {}
