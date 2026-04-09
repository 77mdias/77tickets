# Sprint 018 — NestJS Backend Extraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o backend como serviço NestJS independente em `packages/backend/`, portando domain e application sem alterar business logic, mapeando todos os endpoints em Controllers com Guards RBAC, e habilitando deploy autônomo no Render.

**Architecture:** `packages/backend/` é um workspace Node.js autônomo com NestJS. Domain e application são copiados de `src/server/` e permanecem framework-agnostic (sem decorators NestJS). Os use-cases — que são funções factory, não classes — são registrados como factory providers por token de injeção. Guards (`SessionGuard`, `RolesGuard`, `OwnershipGuard`) substituem os adaptadores Vinext de sessão e RBAC.

**Tech Stack:** NestJS 10+, Drizzle ORM + @neondatabase/serverless, Better Auth, Zod, Stripe SDK, Resend SDK, @nestjs/testing + supertest (integration tests), Bun (package manager).

---

## File Structure

### Novo workspace
```
packages/backend/
├── package.json
├── tsconfig.json
├── render.yaml
├── .env.example
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── domain/              ← cópia de src/server/domain/
    ├── application/         ← cópia de src/server/application/
    │   └── application.module.ts  (novo — providers DI)
    ├── payment/             ← cópia de src/server/payment/
    │   └── payment.module.ts      (novo)
    ├── email/               ← cópia de src/server/email/
    │   └── email.module.ts        (novo)
    ├── repositories/        ← cópia de src/server/repositories/drizzle/
    ├── infrastructure/
    │   └── database/
    │       └── database.module.ts
    ├── auth/
    │   ├── auth.module.ts
    │   ├── session.guard.ts
    │   ├── roles.guard.ts
    │   ├── roles.decorator.ts
    │   ├── ownership.guard.ts
    │   └── current-user.decorator.ts
    └── api/
        ├── events/
        │   ├── events.controller.ts
        │   ├── events.module.ts
        │   └── dto/
        ├── lots/
        │   ├── lots.controller.ts
        │   └── lots.module.ts
        ├── orders/
        │   ├── orders.controller.ts
        │   └── orders.module.ts
        ├── checkin/
        │   ├── checkin.controller.ts
        │   └── checkin.module.ts
        ├── coupons/
        │   ├── coupons.controller.ts
        │   └── coupons.module.ts
        ├── webhooks/
        │   ├── webhooks.controller.ts
        │   └── webhooks.module.ts
        └── cron/
            ├── cron.controller.ts
            └── cron.module.ts
```

### Arquivos modificados no repositório raiz
- `package.json` — adicionar `"workspaces": ["packages/*"]`

### Arquivos de teste adaptados
- `tests/integration/setup/index.ts` — adicionar `createTestingApp()` helper
- `tests/integration/api/**/*.test.ts` — (18 arquivos) migrar de handler direto para supertest

---

## Task 1: Monorepo — workspaces e estrutura base

**Files:**
- Modify: `package.json` (raiz)
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`

- [ ] **Passo 1.1: Adicionar workspaces no package.json raiz**

```json
// package.json — adicionar campo "workspaces" (após "name" ou "version")
"workspaces": ["packages/*"]
```

- [ ] **Passo 1.2: Criar packages/backend/package.json**

```json
{
  "name": "@77ticket/backend",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "build": "nest build",
    "test:integration": "vitest run --config vitest.integration.config.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.15",
    "@nestjs/core": "^10.4.15",
    "@nestjs/platform-express": "^10.4.15",
    "@nestjs/config": "^3.3.0",
    "@neondatabase/serverless": "^1.0.2",
    "better-auth": "^1.5.6",
    "drizzle-orm": "^0.45.1",
    "helmet": "^8.0.0",
    "reflect-metadata": "^0.2.2",
    "resend": "^4.8.0",
    "rxjs": "^7.8.1",
    "stripe": "^18.5.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.9",
    "@nestjs/testing": "^10.4.15",
    "@types/express": "^5.0.0",
    "@types/node": "^20",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "typescript": "^5",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Passo 1.3: Criar packages/backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {},
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Passo 1.4: Instalar dependências**

```bash
bun install
```

Esperado: `node_modules` em `packages/backend/` resolvido via workspaces. Sem erros.

- [ ] **Passo 1.5: Verificar que src/ original ainda compila**

```bash
bun run build
```

Esperado: build do Vinext passa sem erros. A adição de `workspaces` não quebra o `src/` original.

- [ ] **Passo 1.6: Commit**

```bash
git add package.json packages/backend/package.json packages/backend/tsconfig.json
git commit -m "chore: add packages/backend workspace with NestJS deps"
```

---

## Task 2: NestJS Bootstrap — main.ts, AppModule, health check

**Files:**
- Create: `packages/backend/src/main.ts`
- Create: `packages/backend/src/app.module.ts`

- [ ] **Passo 2.1: Criar packages/backend/src/main.ts**

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,  // necessário para Stripe webhook HMAC
  });

  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}

bootstrap();
```

- [ ] **Passo 2.2: Criar packages/backend/src/app.module.ts (mínimo)**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
```

Nota: controllers e módulos de domínio serão adicionados em tasks posteriores.

- [ ] **Passo 2.3: Verificar que o backend sobe**

```bash
cd packages/backend
npx nest start --entryFile main
```

Esperado: `Backend running on port 3001` sem erros de import.

- [ ] **Passo 2.4: Commit**

```bash
git add packages/backend/src/main.ts packages/backend/src/app.module.ts
git commit -m "feat(backend): NestJS bootstrap with CORS, Helmet, ValidationPipe"
```

---

## Task 3: Port Domain + Application (zero alteração em business logic)

**Files:**
- Create: `packages/backend/src/domain/` ← cópia de `src/server/domain/`
- Create: `packages/backend/src/application/` ← cópia de `src/server/application/`
- Create: `packages/backend/src/payment/` ← cópia de `src/server/payment/`
- Create: `packages/backend/src/email/` ← cópia de `src/server/email/`
- Create: `packages/backend/src/repositories/` ← cópia de `src/server/repositories/drizzle/`

- [ ] **Passo 3.1: Copiar camadas de domínio e aplicação**

```bash
cp -r src/server/domain packages/backend/src/domain
cp -r src/server/application packages/backend/src/application
cp -r src/server/payment packages/backend/src/payment
cp -r src/server/email packages/backend/src/email
cp -r src/server/repositories/drizzle packages/backend/src/repositories
# Copiar também a infraestrutura de DB (schema, client) necessária pelos repos
mkdir -p packages/backend/src/infrastructure/db
cp src/server/infrastructure/db/client.ts packages/backend/src/infrastructure/db/client.ts
cp src/server/infrastructure/db/schema.ts packages/backend/src/infrastructure/db/schema.ts 2>/dev/null || cp -r src/server/infrastructure/db/schema packages/backend/src/infrastructure/db/schema
```

- [ ] **Passo 3.2: Ajustar caminhos de import se necessário**

Os imports em `packages/backend/src/` devem ser relativos ao novo diretório. Verificar:

```bash
# Checar se há imports absolutos usando "@/server" que precisam ser ajustados
grep -r '"@/' packages/backend/src --include="*.ts" | head -20
```

Se encontrar imports com `@/server/...`, substituir por caminhos relativos correspondentes. Exemplo:
- `from "@/server/domain/..."` → `from "../domain/..."`
- `from "@/server/application/..."` → `from "../application/..."`

