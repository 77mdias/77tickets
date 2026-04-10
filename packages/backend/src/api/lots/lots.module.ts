import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';
import { LotsController } from './lots.controller';

@Module({
  imports: [ApplicationModule, AuthModule],
  controllers: [LotsController],
})
export class LotsModule {}
