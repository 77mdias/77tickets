import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { GuardsModule } from '../../auth/guards.module';
import { LotsController } from './lots.controller';

@Module({
  imports: [ApplicationModule, GuardsModule],
  controllers: [LotsController],
})
export class LotsModule {}
