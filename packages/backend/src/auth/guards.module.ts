import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { SessionGuard } from './session.guard';
import { RolesGuard } from './roles.guard';
import { OwnershipGuard } from './ownership.guard';
import { DatabaseModule } from '../infrastructure/database/database.module';

/**
 * GuardsModule — registers all auth guards with BetterAuth at the root level.
 *
 * Placed in its own file (not app.module.ts) to avoid circular imports when
 * feature modules need to re-export these guards.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
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
  exports: [SessionGuard, RolesGuard, OwnershipGuard, ConfigModule, DatabaseModule],
})
export class GuardsModule {}
