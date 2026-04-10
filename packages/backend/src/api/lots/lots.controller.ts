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
  CREATE_LOT_USE_CASE,
  UPDATE_LOT_USE_CASE,
} from '../../application/application.module';
import type { CreateLotUseCase } from '../../application/use-cases/create-lot.use-case';
import type { UpdateLotUseCase } from '../../application/use-cases/update-lot.use-case';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { OwnershipGuard } from '../../auth/ownership.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

const createLotSchema = z
  .object({
    eventId: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    priceInCents: z.number().int().positive(),
    totalQuantity: z.number().int().positive(),
    maxPerOrder: z.number().int().positive(),
    saleStartsAt: z.coerce.date().nullable(),
    saleEndsAt: z.coerce.date().nullable(),
  })
  .strict();

const updateLotSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    priceInCents: z.number().int().positive().optional(),
    totalQuantity: z.number().int().positive().optional(),
    maxPerOrder: z.number().int().positive().optional(),
    saleStartsAt: z.coerce.date().nullable().optional(),
    saleEndsAt: z.coerce.date().nullable().optional(),
    status: z.enum(['active', 'paused', 'sold_out', 'closed']).optional(),
  })
  .strict();

@Controller('api/lots')
export class LotsController {
  constructor(
    @Inject(CREATE_LOT_USE_CASE) private readonly createLot: CreateLotUseCase,
    @Inject(UPDATE_LOT_USE_CASE) private readonly updateLot: UpdateLotUseCase,
  ) {}

  @Post()
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async create(@Body() body: unknown, @CurrentUser() user: { id: string; role: string }) {
    const input = createLotSchema.parse(body);
    return this.createLot({
      ...input,
      actor: { userId: user.id, role: user.role as any },
    });
  }

  @Put(':id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async update(
    @Param('id') lotId: string,
    @Body() body: unknown,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const input = updateLotSchema.parse(body);
    return this.updateLot({
      ...input,
      lotId,
      actor: { userId: user.id, role: user.role as any },
    });
  }
}
