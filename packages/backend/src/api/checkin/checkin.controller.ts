import { Body, Controller, ForbiddenException, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { VALIDATE_CHECKIN_USE_CASE } from '../../application/application.module';
import { assertCheckinAccess } from '../../application/security';
import type { ValidateCheckinUseCase } from '../../application/use-cases/validate-checkin.use-case';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { EVENT_REPOSITORY } from '../../infrastructure/database/database.module';
import type { EventRepository } from '../../repositories';

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
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  @Post()
  @HttpCode(200)
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('checker', 'organizer')
  async checkin(@Body() body: unknown, @CurrentUser() user: { id: string; role: string }) {
    const input = validateCheckinSchema.parse(body);

    if (user.role === 'organizer') {
      const event = await this.eventRepository.findById(input.eventId);
      assertCheckinAccess({
        actor: { userId: user.id, role: 'organizer' },
        eventOrganizerId: event?.organizerId ?? null,
      });
    }

    return this.validateCheckin({ ...input, checkerId: user.id });
  }
}
