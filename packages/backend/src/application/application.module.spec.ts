import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { EmailModule } from '../email/email.module';
import { PaymentModule } from '../payment/payment.module';
import { ApplicationModule, CREATE_ORDER_USE_CASE } from './application.module';
import type { CreateOrderUseCase } from './use-cases/create-order.use-case';

describe('ApplicationModule', () => {
  it('should resolve CREATE_ORDER_USE_CASE from DI', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://test';
    process.env.RESEND_API_KEY = 'test';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.APP_BASE_URL = 'http://localhost:3001';
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        EmailModule,
        PaymentModule,
        ApplicationModule,
      ],
    })
      .overrideProvider('DB')
      .useValue({})
      .compile();

    const useCase = module.get<CreateOrderUseCase>(CREATE_ORDER_USE_CASE);
    expect(useCase).toBeDefined();
    expect(typeof useCase).toBe('function');
  });
});