```bash
# Substituição em massa (ajustar prefixo conforme resultado do grep)
find packages/backend/src -name "*.ts" -exec sed -i 's|from "@/server/|from "../|g' {} \;
```

- [ ] **Passo 3.3: Validar portabilidade com tsc**

```bash
cd packages/backend && npx tsc --noEmit
```

Esperado: exit code 0, zero erros de compilação.

- [ ] **Passo 3.4: Verificar zero acoplamento a Vinext/Cloudflare**

```bash
grep -r "vinext\|@cloudflare\|hono\|ExecutionContext" packages/backend/src/domain packages/backend/src/application
```

Esperado: nenhuma saída.

- [ ] **Passo 3.5: Commit**

```bash
git add packages/backend/src/domain packages/backend/src/application packages/backend/src/payment packages/backend/src/email packages/backend/src/repositories packages/backend/src/infrastructure
git commit -m "feat(backend): port domain, application, payment, email, repositories — zero business logic changes"
```

---

## Task 4: DatabaseModule — Drizzle + repositórios via NestJS DI

**Files:**
- Create: `packages/backend/src/infrastructure/database/database.module.ts`

- [ ] **Passo 4.1: Escrever teste de integração que verifica DatabaseModule resolve repositórios**

Criar `packages/backend/src/infrastructure/database/database.module.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, EVENT_REPOSITORY } from './database.module';
import type { EventRepository } from '../../repositories';

describe('DatabaseModule', () => {
  it('should resolve EventRepository from DI', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
    }).compile();

    const repo = module.get<EventRepository>(EVENT_REPOSITORY);
    expect(repo).toBeDefined();
    expect(typeof repo.findAll).toBe('function');
  });
});
```

- [ ] **Passo 4.2: Rodar teste para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/infrastructure/database/database.module.spec.ts
```

Esperado: FAIL — `DatabaseModule` não existe ainda.

- [ ] **Passo 4.3: Criar packages/backend/src/infrastructure/database/database.module.ts**

```typescript
import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema';
import { DrizzleEventRepository } from '../../repositories/drizzle-event.repository';
import { DrizzleLotRepository } from '../../repositories/drizzle-lot.repository';
import { DrizzleOrderRepository } from '../../repositories/drizzle-order.repository';
import { DrizzleTicketRepository } from '../../repositories/drizzle-ticket.repository';
import { DrizzleCouponRepository } from '../../repositories/drizzle-coupon.repository';
import { DrizzleUserRepository } from '../../repositories/drizzle-user.repository';

export const EVENT_REPOSITORY = 'EVENT_REPOSITORY';
export const LOT_REPOSITORY = 'LOT_REPOSITORY';
export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';
export const TICKET_REPOSITORY = 'TICKET_REPOSITORY';
export const COUPON_REPOSITORY = 'COUPON_REPOSITORY';
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const DB_POOL = 'DB_POOL';

@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({ connectionString: url });
        return pool;
      },
    },
    {
      provide: EVENT_REPOSITORY,
      inject: [DB_POOL],
      useFactory: (pool: Pool) =>
        new DrizzleEventRepository(drizzle(pool, { schema })),
    },
    {
      provide: LOT_REPOSITORY,
      inject: [DB_POOL],
      useFactory: (pool: Pool) =>
        new DrizzleLotRepository(drizzle(pool, { schema })),
    },
    {
      provide: ORDER_REPOSITORY,
      inject: [DB_POOL],
      useFactory: (pool: Pool) =>
        new DrizzleOrderRepository(drizzle(pool, { schema })),
    },
    {
      provide: TICKET_REPOSITORY,
      inject: [DB_POOL],
      useFactory: (pool: Pool) =>
        new DrizzleTicketRepository(drizzle(pool, { schema })),
    },
    {
      provide: COUPON_REPOSITORY,
      inject: [DB_POOL],
      useFactory: (pool: Pool) =>
        new DrizzleCouponRepository(drizzle(pool, { schema })),
    },
    {
      provide: USER_REPOSITORY,
      inject: [DB_POOL],
      useFactory: (pool: Pool) =>
        new DrizzleUserRepository(drizzle(pool, { schema })),
    },
  ],
  exports: [
    EVENT_REPOSITORY,
    LOT_REPOSITORY,
    ORDER_REPOSITORY,
    TICKET_REPOSITORY,
    COUPON_REPOSITORY,
    USER_REPOSITORY,
    DB_POOL,
  ],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor() {}

  async onApplicationShutdown() {
    // Pool é fechado no shutdown para evitar connection leak
    // O pool é gerenciado pelo provider DB_POOL; a limpeza ocorre aqui
    // via referência ao pool no módulo se necessário
  }
}
```

Nota: Para fechar o pool no shutdown, injete `DB_POOL` no constructor e chame `pool.end()` em `onApplicationShutdown`. Versão simplificada acima; ajustar se necessário para testes.

- [ ] **Passo 4.4: Rodar teste para confirmar que passa**

```bash
cd packages/backend && npx vitest run src/infrastructure/database/database.module.spec.ts
```

Esperado: PASS — repositório resolvido via DI.

- [ ] **Passo 4.5: Commit**

```bash
git add packages/backend/src/infrastructure/database/
git commit -m "feat(backend): DatabaseModule with Drizzle repositories via NestJS DI"
```

---

## Task 5: EmailModule e PaymentModule

**Files:**
- Create: `packages/backend/src/email/email.module.ts`
- Create: `packages/backend/src/payment/payment.module.ts`

- [ ] **Passo 5.1: Escrever teste que verifica EmailModule resolve EMAIL_PROVIDER**

Criar `packages/backend/src/email/email.module.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailModule, EMAIL_PROVIDER } from './email.module';
import type { EmailProvider } from './email.provider';

describe('EmailModule', () => {
  it('should resolve EMAIL_PROVIDER from DI', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'test@example.com';

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), EmailModule],
    }).compile();

    const provider = module.get<EmailProvider>(EMAIL_PROVIDER);
    expect(provider).toBeDefined();
    expect(typeof provider.send).toBe('function');
  });
});
```

- [ ] **Passo 5.2: Rodar teste para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/email/email.module.spec.ts
```

Esperado: FAIL — `EmailModule` não existe.

- [ ] **Passo 5.3: Criar packages/backend/src/email/email.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './resend.email-provider';

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ResendEmailProvider(
          config.getOrThrow('RESEND_API_KEY'),
          config.getOrThrow('EMAIL_FROM'),
        ),
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
```

- [ ] **Passo 5.4: Rodar teste que passa**

```bash
cd packages/backend && npx vitest run src/email/email.module.spec.ts
```

Esperado: PASS.

- [ ] **Passo 5.5: Criar packages/backend/src/payment/payment.module.ts** (seguir mesmo padrão)

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripePaymentProvider } from './stripe.payment-provider';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new StripePaymentProvider(
          config.getOrThrow('STRIPE_SECRET_KEY'),
          config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
          config.get('PAYMENT_MODE', 'stripe'),
        ),
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
```

- [ ] **Passo 5.6: Commit**

```bash
git add packages/backend/src/email/ packages/backend/src/payment/
git commit -m "feat(backend): EmailModule and PaymentModule as NestJS providers"
```

---

## Task 6: ApplicationModule — factory providers para todos os use-cases

**Files:**
- Create: `packages/backend/src/application/application.module.ts`

Os use-cases são funções factory (não classes), então usamos factory providers com tokens. Cada use-case é registrado como `useFactory` que recebe repositórios e providers injetados.

