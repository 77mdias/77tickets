import type { INestApplication } from '@nestjs/common';
import cors from 'cors';

function getFrontendOrigins(): string[] {
  return process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:3000'];
}

export function configureCors(app: INestApplication) {
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const origins = getFrontendOrigins();
      // Allow requests with no Origin (e.g. direct API calls, tests)
      if (!origin) return callback(null, true);
      if (origins.some(o => origin.startsWith(o))) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-actor-id', 'x-actor-role', 'x-test-user-id', 'x-test-role', 'x-test-email'],
    exposedHeaders: ['Set-Cookie'],
  };
  // Use the underlying Express app directly to ensure CORS middleware is applied
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.use(cors(corsOptions));
}
