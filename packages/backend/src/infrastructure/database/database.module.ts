import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb } from '../db/client';
import type { Db } from '../db/client';
import { DrizzleEventRepository } from '../../repositories/drizzle-event.repository';
import { DrizzleLotRepository } from '../../repositories/drizzle-lot.repository';
import { DrizzleOrderRepository } from '../../repositories/drizzle-order.repository';
import { DrizzleTicketRepository } from '../../repositories/drizzle-ticket.repository';
import { DrizzleCouponRepository } from '../../repositories/drizzle-coupon.repository';
import { DrizzleUserRepository } from '../../repositories/drizzle-user.repository';

export const DB = 'DB';
export const EVENT_REPOSITORY = 'EVENT_REPOSITORY';
export const LOT_REPOSITORY = 'LOT_REPOSITORY';
export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';
export const TICKET_REPOSITORY = 'TICKET_REPOSITORY';
export const COUPON_REPOSITORY = 'COUPON_REPOSITORY';
export const USER_REPOSITORY = 'USER_REPOSITORY';

@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        return createDb(url);
      },
    },
    {
      provide: EVENT_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleEventRepository(db),
    },
    {
      provide: LOT_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleLotRepository(db),
    },
    {
      provide: ORDER_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleOrderRepository(db),
    },
    {
      provide: TICKET_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleTicketRepository(db),
    },
    {
      provide: COUPON_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleCouponRepository(db),
    },
    {
      provide: USER_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleUserRepository(db),
    },
  ],
  exports: [
    DB,
    EVENT_REPOSITORY,
    LOT_REPOSITORY,
    ORDER_REPOSITORY,
    TICKET_REPOSITORY,
    COUPON_REPOSITORY,
    USER_REPOSITORY,
  ],
})
export class DatabaseModule {}
