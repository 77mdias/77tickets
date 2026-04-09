import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_REPOSITORY } from '../infrastructure/database/database.module';
import type { EventRepository } from '../repositories';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (user?.role === 'admin') return true;

    const slug = request.params?.slug ?? request.body?.eventSlug;
    if (!slug) return true;

    const event = await this.eventRepository.findBySlug(slug);
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.organizerId !== user.id) throw new ForbiddenException('Acesso negado');
    return true;
  }
}
