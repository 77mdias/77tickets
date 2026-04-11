import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { SessionGuard, SESSION_RESOLVER } from './session.guard';
import { RolesGuard } from './roles.guard';
import { OwnershipGuard } from './ownership.guard';
import { createHttpDb } from '../infrastructure/db/client';
import * as schema from '../infrastructure/db/schema';

@Global()
@Module({
  providers: [
    {
      provide: SESSION_RESOLVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = createHttpDb(config.getOrThrow('DATABASE_URL'));
        const betterAuthInstance = betterAuth({
          baseURL: config.getOrThrow('BETTER_AUTH_BASE_URL'),
          secret: config.getOrThrow('BETTER_AUTH_SECRET'),
          database: drizzleAdapter(db, { provider: 'pg', schema }),
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
        return (headers: Record<string, string>) =>
          betterAuthInstance.api.getSession({ headers: new Headers(headers) }) as any;
      },
    },
    SessionGuard,
    RolesGuard,
    OwnershipGuard,
  ],
  exports: [SessionGuard, RolesGuard, OwnershipGuard, SESSION_RESOLVER],
})
export class GuardsModule {}
