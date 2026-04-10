import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { GuardsModule } from '../../auth/guards.module';
import { EventsController } from './events.controller';

@Module({
  imports: [ApplicationModule, GuardsModule],
  controllers: [EventsController],
})
export class EventsModule {}
