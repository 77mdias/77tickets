import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { SessionGuard } from './session.guard';
import { RolesGuard } from './roles.guard';
import { OwnershipGuard } from './ownership.guard';
import { DatabaseModule } from '../infrastructure/database/database.module';

/**
 * GuardsModule — registers all auth guards with BetterAuth.
 *
 * Imports DatabaseModule (which is NOT global) to resolve OwnershipGuard's
 * EVENT_REPOSITORY dependency. GuardsModule is imported by AppModule only.
 * Feature modules find guards via AppModule's exports or via @Global().
 */
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
          advanced: {
            cookies: {
              session_token: {
                attributes: {
                  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                  secure: process.env.NODE_ENV === 'production',
                },
              },
            },
          },
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
export class GuardsModule {}
