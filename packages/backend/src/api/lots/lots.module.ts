import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { LotsController } from './lots.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [LotsController],
})
export class LotsModule {}
