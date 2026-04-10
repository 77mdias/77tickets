import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule, frontendOrigins } from './app.module';
import { AppExceptionFilter } from './common/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,  // necessário para Stripe webhook HMAC
  });

  app.use(helmet());
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no Origin (e.g. direct API calls, tests)
      if (!origin) return callback(null, true);
      if (frontendOrigins.some(o => origin.startsWith(o))) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-actor-id', 'x-actor-role', 'x-test-user-id', 'x-test-role', 'x-test-email'],
    exposedHeaders: ['Set-Cookie'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new AppExceptionFilter());

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}

bootstrap();
