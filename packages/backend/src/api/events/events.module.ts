import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { EventsController } from './events.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [EventsController],
})
export class EventsModule {}
