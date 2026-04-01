# Migration Plan - Vinext/Workers -> Next.js + NestJS

Date: 2026-04-01  
Scope: Sprint 010 (Migration Readiness)

## 1) Visao geral e objetivo

Objetivo: migrar incrementalmente o runtime atual para `Next.js` (frontend/bff) e `NestJS` (backend), preservando a logica de negocio com o menor rewrite possivel.

Premissas validadas na Sprint 010:

- `domain` e `application` estao isolados de imports de runtime (`next/*`, `vinext/*`).
- contratos de repositorio permanecem portaveis.
- acoplamentos de infra (Drizzle/Neon, auth provider, Workers hints) estao concentrados em adapters.
- prova pratica de portabilidade de `domain + application` em contexto isolado passou com `tsc --noEmit`.

## 2) Camadas portaveis sem modificacao

Camadas que podem ser migradas como estao:

- `src/server/domain/**`
- `src/server/application/**`
- contratos em `src/server/repositories/*.contracts.ts`

Regras mantidas:

- fluxo principal: `UI -> adapter/handler -> use-case -> repository contract -> implementation`
- sem regra de negocio em controller/handler
- validacao de entrada nas bordas
- RBAC e derivacao de dados sensiveis no servidor

## 3) Camadas que precisam de adapter

### Repositorios (Drizzle -> provider NestJS)

Mantem contratos; troca somente binding de implementacao:

- `EVENT_REPOSITORY` -> `DrizzleEventRepository`
- `LOT_REPOSITORY` -> `DrizzleLotRepository`
- `ORDER_REPOSITORY` -> `DrizzleOrderRepository`
- `TICKET_REPOSITORY` -> `DrizzleTicketRepository`
- `COUPON_REPOSITORY` -> `DrizzleCouponRepository`
- `USER_REPOSITORY` -> `DrizzleUserRepository`

No NestJS, isso entra em `PersistenceModule` com providers por token.

### Use-cases (factories -> providers)

Use-cases continuam framework-agnostic e sao registrados como factory providers por token (ex: `CREATE_ORDER_USE_CASE`, `VALIDATE_CHECKIN_USE_CASE`).

## 4) Camadas substituidas

### Handlers / Route adapters -> Controllers + Guards + Pipes

Substituicoes diretas:

- handlers de `src/server/api/**` -> controllers NestJS
- parse/validacao (`schemas` + `parseInput`) -> Pipes
- sessao/role boundary -> Guards + decorator de actor
- `mapAppErrorToResponse` -> Exception Filter global

### Vinext -> Next.js

- manter rotas publicas e administrativas equivalentes em Next.js
- preservar contrato de resposta de erro/sucesso nas APIs durante transicao

### Auth middleware atual -> JwtAuthGuard / RolesGuard

- move acoplamento de autenticacao para `AuthModule`
- policies de ownership continuam na camada application/security

## 5) Mapeamento alvo de modulos NestJS

Modulos recomendados:

- `AppModule` (composicao)
- `InfrastructureModule` (db, observability, config)
- `PersistenceModule` (repositorios concretos)
- `AuthModule` (sessao/guard/decorators)
- `EventsModule`
- `LotsModule`
- `OrdersModule`
- `CouponsModule`
- `CheckinModule`

`domain` e `application` ficam como bibliotecas TS sem decorators NestJS.

## 6) Ordem de migracao incremental (nao big-bang)

1. Extrair e congelar contratos portaveis (`domain`, `application`, repository contracts).
2. Introduzir modulo NestJS de infraestrutura e persistencia com os mesmos contratos.
3. Migrar endpoints por fatia vertical (events -> lots -> orders -> coupons -> checkin), mantendo contratos de API.
4. Introduzir guards/pipes/filters equivalentes aos adapters atuais.
5. Desativar adapters Vinext gradualmente apos paridade por fatia.
6. Consolidar frontend no Next.js e remover runtime legado.

## 7) Marcos de validacao

Para cada etapa incremental:

- `npm run lint:architecture` verde
- suites relevantes (unit/regression/integration) verdes
- sem novos imports proibidos em `domain/application`
- smoke funcional dos fluxos criticos (checkout, coupon governance, checkin)

Marco Sprint 010 (atingido):

- inventario de acoplamentos documentado em `docs/development/Logs/MIG-010-audit-inventory.md`
- prova de portabilidade documentada em `docs/development/Logs/MIG-007-portability-proof.md` (pass)

## 8) Riscos e mitigacoes

### Risco: regressao ao reintroduzir acoplamento de runtime

Mitigacao:

- guardrails ESLint ampliados para bloquear `next/*` e `vinext/*` em `domain/application`
- teste de guardrails em `tests/unit/architecture/eslint-guardrails.test.ts`

### Risco: acoplamento acidental por barrels

Mitigacao:

- preferir imports explicitos de contratos nas camadas de negocio
- manter implementacoes Drizzle acessadas apenas por adapters de infraestrutura

### Risco: mismatch de contrato na migracao de endpoints

Mitigacao:

- usar mapping controller/guard/pipe por endpoint como baseline
- manter shape de erro estavel via filter equivalente ao `error-mapper`

### Risco: ambiguidade de identificador em endpoints

Mitigacao:

- resolver antes da migracao completa o contrato de `events/[slug]/orders` (slug vs UUID)
- registrar decisao no modulo correspondente antes de migrar esse endpoint