- [ ] **Passo 6.1: Escrever teste que verifica ApplicationModule resolve CREATE_ORDER_USE_CASE**

Criar `packages/backend/src/application/application.module.spec.ts`:

```typescript
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
    }).compile();

    const useCase = module.get<CreateOrderUseCase>(CREATE_ORDER_USE_CASE);
    expect(useCase).toBeDefined();
    expect(typeof useCase).toBe('function');
  });
});
```

- [ ] **Passo 6.2: Rodar teste para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/application/application.module.spec.ts
```

Esperado: FAIL.

- [ ] **Passo 6.3: Criar packages/backend/src/application/application.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseModule, EVENT_REPOSITORY, LOT_REPOSITORY, ORDER_REPOSITORY, TICKET_REPOSITORY, COUPON_REPOSITORY, USER_REPOSITORY } from '../infrastructure/database/database.module';
import { EmailModule, EMAIL_PROVIDER } from '../email/email.module';
import { PaymentModule, PAYMENT_PROVIDER } from '../payment/payment.module';

import { createCreateEventUseCase } from './use-cases/create-event.use-case';
import { createPublishEventUseCase } from './use-cases/publish-event.use-case';
import { createUpdateEventStatusUseCase } from './use-cases/update-event-status.use-case';
import { createCreateLotUseCase } from './use-cases/create-lot.use-case';
import { createUpdateLotUseCase } from './use-cases/update-lot.use-case';
import { createCreateOrderUseCase } from './use-cases/create-order.use-case';
import { createCreateStripeCheckoutSessionUseCase } from './use-cases/create-stripe-checkout-session.use-case';
import { createConfirmOrderPaymentUseCase } from './use-cases/confirm-order-payment.use-case';
import { createCancelOrderOnPaymentFailureUseCase } from './use-cases/cancel-order-on-payment-failure.use-case';
import { createSimulatePaymentUseCase } from './use-cases/simulate-payment.use-case';
import { createValidateCheckinUseCase } from './use-cases/validate-checkin.use-case';
import { createCreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { createUpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { createListPublishedEventsUseCase } from './use-cases/list-published-events.use-case';
import { createGetEventDetailUseCase } from './use-cases/get-event-detail.use-case';
import { createListEventOrdersUseCase } from './use-cases/list-event-orders.use-case';
import { createGetCustomerOrdersUseCase } from './use-cases/get-customer-orders.use-case';
import { createGetEventAnalyticsUseCase } from './use-cases/get-event-analytics.use-case';
import { createSendOrderConfirmationEmailUseCase } from './use-cases/send-order-confirmation-email.use-case';
import { createSendEventReminderEmailUseCase } from './use-cases/send-event-reminder-email.use-case';

export const CREATE_EVENT_USE_CASE = 'CREATE_EVENT_USE_CASE';
export const PUBLISH_EVENT_USE_CASE = 'PUBLISH_EVENT_USE_CASE';
export const UPDATE_EVENT_STATUS_USE_CASE = 'UPDATE_EVENT_STATUS_USE_CASE';
export const CREATE_LOT_USE_CASE = 'CREATE_LOT_USE_CASE';
export const UPDATE_LOT_USE_CASE = 'UPDATE_LOT_USE_CASE';
export const CREATE_ORDER_USE_CASE = 'CREATE_ORDER_USE_CASE';
export const CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE = 'CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE';
export const CONFIRM_ORDER_PAYMENT_USE_CASE = 'CONFIRM_ORDER_PAYMENT_USE_CASE';
export const CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE = 'CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE';
export const SIMULATE_PAYMENT_USE_CASE = 'SIMULATE_PAYMENT_USE_CASE';
export const VALIDATE_CHECKIN_USE_CASE = 'VALIDATE_CHECKIN_USE_CASE';
export const CREATE_COUPON_USE_CASE = 'CREATE_COUPON_USE_CASE';
export const UPDATE_COUPON_USE_CASE = 'UPDATE_COUPON_USE_CASE';
export const LIST_PUBLISHED_EVENTS_USE_CASE = 'LIST_PUBLISHED_EVENTS_USE_CASE';
export const GET_EVENT_DETAIL_USE_CASE = 'GET_EVENT_DETAIL_USE_CASE';
export const LIST_EVENT_ORDERS_USE_CASE = 'LIST_EVENT_ORDERS_USE_CASE';
export const GET_CUSTOMER_ORDERS_USE_CASE = 'GET_CUSTOMER_ORDERS_USE_CASE';
export const GET_EVENT_ANALYTICS_USE_CASE = 'GET_EVENT_ANALYTICS_USE_CASE';
export const SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE = 'SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE';
export const SEND_EVENT_REMINDER_EMAIL_USE_CASE = 'SEND_EVENT_REMINDER_EMAIL_USE_CASE';

@Module({
  imports: [DatabaseModule, EmailModule, PaymentModule],
  providers: [
    {
      provide: CREATE_EVENT_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepo: any, lotRepo: any) =>
        createCreateEventUseCase({
          generateEventId: uuidv4,
          generateLotId: uuidv4,
          generateSlug: (title: string) =>
            title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          now: () => new Date(),
          eventRepository: eventRepo,
          lotRepository: lotRepo,
        }),
    },
    {
      provide: PUBLISH_EVENT_USE_CASE,
      inject: [EVENT_REPOSITORY],
      useFactory: (eventRepo: any) =>
        createPublishEventUseCase({ eventRepository: eventRepo }),
    },
    {
      provide: UPDATE_EVENT_STATUS_USE_CASE,
      inject: [EVENT_REPOSITORY],
      useFactory: (eventRepo: any) =>
        createUpdateEventStatusUseCase({ eventRepository: eventRepo }),
    },
    {
      provide: CREATE_LOT_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepo: any, lotRepo: any) =>
        createCreateLotUseCase({
          generateLotId: uuidv4,
          eventRepository: eventRepo,
          lotRepository: lotRepo,
        }),
    },
    {
      provide: UPDATE_LOT_USE_CASE,
      inject: [LOT_REPOSITORY],
      useFactory: (lotRepo: any) =>
        createUpdateLotUseCase({ lotRepository: lotRepo }),
    },
    {
      provide: CREATE_ORDER_USE_CASE,
      inject: [ORDER_REPOSITORY, LOT_REPOSITORY, COUPON_REPOSITORY],
      useFactory: (orderRepo: any, lotRepo: any, couponRepo: any) =>
        createCreateOrderUseCase({
          now: () => new Date(),
          generateOrderId: uuidv4,
          generateTicketCode: () =>
            `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          orderRepository: orderRepo,
          lotRepository: lotRepo,
          couponRepository: couponRepo,
        }),
    },
    {
      provide: CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE,
      inject: [ORDER_REPOSITORY, PAYMENT_PROVIDER],
      useFactory: (orderRepo: any, paymentProvider: any) =>
        createCreateStripeCheckoutSessionUseCase({
          orderRepository: orderRepo,
          paymentProvider,
        }),
    },
    {
      provide: CONFIRM_ORDER_PAYMENT_USE_CASE,
      inject: [ORDER_REPOSITORY, EMAIL_PROVIDER],
      useFactory: (orderRepo: any, emailProvider: any) =>
        createConfirmOrderPaymentUseCase({
          orderRepository: orderRepo,
          emailProvider,
        }),
    },
    {
      provide: CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE,
      inject: [ORDER_REPOSITORY],
      useFactory: (orderRepo: any) =>
        createCancelOrderOnPaymentFailureUseCase({ orderRepository: orderRepo }),
    },
    {
      provide: SIMULATE_PAYMENT_USE_CASE,
      inject: [ORDER_REPOSITORY],
      useFactory: (orderRepo: any) =>
        createSimulatePaymentUseCase({ orderRepository: orderRepo }),
    },
    {
      provide: VALIDATE_CHECKIN_USE_CASE,
      inject: [TICKET_REPOSITORY],
      useFactory: (ticketRepo: any) =>
        createValidateCheckinUseCase({ ticketRepository: ticketRepo }),
    },
    {
      provide: CREATE_COUPON_USE_CASE,
      inject: [EVENT_REPOSITORY, COUPON_REPOSITORY],
      useFactory: (eventRepo: any, couponRepo: any) =>
        createCreateCouponUseCase({
          generateCouponId: uuidv4,
          eventRepository: eventRepo,
          couponRepository: couponRepo,
        }),
    },
    {
      provide: UPDATE_COUPON_USE_CASE,
      inject: [COUPON_REPOSITORY],
      useFactory: (couponRepo: any) =>
        createUpdateCouponUseCase({ couponRepository: couponRepo }),
    },
    {
      provide: LIST_PUBLISHED_EVENTS_USE_CASE,
      inject: [EVENT_REPOSITORY],
      useFactory: (eventRepo: any) =>
        createListPublishedEventsUseCase({ eventRepository: eventRepo }),
    },
    {
      provide: GET_EVENT_DETAIL_USE_CASE,
      inject: [EVENT_REPOSITORY, LOT_REPOSITORY],
      useFactory: (eventRepo: any, lotRepo: any) =>
        createGetEventDetailUseCase({ eventRepository: eventRepo, lotRepository: lotRepo }),
    },
    {
      provide: LIST_EVENT_ORDERS_USE_CASE,
      inject: [ORDER_REPOSITORY],
      useFactory: (orderRepo: any) =>
        createListEventOrdersUseCase({ orderRepository: orderRepo }),
    },
    {
      provide: GET_CUSTOMER_ORDERS_USE_CASE,
      inject: [ORDER_REPOSITORY],
      useFactory: (orderRepo: any) =>
        createGetCustomerOrdersUseCase({ orderRepository: orderRepo }),
    },
    {
      provide: GET_EVENT_ANALYTICS_USE_CASE,
      inject: [EVENT_REPOSITORY, ORDER_REPOSITORY, TICKET_REPOSITORY],
      useFactory: (eventRepo: any, orderRepo: any, ticketRepo: any) =>
        createGetEventAnalyticsUseCase({
          eventRepository: eventRepo,
          orderRepository: orderRepo,
          ticketRepository: ticketRepo,
        }),
    },
    {
      provide: SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE,
      inject: [ORDER_REPOSITORY, EMAIL_PROVIDER],
      useFactory: (orderRepo: any, emailProvider: any) =>
        createSendOrderConfirmationEmailUseCase({
          orderRepository: orderRepo,
          emailProvider,
        }),
    },
    {
      provide: SEND_EVENT_REMINDER_EMAIL_USE_CASE,
      inject: [EVENT_REPOSITORY, ORDER_REPOSITORY, EMAIL_PROVIDER],
      useFactory: (eventRepo: any, orderRepo: any, emailProvider: any) =>
        createSendEventReminderEmailUseCase({
          eventRepository: eventRepo,
          orderRepository: orderRepo,
          emailProvider,
        }),
    },
  ],
  exports: [
    CREATE_EVENT_USE_CASE, PUBLISH_EVENT_USE_CASE, UPDATE_EVENT_STATUS_USE_CASE,
    CREATE_LOT_USE_CASE, UPDATE_LOT_USE_CASE, CREATE_ORDER_USE_CASE,
    CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE, CONFIRM_ORDER_PAYMENT_USE_CASE,
    CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE, SIMULATE_PAYMENT_USE_CASE,
    VALIDATE_CHECKIN_USE_CASE, CREATE_COUPON_USE_CASE, UPDATE_COUPON_USE_CASE,
    LIST_PUBLISHED_EVENTS_USE_CASE, GET_EVENT_DETAIL_USE_CASE,
    LIST_EVENT_ORDERS_USE_CASE, GET_CUSTOMER_ORDERS_USE_CASE,
    GET_EVENT_ANALYTICS_USE_CASE, SEND_ORDER_CONFIRMATION_EMAIL_USE_CASE,
    SEND_EVENT_REMINDER_EMAIL_USE_CASE,
  ],
})
export class ApplicationModule {}
```

Nota: As assinaturas exatas de cada `createXxxUseCase` devem ser verificadas contra os arquivos copiados em `packages/backend/src/application/use-cases/`. Ajustar parâmetros se as dependências diferirem.

- [ ] **Passo 6.4: Rodar teste para confirmar que passa**

```bash
cd packages/backend && npx vitest run src/application/application.module.spec.ts
```

Esperado: PASS.

- [ ] **Passo 6.5: Commit**

```bash
git add packages/backend/src/application/application.module.ts
git commit -m "feat(backend): ApplicationModule with factory providers for all 20 use-cases"
```

---

## Task 7: ExceptionFilter global — equivalente ao mapAppErrorToResponse

**Files:**
- Create: `packages/backend/src/common/app-exception.filter.ts`

O filter mapeia `AppError` (do domain/application) para HTTP status codes, replicando `src/server/api/error-mapper.ts`.

- [ ] **Passo 7.1: Escrever teste unitário para o filter**

Criar `packages/backend/src/common/app-exception.filter.spec.ts`:

```typescript
import { AppExceptionFilter } from './app-exception.filter';
import { createUnauthenticatedError, createValidationError, createNotFoundError } from '../application/errors';

