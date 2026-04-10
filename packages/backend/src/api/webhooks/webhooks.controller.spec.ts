import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PAYMENT_PROVIDER } from '../../payment/payment.module';
import { CONFIRM_ORDER_PAYMENT_USE_CASE, CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE } from '../../application/application.module';

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: PAYMENT_PROVIDER,
          useValue: {
            constructEvent: vi.fn().mockImplementation(() => {
              throw new Error('bad sig');
            }),
          },
        },
        {
          provide: CONFIRM_ORDER_PAYMENT_USE_CASE,
          useValue: vi.fn(),
        },
        {
          provide: CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE,
          useValue: vi.fn(),
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  it('POST /api/webhooks/stripe returns 400 on invalid stripe signature', async () => {
    const fakeReq = { rawBody: Buffer.from('payload') } as any;
    await expect(controller.stripe(fakeReq, 'bad-sig')).rejects.toThrow(BadRequestException);
  });
});
