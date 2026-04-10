import { getTableName, isTable, sql } from "drizzle-orm";

import {
  createDb,
  type Db,
} from "../../../src/server/infrastructure/db/client";
import * as schema from "../../../src/server/infrastructure/db/schema";
import type { UserRole } from "../../../src/server/infrastructure/db/schema/users";

// ─── Well-known test user IDs (referenced by integration fixtures) ────────────

export const TEST_USER_IDS = {
  organizer1: "00000000-0000-0000-0000-000000000001",
  customer1: "00000000-0000-0000-0000-000000000002",
  customerA: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  customerB: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
  organizerX: "00000000-0000-0000-0000-000000000010",
  checker: "00000000-0000-0000-0000-000000000011",
  organizer2: "00000000-0000-0000-0000-000000000022",
  admin: "00000000-0000-0000-0000-000000000099",
} as const;

const SEED_USERS: Array<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}> = [
  {
    id: TEST_USER_IDS.organizer1,
    name: "Test Organizer 1",
    email: "organizer1@test.local",
    role: "organizer",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.customer1,
    name: "Test Customer 1",
    email: "customer1@test.local",
    role: "customer",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.customerA,
    name: "Customer A",
    email: "customer.a@test.local",
    role: "customer",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.customerB,
    name: "Customer B",
    email: "customer.b@test.local",
    role: "customer",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.organizerX,
    name: "Test Organizer X",
    email: "organizer.x@test.local",
    role: "organizer",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.checker,
    name: "Test Checker",
    email: "checker@test.local",
    role: "checker",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.organizer2,
    name: "Test Organizer 2",
    email: "organizer2@test.local",
    role: "organizer",
    emailVerified: true,
  },
  {
    id: TEST_USER_IDS.admin,
    name: "Test Admin",
    email: "admin@test.local",
    role: "admin",
    emailVerified: true,
  },
];

export function createTestDb(): Db {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL must be set to run integration tests.");
  }
  return createDb(url);
}

export async function cleanDatabase(db: Db): Promise<void> {
  const tables = Object.values(schema).filter(isTable);
  if (tables.length === 0) return;
  const tableNames = tables.map((t) => `"${getTableName(t)}"`).join(", ");
  // sql.raw() is required here: tagged template would quote the string as a parameter.
  // Table names come from getTableName() (compile-time schema), not user input.
  await db.execute(sql.raw(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`));
  // Re-seed well-known test users so FK constraints on events/orders are satisfied.
  await db.insert(schema.user).values(SEED_USERS).onConflictDoNothing();
}

import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AppModule } from '../../../packages/backend/src/app.module';
import { AppExceptionFilter } from '../../../packages/backend/src/common/app-exception.filter';
import { SessionGuard } from '../../../packages/backend/src/auth/session.guard';

export interface TestApp {
  app: INestApplication;
  close: () => Promise<void>;
}

// Lightweight SessionGuard used in integration tests — avoids BetterAuth DB
// initialization (which causes unhandled-rejection noise when the app closes).
const testSessionGuard = {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-test-user-id'];
    if (userId) {
      req.user = { id: userId, role: req.headers['x-test-role'] ?? 'customer', email: req.headers['x-test-email'] ?? 'test@test.com' };
      return true;
    }
    throw new UnauthorizedException('Sessão inválida ou expirada');
  },
};

export async function createTestingApp(overrides?: Array<{ token: string | symbol; value: unknown }>): Promise<TestApp> {
  (process.env as Record<string, string>).DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost/test';
  (process.env as Record<string, string>).NODE_ENV = 'test';
  (process.env as Record<string, string>).ALLOW_TEST_AUTH = 'true';
  (process.env as Record<string, string>).RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'test-key';
  (process.env as Record<string, string>).EMAIL_FROM = process.env.EMAIL_FROM ?? 'test@test.com';
  (process.env as Record<string, string>).STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_xxx';
  (process.env as Record<string, string>).STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test';
  (process.env as Record<string, string>).BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? 'test-secret';
  (process.env as Record<string, string>).BETTER_AUTH_BASE_URL = process.env.BETTER_AUTH_BASE_URL ?? 'http://localhost:3001';
  (process.env as Record<string, string>).CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';

  // Always override SessionGuard to prevent BetterAuth DB initialization.
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SessionGuard).useValue(testSessionGuard);
  for (const override of overrides ?? []) {
    builder = builder.overrideProvider(override.token).useValue(override.value);
  }
  const moduleRef: TestingModule = await builder.compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AppExceptionFilter());
  await app.init();

  return { app, close: () => app.close() };
}