const mockJson = jest.fn();
const mockStatus = jest.fn(() => ({ json: mockJson }));
const mockGetResponse = jest.fn(() => ({ status: mockStatus }));
const mockHttpArg = { getResponse: mockGetResponse };
const mockArgumentsHost = { switchToHttp: () => mockHttpArg } as any;

describe('AppExceptionFilter', () => {
  const filter = new AppExceptionFilter();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps unauthenticated error to 401', () => {
    filter.catch(createUnauthenticatedError('sem sessão'), mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'unauthenticated' }) }),
    );
  });

  it('maps validation error to 400', () => {
    filter.catch(createValidationError('campo inválido'), mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(400);
  });

  it('maps not-found error to 404', () => {
    filter.catch(createNotFoundError('evento'), mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(404);
  });

  it('maps unknown error to 500', () => {
    filter.catch(new Error('boom'), mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(500);
  });
});
```

- [ ] **Passo 7.2: Rodar teste para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/common/app-exception.filter.spec.ts
```

Esperado: FAIL.

- [ ] **Passo 7.3: Criar packages/backend/src/common/app-exception.filter.ts**

```typescript
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { mapUnknownErrorToAppError, serializeAppError, type AppErrorCode } from '../application/errors';

const HTTP_STATUS_BY_ERROR_CODE: Record<AppErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  authorization: 403,
  'not-found': 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const appError = mapUnknownErrorToAppError(exception);
    const status = HTTP_STATUS_BY_ERROR_CODE[appError.code] ?? 500;

    response.status(status).json({ error: serializeAppError(appError) });
  }
}
```

- [ ] **Passo 7.4: Registrar o filter globalmente em main.ts**

```typescript
// packages/backend/src/main.ts — adicionar após useGlobalPipes:
import { AppExceptionFilter } from './common/app-exception.filter';
// ...
app.useGlobalFilters(new AppExceptionFilter());
```

- [ ] **Passo 7.5: Rodar teste que passa**

```bash
cd packages/backend && npx vitest run src/common/app-exception.filter.spec.ts
```

Esperado: PASS.

- [ ] **Passo 7.6: Commit**

```bash
git add packages/backend/src/common/ packages/backend/src/main.ts
git commit -m "feat(backend): AppExceptionFilter global — maps AppError to HTTP status"
```

---

## Task 8: AuthModule — SessionGuard, RolesGuard, OwnershipGuard

**Files:**
- Create: `packages/backend/src/auth/auth.module.ts`
- Create: `packages/backend/src/auth/session.guard.ts`
- Create: `packages/backend/src/auth/roles.guard.ts`
- Create: `packages/backend/src/auth/roles.decorator.ts`
- Create: `packages/backend/src/auth/ownership.guard.ts`
- Create: `packages/backend/src/auth/current-user.decorator.ts`

- [ ] **Passo 8.1: Escrever teste para SessionGuard**

Criar `packages/backend/src/auth/session.guard.spec.ts`:

```typescript
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

const makeContext = (sessionResult: any) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      headers: { cookie: 'session=abc' },
      resolvedUser: null,
    }),
  }),
  getHandler: () => ({}),
  getClass: () => ({}),
} as unknown as ExecutionContext);

describe('SessionGuard', () => {
  it('throws UnauthorizedException when session is null', async () => {
    const mockResolve = jest.fn().mockResolvedValue(null);
    const guard = new SessionGuard(mockResolve);
    await expect(guard.canActivate(makeContext(null))).rejects.toThrow(UnauthorizedException);
  });

  it('sets request.user when session is valid', async () => {
    const mockUser = { id: 'user-1', role: 'organizer', email: 'org@test.com' };
    const mockResolve = jest.fn().mockResolvedValue({ user: mockUser });
    const guard = new SessionGuard(mockResolve);

    const request: any = { headers: {}, resolvedUser: null };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}), getClass: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', role: 'organizer', email: 'org@test.com' });
  });
});
```

- [ ] **Passo 8.2: Rodar teste para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/auth/session.guard.spec.ts
```

Esperado: FAIL.

- [ ] **Passo 8.3: Criar packages/backend/src/auth/session.guard.ts**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

export type SessionResolver = (headers: Record<string, string>) => Promise<{
  user: { id: string; role?: unknown; email?: string };
} | null>;

const ALLOWED_ROLES = ['customer', 'organizer', 'admin', 'checker'] as const;
type UserRole = typeof ALLOWED_ROLES[number];

const isUserRole = (role: unknown): role is UserRole =>
  typeof role === 'string' && ALLOWED_ROLES.includes(role as UserRole);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly resolveSession: SessionResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await this.resolveSession(request.headers);

    if (!session) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    request.user = {
      id: session.user.id,
      role: isUserRole(session.user.role) ? session.user.role : 'customer',
      email: session.user.email,
    };

    return true;
  }
}
```

- [ ] **Passo 8.4: Criar packages/backend/src/auth/roles.decorator.ts e roles.guard.ts**

```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// roles.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException('Sem permissão');

    // admin sempre tem acesso
    if (user.role === 'admin') return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Permissão insuficiente para este recurso');
    }

    return true;
  }
}
```

- [ ] **Passo 8.5: Criar packages/backend/src/auth/ownership.guard.ts**

O OwnershipGuard verifica que o organizer só acessa recursos dos seus próprios eventos. Requer que o controller injete `eventSlug` ou `eventId` no request antes que o guard execute.

```typescript
// ownership.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
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

    // admin bypassa ownership
    if (user?.role === 'admin') return true;

    const slug = request.params?.slug ?? request.body?.eventSlug;
    if (!slug) return true; // endpoints sem slug não precisam de ownership check

    const event = await this.eventRepository.findBySlug(slug);
    if (!event) throw new ForbiddenException('Evento não encontrado');

    if (event.organizerId !== user.id) {
      throw new ForbiddenException('Acesso negado: evento pertence a outro organizador');
    }

    return true;
  }
}
```

- [ ] **Passo 8.6: Criar packages/backend/src/auth/current-user.decorator.ts**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Passo 8.7: Criar packages/backend/src/auth/auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { auth } from 'better-auth';
import { SessionGuard } from './session.guard';
import { RolesGuard } from './roles.guard';
import { OwnershipGuard } from './ownership.guard';
import { DatabaseModule } from '../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SessionGuard,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const betterAuth = auth({
          baseURL: config.getOrThrow('BETTER_AUTH_BASE_URL'),
          secret: config.getOrThrow('BETTER_AUTH_SECRET'),
          database: { provider: 'pg', url: config.getOrThrow('DATABASE_URL') },
        } as any);

        const resolveSession = (headers: Record<string, string>) =>
          betterAuth.api.getSession({ headers: new Headers(headers) });

        return new SessionGuard(resolveSession);
      },
    },
    RolesGuard,
    OwnershipGuard,
  ],
  exports: [SessionGuard, RolesGuard, OwnershipGuard],
})
export class AuthModule {}
```

- [ ] **Passo 8.8: Rodar teste do SessionGuard**

```bash
cd packages/backend && npx vitest run src/auth/session.guard.spec.ts
```

Esperado: PASS.

- [ ] **Passo 8.9: Commit**

```bash
git add packages/backend/src/auth/
git commit -m "feat(backend): AuthModule with SessionGuard, RolesGuard, OwnershipGuard"
```

---

## Task 9: EventsController

**Files:**
- Create: `packages/backend/src/api/events/events.controller.ts`
- Create: `packages/backend/src/api/events/events.module.ts`

Endpoints mapeados:
- `GET /api/events` → listPublishedEvents (público)
- `GET /api/events/:slug` → getEventDetail (público)
- `POST /api/events` → createEvent (organizer)
- `POST /api/events/publish` → publishEvent (organizer)
- `PATCH /api/events/:slug/status` → updateEventStatus (organizer/admin)
- `GET /api/events/:slug/orders` → listEventOrders (organizer/admin)
- `GET /api/events/:slug/analytics` → getEventAnalytics (organizer/admin)

- [ ] **Passo 9.1: Escrever teste de integração para GET /api/events (público)**

Criar `packages/backend/src/api/events/events.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { EventsModule } from './events.module';
import { LIST_PUBLISHED_EVENTS_USE_CASE } from '../../application/application.module';
import { AppExceptionFilter } from '../../common/app-exception.filter';

