import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { SessionGuard } from './session.guard';
import { RolesGuard } from './roles.guard';
import { OwnershipGuard } from './ownership.guard';
import { DatabaseModule } from '../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SessionGuard,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const betterAuthInstance = betterAuth({
          baseURL: config.getOrThrow('BETTER_AUTH_BASE_URL'),
          secret: config.getOrThrow('BETTER_AUTH_SECRET'),
          database: { provider: 'pg', url: config.getOrThrow('DATABASE_URL') },
        } as any);

        const resolveSession = (headers: Record<string, string>) =>
          betterAuthInstance.api.getSession({ headers: new Headers(headers) }) as any;

        return new SessionGuard(resolveSession);
      },
    },
    RolesGuard,
    OwnershipGuard,
  ],
  exports: [SessionGuard, RolesGuard, OwnershipGuard, DatabaseModule],
})
export class AuthModule {}
