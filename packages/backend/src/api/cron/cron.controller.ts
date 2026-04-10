import { Controller, Headers, Inject, Post, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { SEND_EVENT_REMINDER_EMAIL_USE_CASE } from '../../application/application.module';

@Controller('api/cron')
export class CronController {
  constructor(
    @Inject(SEND_EVENT_REMINDER_EMAIL_USE_CASE) private readonly sendReminders: any,
    private readonly config: ConfigService,
  ) {}

  @Post('event-reminders')
  async reminders(@Headers('x-cron-secret') secret: string) {
    const expected = this.config.getOrThrow<string>('CRON_SECRET');
    const secretBuf = Buffer.from(secret ?? '');
    const expectedBuf = Buffer.from(expected);
    const valid =
      secretBuf.length === expectedBuf.length &&
      timingSafeEqual(secretBuf, expectedBuf);
    if (!valid) {
      throw new UnauthorizedException('CRON_SECRET inválido');
    }
    return this.sendReminders({});
  }
}