describe('EventsController', () => {
  let app: INestApplication;
  const mockListEvents = jest.fn().mockResolvedValue({ events: [], nextCursor: null });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(LIST_PUBLISHED_EVENTS_USE_CASE)
      .useValue(mockListEvents)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /api/events returns 200 with events array', async () => {
    const res = await request(app.getHttpServer()).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  it('GET /api/events/:slug returns 404 when event not found', async () => {
    const mockGetDetail = jest.fn().mockRejectedValue({ code: 'not-found', message: 'Evento não encontrado' });
    // testar via filter
    const res = await request(app.getHttpServer()).get('/api/events/nao-existe');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Passo 9.2: Rodar para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/api/events/events.controller.spec.ts
```

Esperado: FAIL.

- [ ] **Passo 9.3: Criar packages/backend/src/api/events/events.controller.ts**

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { OwnershipGuard } from '../../auth/ownership.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import {
  CREATE_EVENT_USE_CASE,
  PUBLISH_EVENT_USE_CASE,
  UPDATE_EVENT_STATUS_USE_CASE,
  LIST_PUBLISHED_EVENTS_USE_CASE,
  GET_EVENT_DETAIL_USE_CASE,
  LIST_EVENT_ORDERS_USE_CASE,
  GET_EVENT_ANALYTICS_USE_CASE,
} from '../../application/application.module';

@Controller('api/events')
export class EventsController {
  constructor(
    @Inject(LIST_PUBLISHED_EVENTS_USE_CASE) private readonly listEvents: any,
    @Inject(GET_EVENT_DETAIL_USE_CASE) private readonly getEventDetail: any,
    @Inject(CREATE_EVENT_USE_CASE) private readonly createEvent: any,
    @Inject(PUBLISH_EVENT_USE_CASE) private readonly publishEvent: any,
    @Inject(UPDATE_EVENT_STATUS_USE_CASE) private readonly updateStatus: any,
    @Inject(LIST_EVENT_ORDERS_USE_CASE) private readonly listOrders: any,
    @Inject(GET_EVENT_ANALYTICS_USE_CASE) private readonly getAnalytics: any,
  ) {}

  @Get()
  async list(@Query() query: Record<string, string>) {
    return this.listEvents({
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      category: query.category,
      location: query.location,
    });
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return this.getEventDetail({ slug });
  }

  @Post()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async create(@Body() body: unknown, @CurrentUser() user: any) {
    return this.createEvent({ actor: { userId: user.id, role: user.role }, body });
  }

  @Post('publish')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async publish(@Body() body: unknown, @CurrentUser() user: any) {
    return this.publishEvent({ actor: { userId: user.id, role: user.role }, body });
  }

  @Patch(':slug/status')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async updateStatus_(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() user: any) {
    return this.updateStatus({ actor: { userId: user.id, role: user.role }, slug, body });
  }

  @Get(':slug/orders')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async orders(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.listOrders({ actor: { userId: user.id, role: user.role }, slug });
  }

  @Get(':slug/analytics')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async analytics(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.getAnalytics({ actor: { userId: user.id, role: user.role }, slug });
  }
}
```

Nota: As assinaturas exatas dos use-cases devem ser verificadas — ajuste `{ actor, body }` conforme a interface real de cada use-case em `packages/backend/src/application/use-cases/`.

- [ ] **Passo 9.4: Criar packages/backend/src/api/events/events.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [ApplicationModule, AuthModule],
  controllers: [EventsController],
})
export class EventsModule {}
```

- [ ] **Passo 9.5: Registrar EventsModule em AppModule**

```typescript
// app.module.ts — adicionar imports
import { EventsModule } from './api/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
  ],
})
export class AppModule {}
```

- [ ] **Passo 9.6: Rodar teste que passa**

```bash
cd packages/backend && npx vitest run src/api/events/events.controller.spec.ts
```

Esperado: PASS.

- [ ] **Passo 9.7: Commit**

```bash
git add packages/backend/src/api/events/ packages/backend/src/app.module.ts
git commit -m "feat(backend): EventsController with RBAC guards — 7 endpoints"
```

---

## Task 10: LotsController, OrdersController, CheckinController, CouponsController

**Files:**
- Create: `packages/backend/src/api/lots/lots.controller.ts` + `lots.module.ts`
- Create: `packages/backend/src/api/orders/orders.controller.ts` + `orders.module.ts`
- Create: `packages/backend/src/api/checkin/checkin.controller.ts` + `checkin.module.ts`
- Create: `packages/backend/src/api/coupons/coupons.controller.ts` + `coupons.module.ts`

Esses controllers seguem o mesmo padrão do EventsController. São detalhados abaixo.

- [ ] **Passo 10.1: Criar LotsController**

```typescript
// lots.controller.ts
import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { OwnershipGuard } from '../../auth/ownership.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CREATE_LOT_USE_CASE, UPDATE_LOT_USE_CASE } from '../../application/application.module';

