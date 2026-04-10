import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { EventsController } from './events.controller';

@Module({
  imports: [ApplicationModule, AuthModule, DatabaseModule],
  controllers: [EventsController],
})
export class EventsModule {}
