import { Body, Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { VALIDATE_CHECKIN_USE_CASE } from '../../application/application.module';
import type { ValidateCheckinUseCase } from '../../application/use-cases/validate-checkin.use-case';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

const validateCheckinSchema = z
  .object({
    ticketId: z.string().uuid(),
    eventId: z.string().uuid(),
  })
  .strict();

@Controller('api/checkin')
export class CheckinController {
  constructor(
    @Inject(VALIDATE_CHECKIN_USE_CASE)
    private readonly validateCheckin: ValidateCheckinUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('checker', 'organizer')
  async checkin(@Body() body: unknown, @CurrentUser() user: { id: string }) {
    const input = validateCheckinSchema.parse(body);
    return this.validateCheckin({ ...input, checkerId: user.id });
  }
}