@Controller('api/lots')
export class LotsController {
  constructor(
    @Inject(CREATE_LOT_USE_CASE) private readonly createLot: any,
    @Inject(UPDATE_LOT_USE_CASE) private readonly updateLot: any,
  ) {}

  @Post()
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async create(@Body() body: unknown, @CurrentUser() user: any) {
    return this.createLot({ actor: { userId: user.id, role: user.role }, body });
  }

  @Put(':id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: any) {
    return this.updateLot({ actor: { userId: user.id, role: user.role }, id, body });
  }
}
```

- [ ] **Passo 10.2: Criar OrdersController**

```typescript
// orders.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import {
  CREATE_ORDER_USE_CASE,
  GET_CUSTOMER_ORDERS_USE_CASE,
  SIMULATE_PAYMENT_USE_CASE,
  CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE,
} from '../../application/application.module';
import { ConfigService } from '@nestjs/config';

@Controller('api/orders')
export class OrdersController {
  constructor(
    @Inject(CREATE_ORDER_USE_CASE) private readonly createOrder: any,
    @Inject(GET_CUSTOMER_ORDERS_USE_CASE) private readonly getCustomerOrders: any,
    @Inject(SIMULATE_PAYMENT_USE_CASE) private readonly simulatePayment: any,
    @Inject(CREATE_STRIPE_CHECKOUT_SESSION_USE_CASE) private readonly createCheckout: any,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async create(@Body() body: unknown, @CurrentUser() user: any) {
    const order = await this.createOrder({ actor: { userId: user.id, role: user.role }, body });
    // Após criar o pedido, iniciar sessão de checkout Stripe se necessário
    return order;
  }

  @Get('mine')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async mine(@CurrentUser() user: any) {
    return this.getCustomerOrders({ actor: { userId: user.id, role: user.role } });
  }

  @Post(':id/simulate-payment')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('customer')
  async simulate(@Param('id') id: string, @CurrentUser() user: any) {
    const paymentMode = this.config.get('PAYMENT_MODE', 'stripe');
    if (paymentMode !== 'demo') {
      throw new Error('Simulação de pagamento disponível apenas em modo demo');
    }
    return this.simulatePayment({ actor: { userId: user.id, role: user.role }, orderId: id });
  }
}
```

- [ ] **Passo 10.3: Criar CheckinController**

```typescript
// checkin.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { VALIDATE_CHECKIN_USE_CASE } from '../../application/application.module';

@Controller('api/checkin')
export class CheckinController {
  constructor(
    @Inject(VALIDATE_CHECKIN_USE_CASE) private readonly validateCheckin: any,
  ) {}

  @Post()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('checker', 'organizer')
  async checkin(@Body() body: unknown, @CurrentUser() user: any) {
    return this.validateCheckin({ actor: { userId: user.id, role: user.role }, body });
  }
}
```

- [ ] **Passo 10.4: Criar CouponsController**

```typescript
// coupons.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SessionGuard } from '../../auth/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { OwnershipGuard } from '../../auth/ownership.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CREATE_COUPON_USE_CASE, UPDATE_COUPON_USE_CASE } from '../../application/application.module';

@Controller('api/coupons')
export class CouponsController {
  constructor(
    @Inject(CREATE_COUPON_USE_CASE) private readonly createCoupon: any,
    @Inject(UPDATE_COUPON_USE_CASE) private readonly updateCoupon: any,
  ) {}

  @Post('create')
  @UseGuards(SessionGuard, RolesGuard, OwnershipGuard)
  @Roles('organizer')
  async create(@Body() body: unknown, @CurrentUser() user: any) {
    return this.createCoupon({ actor: { userId: user.id, role: user.role }, body });
  }

