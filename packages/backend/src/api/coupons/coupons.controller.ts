import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import {
  CREATE_COUPON_USE_CASE,
  UPDATE_COUPON_USE_CASE,
} from '../../application/application.module';
import type { CreateCouponUseCase } from '../../application/use-cases/create-coupon.use-case';
import type { UpdateCouponUseCase } from '../../application/use-cases/update-coupon.use-case';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { OwnershipGuard } from '../../auth/ownership.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

const couponBodySchema = z
  .object({
    eventId: z.string().uuid().optional(),
    code: z.string().trim().min(1).max(64),
    discountType: z.enum(['fixed', 'percentage']),
    discountInCents: z.number().int().positive().nullable(),
    discountPercentage: z.number().int().min(1).max(100).nullable(),
    maxRedemptions: z.number().int().positive(),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
  })
  .strict();

const createCouponSchema = couponBodySchema.extend({ eventId: z.string().uuid() });

const updateCouponSchema = couponBodySchema.omit({ eventId: true });

@Controller('api/coupons')
export class CouponsController {
  constructor(
    @Inject(CREATE_COUPON_USE_CASE)
    private readonly createCoupon: CreateCouponUseCase,
    @Inject(UPDATE_COUPON_USE_CASE)
    private readonly updateCoupon: UpdateCouponUseCase,
  ) {}

  @Post()
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async create(@Body() body: unknown, @CurrentUser() user: { id: string; role: string }) {
    const input = createCouponSchema.parse(body);
    return this.createCoupon({ ...input, actor: { userId: user.id, role: user.role } });
  }

  @Put(':id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async update(
    @Param('id') couponId: string,
    @Body() body: unknown,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const input = updateCouponSchema.parse(body);
    return this.updateCoupon({ ...input, couponId, actor: { userId: user.id, role: user.role } });
  }
}
