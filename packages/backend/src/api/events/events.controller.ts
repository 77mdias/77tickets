import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import {
  CREATE_EVENT_USE_CASE,
  CREATE_PUBLISH_EVENT_FOR_ORGANIZER,
  GET_EVENT_ANALYTICS_USE_CASE,
  GET_EVENT_DETAIL_USE_CASE,
  LIST_EVENT_ORDERS_USE_CASE,
  LIST_PUBLISHED_EVENTS_USE_CASE,
  UPDATE_EVENT_STATUS_USE_CASE,
} from '../../application/application.module';
import { CurrentUser } from '../../auth/current-user.decorator';
import { OwnershipGuard } from '../../auth/ownership.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { SessionGuard } from '../../auth/session.guard';

// ── Zod schemas (mirrored from src/server/api/schemas/) ──────────────────────

const nullableTrimmedString = (maxLength: number) =>
  z
    .union([z.string().trim().min(1).max(maxLength), z.null()])
    .transform((v) => (typeof v === 'string' ? v : null));

const createEventSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: nullableTrimmedString(2000),
    location: nullableTrimmedString(255),
    startsAt: z.coerce.date(),
    endsAt: z.union([z.coerce.date(), z.null()]),
    imageUrl: z
      .union([z.string().trim().url().max(2048), z.null()])
      .transform((v) => (typeof v === 'string' ? v : null)),
  })
  .strict();

const publishEventSchema = z.object({ eventId: z.string().uuid() }).strict();

const updateEventSchema = z
  .object({
    eventId: z.string().uuid(),
    targetStatus: z.enum(['draft', 'published', 'cancelled']),
  })
  .strict();

const listEventsQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    date: z.string().optional(),
    location: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    cursor: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  })
  .strict();

const slugParamsSchema = z
  .object({ slug: z.string().trim().min(1).max(160) })
  .strict();

// ─────────────────────────────────────────────────────────────────────────────

@Controller('api/events')
export class EventsController {
  constructor(
    @Inject(LIST_PUBLISHED_EVENTS_USE_CASE) private readonly listPublishedEvents: any,
    @Inject(GET_EVENT_DETAIL_USE_CASE) private readonly getEventDetail: any,
    @Inject(CREATE_EVENT_USE_CASE) private readonly createEvent: any,
    @Inject(CREATE_PUBLISH_EVENT_FOR_ORGANIZER) private readonly publishEventFactory: (id: string) => any,
    @Inject(UPDATE_EVENT_STATUS_USE_CASE) private readonly updateEventStatus: any,
    @Inject(LIST_EVENT_ORDERS_USE_CASE) private readonly listEventOrders: any,
    @Inject(GET_EVENT_ANALYTICS_USE_CASE) private readonly getEventAnalytics: any,
  ) {}

  @Get()
  async list(@Query() query: unknown) {
    const input = listEventsQuerySchema.parse(query);
    return this.listPublishedEvents(input);
  }

  @Get(':slug')
  async get(@Param() params: unknown) {
    const { slug } = slugParamsSchema.parse(params);
    return this.getEventDetail({ slug });
  }

  @Post()
  @HttpCode(201)
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async create(@Body() body: unknown, @CurrentUser() user: { id: string; role: string }) {
    const input = createEventSchema.parse(body);
    return this.createEvent({ ...input, actorId: user.id });
  }

  @Post('publish')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async publish(@Body() body: unknown, @CurrentUser() user: { id: string; role: string }) {
    const input = publishEventSchema.parse(body);
    const publishEvent = this.publishEventFactory(user.id);
    return publishEvent(input);
  }

  @Patch(':slug/status')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async updateStatus(@Body() body: unknown) {
    const input = updateEventSchema.parse(body);
    return this.updateEventStatus(input);
  }

  @Get(':slug/orders')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async orders(@Param() params: unknown, @CurrentUser() user: { id: string; role: string }) {
    const { slug } = slugParamsSchema.parse(params);
    return this.listEventOrders({
      eventId: slug,
      actor: { userId: user.id, role: user.role },
    });
  }

  @Get(':slug/analytics')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async analytics(@Param() params: unknown, @CurrentUser() user: { id: string; role: string }) {
    const { slug } = slugParamsSchema.parse(params);
    return this.getEventAnalytics({
      eventId: slug,
      actor: { userId: user.id, role: user.role },
    });
  }
}