  @Post('update')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('organizer')
  async update(@Body() body: unknown, @CurrentUser() user: any) {
    return this.updateCoupon({ actor: { userId: user.id, role: user.role }, body });
  }
}
```

- [ ] **Passo 10.5: Criar módulos para cada controller e registrar em AppModule**

Cada módulo segue o mesmo padrão:

```typescript
// lots.module.ts (exemplo — repetir para orders, checkin, coupons)
import { Module } from '@nestjs/common';
import { LotsController } from './lots.controller';
import { ApplicationModule } from '../../application/application.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [ApplicationModule, AuthModule],
  controllers: [LotsController],
})
export class LotsModule {}
```

Adicionar em `app.module.ts`:
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  EventsModule,
  LotsModule,
  OrdersModule,
  CheckinModule,
  CouponsModule,
],
```

- [ ] **Passo 10.6: Commit**

```bash
git add packages/backend/src/api/lots/ packages/backend/src/api/orders/ packages/backend/src/api/checkin/ packages/backend/src/api/coupons/ packages/backend/src/app.module.ts
git commit -m "feat(backend): LotsController, OrdersController, CheckinController, CouponsController"
```

---

## Task 11: WebhooksController — raw body + Stripe HMAC

**Files:**
- Create: `packages/backend/src/api/webhooks/webhooks.controller.ts`
- Create: `packages/backend/src/api/webhooks/webhooks.module.ts`

O raw body já está habilitado via `NestFactory.create(AppModule, { rawBody: true })` na Task 2.

- [ ] **Passo 11.1: Escrever teste de integração para webhook**

Criar `packages/backend/src/api/webhooks/webhooks.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { WebhooksModule } from './webhooks.module';
import {
  CONFIRM_ORDER_PAYMENT_USE_CASE,
  CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE,
} from '../../application/application.module';
import { PAYMENT_PROVIDER } from '../../payment/payment.module';
import { AppExceptionFilter } from '../../common/app-exception.filter';

describe('WebhooksController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPaymentProvider = {
      constructEvent: jest.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [WebhooksModule],
    })
      .overrideProvider(CONFIRM_ORDER_PAYMENT_USE_CASE).useValue(jest.fn())
      .overrideProvider(CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE).useValue(jest.fn())
      .overrideProvider(PAYMENT_PROVIDER).useValue(mockPaymentProvider)
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns 400 when Stripe signature is invalid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'invalid')
      .send('{"type":"test"}');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Passo 11.2: Rodar para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/api/webhooks/webhooks.controller.spec.ts
```

Esperado: FAIL.

- [ ] **Passo 11.3: Criar packages/backend/src/api/webhooks/webhooks.controller.ts**

```typescript
import { Controller, Post, Headers, RawBodyRequest, Req, BadRequestException, Inject } from '@nestjs/common';
import type { Request } from 'express';
import { PAYMENT_PROVIDER } from '../../payment/payment.module';
import { CONFIRM_ORDER_PAYMENT_USE_CASE, CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE } from '../../application/application.module';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: any,
    @Inject(CONFIRM_ORDER_PAYMENT_USE_CASE) private readonly confirmPayment: any,
    @Inject(CANCEL_ORDER_PAYMENT_FAILURE_USE_CASE) private readonly cancelPayment: any,
  ) {}

  @Post('stripe')
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    let event: any;
    try {
      event = this.paymentProvider.constructEvent(req.rawBody, sig);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    if (event.type === 'checkout.session.completed') {
      await this.confirmPayment({ stripeSessionId: event.data.object.id });
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.cancelPayment({ stripeSessionId: event.data.object.id });
    }

    return { received: true };
  }
}
```

- [ ] **Passo 11.4: Criar webhooks.module.ts e registrar em AppModule**

```typescript
// webhooks.module.ts
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ApplicationModule } from '../../application/application.module';
import { PaymentModule } from '../../payment/payment.module';

@Module({
  imports: [ApplicationModule, PaymentModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
```

- [ ] **Passo 11.5: Rodar teste que passa**

```bash
cd packages/backend && npx vitest run src/api/webhooks/webhooks.controller.spec.ts
```

Esperado: PASS.

- [ ] **Passo 11.6: Commit**

```bash
git add packages/backend/src/api/webhooks/ packages/backend/src/app.module.ts
git commit -m "feat(backend): WebhooksController with raw body Stripe HMAC validation"
```

---

## Task 12: CronController — endpoint protegido por CRON_SECRET

**Files:**
- Create: `packages/backend/src/api/cron/cron.controller.ts`
- Create: `packages/backend/src/api/cron/cron.controller.spec.ts`
- Create: `packages/backend/src/api/cron/cron.module.ts`

- [ ] **Passo 12.1: Escrever teste**

```typescript
// cron.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { CronModule } from './cron.module';
import { SEND_EVENT_REMINDER_EMAIL_USE_CASE } from '../../application/application.module';
import { AppExceptionFilter } from '../../common/app-exception.filter';

describe('CronController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.CRON_SECRET = 'test-secret-123';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CronModule,
      ],
    })
      .overrideProvider(SEND_EVENT_REMINDER_EMAIL_USE_CASE)
      .useValue(jest.fn().mockResolvedValue({ sent: 0 }))
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns 401 without CRON_SECRET header', async () => {
    const res = await request(app.getHttpServer()).post('/api/cron/event-reminders');
    expect(res.status).toBe(401);
  });

  it('returns 200 with correct CRON_SECRET header', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cron/event-reminders')
      .set('x-cron-secret', 'test-secret-123');
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Passo 12.2: Rodar para confirmar que falha**

```bash
cd packages/backend && npx vitest run src/api/cron/cron.controller.spec.ts
```

Esperado: FAIL.

- [ ] **Passo 12.3: Criar packages/backend/src/api/cron/cron.controller.ts**

```typescript
import { Controller, Headers, Inject, Post, UnauthorizedException } from '@nestjs/common';
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
    const expected = this.config.getOrThrow('CRON_SECRET');
    if (secret !== expected) {
      throw new UnauthorizedException('CRON_SECRET inválido');
    }
    return this.sendReminders({});
  }
}
```

- [ ] **Passo 12.4: Criar cron.module.ts e registrar em AppModule**

```typescript
// cron.module.ts
import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { ApplicationModule } from '../../application/application.module';

@Module({
  imports: [ApplicationModule],
  controllers: [CronController],
})
export class CronModule {}
```

- [ ] **Passo 12.5: Rodar teste que passa**

```bash
cd packages/backend && npx vitest run src/api/cron/cron.controller.spec.ts
```

Esperado: PASS.

- [ ] **Passo 12.6: Commit**

```bash
git add packages/backend/src/api/cron/ packages/backend/src/app.module.ts
git commit -m "feat(backend): CronController protected by CRON_SECRET header"
```

---

## Task 13: Adaptar integration tests — createTestingApp() helper

**Files:**
- Modify: `tests/integration/setup/index.ts`
- Modify: `tests/integration/api/**/*.test.ts` (18 arquivos)

Os testes atuais instanciam handlers diretamente. Precisam ser adaptados para usar `@nestjs/testing` + supertest apontando para o NestJS backend.

- [ ] **Passo 13.1: Criar helper createTestingApp() no setup**

Adicionar em `tests/integration/setup/index.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../../../packages/backend/src/app.module';
import { AppExceptionFilter } from '../../../packages/backend/src/common/app-exception.filter';

