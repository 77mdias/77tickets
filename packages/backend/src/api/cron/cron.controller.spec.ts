import { UnauthorizedException } from '@nestjs/common';
import { CronController } from './cron.controller';

describe('CronController', () => {
  const SECRET = 'test-secret';
  const mockSendReminders = vi.fn().mockResolvedValue({ sent: 0 });

  const mockConfig = {
    getOrThrow: (key: string) => {
      if (key === 'CRON_SECRET') return SECRET;
      throw new Error(`Unknown config key: ${key}`);
    },
  };

  let controller: CronController;

  beforeAll(() => {
    process.env.CRON_SECRET = SECRET;
  });

  beforeEach(() => {
    mockSendReminders.mockClear();
    controller = new CronController(mockSendReminders, mockConfig as any);
  });

  it('throws UnauthorizedException when x-cron-secret header is missing', async () => {
    await expect(controller.reminders(undefined as any)).rejects.toThrow(UnauthorizedException);
  });

  it('returns result when x-cron-secret header is valid', async () => {
    const result = await controller.reminders(SECRET);
    expect(result).toEqual({ sent: 0 });
  });
});
