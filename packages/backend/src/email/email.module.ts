import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createResendEmailProvider } from './resend.email-provider';

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createResendEmailProvider({
          apiKey: config.getOrThrow<string>('RESEND_API_KEY'),
          fromEmail: config.getOrThrow<string>('EMAIL_FROM'),
          appBaseUrl: config.get<string>('NEXT_PUBLIC_APP_URL'),
        }),
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