export interface TestApp {
  app: INestApplication;
  close: () => Promise<void>;
}

export async function createTestingApp(): Promise<TestApp> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFile: '.env.test',
      }),
      AppModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AppExceptionFilter());
  await app.init();

  return { app, close: () => app.close() };
}
```

Adicionar também um helper para criar sessão autenticada nos testes:

```typescript
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export function authenticatedAgent(app: INestApplication, userId: string, role: string) {
  // Para testes, injeta um header especial que o SessionGuard reconhece em modo test
  // OU: usa o banco de testes para criar uma sessão real do Better Auth
  // Abordagem recomendada: override SessionGuard em testes com mock que lê header 'x-test-user-id'
  return request(app.getHttpServer()).set('x-test-user-id', userId).set('x-test-role', role);
}
```

- [ ] **Passo 13.2: Modificar SessionGuard para aceitar mock em testes**

Em `packages/backend/src/auth/session.guard.ts`, adicionar suporte a header de teste quando `NODE_ENV === 'test'`:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();

  // Modo de teste: aceitar user via header especial
  if (process.env.NODE_ENV === 'test' && request.headers['x-test-user-id']) {
    request.user = {
      id: request.headers['x-test-user-id'],
      role: request.headers['x-test-role'] ?? 'customer',
      email: 'test@test.com',
    };
    return true;
  }

  const session = await this.resolveSession(request.headers);
  if (!session) throw new UnauthorizedException('Sessão inválida ou expirada');

  request.user = {
    id: session.user.id,
    role: isUserRole(session.user.role) ? session.user.role : 'customer',
    email: session.user.email,
  };
  return true;
}
```

- [ ] **Passo 13.3: Adaptar um arquivo de teste como exemplo — get-events.test.ts**

Antes (handler direto):
```typescript
const createHandler = () =>
  createListEventsHandler({
    listPublishedEvents: createListPublishedEventsUseCase({ ... }),
  });
```

Depois (supertest via NestJS):
```typescript
import * as request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp } from '../../setup';

describe('GET /api/events', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => {
    testApp = await createTestingApp();
  });

  afterAll(async () => testApp.close());

  beforeEach(async () => cleanDatabase(db));

  it('returns empty list when no events', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
  });
});
```

- [ ] **Passo 13.4: Adaptar todos os 18 arquivos de integration test**

Aplicar o mesmo padrão nos 18 arquivos em `tests/integration/api/`:
- `auth/` (1 arquivo)
- `events/` (4 arquivos)
- `lots/` (verificar quantidade)
- `orders/` (5 arquivos)
- `checkin/` (verificar)
- `coupons/` (verificar)
- `webhooks/` (verificar)

Para cada arquivo:
1. Remover imports de handlers e use-cases específicos do Vinext
2. Adicionar `createTestingApp()` no `beforeAll`
3. Substituir chamadas ao handler por `request(testApp.app.getHttpServer())`
4. Substituir resolução de sessão por headers `x-test-user-id` + `x-test-role`

- [ ] **Passo 13.5: Rodar integration tests**

```bash
bun run test:integration
```

Esperado: 514/514 testes passando (ou adaptar count se houver diferença).

- [ ] **Passo 13.6: Commit**

```bash
git add tests/integration/setup/ tests/integration/api/ packages/backend/src/auth/session.guard.ts
git commit -m "test: adapt 18 integration test files to use NestJS + supertest"
```

---

## Task 14: Deploy config — render.yaml e .env.example

**Files:**
- Create: `packages/backend/render.yaml`
- Create: `packages/backend/.env.example`

- [ ] **Passo 14.1: Criar packages/backend/render.yaml**

```yaml
services:
  - type: web
    name: 77ticket-backend
    env: node
    region: oregon
    plan: free
    rootDir: packages/backend
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: DATABASE_URL
        sync: false
      - key: BETTER_AUTH_SECRET
        sync: false
      - key: BETTER_AUTH_BASE_URL
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: EMAIL_FROM
        sync: false
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: PAYMENT_MODE
        value: stripe
      - key: CRON_SECRET
        sync: false
```

- [ ] **Passo 14.2: Criar packages/backend/.env.example**

```bash
# Application
NODE_ENV=development
PORT=3001

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Authentication (Better Auth)
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_BASE_URL=http://localhost:3001

# Frontend CORS
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=no-reply@yourdomain.com

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
PAYMENT_MODE=demo   # 'stripe' em produção, 'demo' para testes locais

# Cron
CRON_SECRET=your-cron-secret-here
```

- [ ] **Passo 14.3: Adicionar GET /api/health endpoint**

```typescript
// packages/backend/src/api/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

Registrar em AppModule. Verificar:

```bash
cd packages/backend && npx nest start &
sleep 5 && curl http://localhost:3001/api/health
```

Esperado: `{"status":"ok","timestamp":"..."}`.

- [ ] **Passo 14.4: Commit**

```bash
git add packages/backend/render.yaml packages/backend/.env.example packages/backend/src/api/health/
git commit -m "feat(backend): render.yaml deploy config, .env.example, /api/health endpoint"
```

---

## Task 15: Validação final e smoke test

- [ ] **Passo 15.1: Verificar tsc no packages/backend**

```bash
cd packages/backend && npx tsc --noEmit
```

Esperado: exit code 0.

- [ ] **Passo 15.2: Verificar zero acoplamento a Vinext/Cloudflare**

```bash
grep -r "vinext\|@cloudflare\|hono" packages/backend/src/domain packages/backend/src/application
```

Esperado: nenhuma saída.

- [ ] **Passo 15.3: Rodar todos os unit tests**

```bash
bun run test:unit
```

Esperado: todos passando (tests existentes do src/ original).

- [ ] **Passo 15.4: Rodar todos os integration tests**

```bash
bun run test:integration
```

Esperado: 514 testes passando contra NestJS.

- [ ] **Passo 15.5: Smoke test local — subir NestJS e testar endpoints**

```bash
cd packages/backend && PORT=3001 node dist/main &
sleep 3
curl -s http://localhost:3001/api/health | jq .
curl -s http://localhost:3001/api/events | jq '.events | length'
```

Esperado: health retorna `{"status":"ok"}`, events retorna array.

- [ ] **Passo 15.6: Commit final**

```bash
git add .
git commit -m "feat(backend): Sprint 018 complete — NestJS backend extraction ready for Render deploy"
```

---

## Notas de Implementação

### Assinaturas dos use-cases
Os use-cases são funções, não classes. A `ApplicationModule` usa factory providers. Antes de implementar, verificar as interfaces exatas em `packages/backend/src/application/use-cases/` — especialmente os parâmetros de cada `createXxxUseCase`.

### OwnershipGuard e repositórios
O `OwnershipGuard` precisa de `EventRepository` para buscar o evento pelo slug. Isso cria uma dependência de `DatabaseModule` em `AuthModule`. Se causar circular dependency, use `forwardRef()`.

### SessionGuard em testes
O header `x-test-user-id` só funciona quando `NODE_ENV=test`. Em produção, o guard usa Better Auth. Isso é intencional e seguro.

### Drizzle com NestJS
O `@neondatabase/serverless` usa WebSocket. Em Workers, isso é nativo. Em Node.js (NestJS), certifique-se de que `ws` está instalado ou use o polyfill fornecido pelo SDK.

### Migração incremental dos testes
Migrar um arquivo de teste de cada vez e rodar `bun run test:integration` após cada migração para detectar regressões imediatamente.
