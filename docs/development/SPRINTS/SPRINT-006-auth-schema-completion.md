## Sprint 006 — Auth Integration & Schema Completion

**Status da sprint (análise em 2026-03-30):** concluída.

### Objetivo

Fechar o gap crítico de identidade de usuário integrando auth real, criando a tabela `user` (modelo Better Auth) com FKs de referência e completando o schema de eventos com campos de apresentação necessários para as fases seguintes.

---

## Contexto

* **Problema atual:** tabela `users` ausente no schema; `customerId` e `organizerId` são UUIDs sem FK enforcement; handlers recebem identidade injetada sem validação de sessão real.
* **Impacto no sistema/produto:** sem auth real, checkout, "meus ingressos" e operações admin são inviáveis para usuários reais.
* **Riscos envolvidos:** migration com FK em tabelas existentes pode quebrar dados de teste; integração de auth exige atualização de todos os handlers.
* **Áreas afetadas:** `src/server/infrastructure/db/schema/`, `src/server/repositories/`, `src/server/api/` (todos os handlers), `src/server/infrastructure/auth/`.

---

## Etapa 1 — Discovery Técnico

- [x] Biblioteca de auth confirmada: Better Auth + adapter Drizzle (`src/server/infrastructure/auth/auth.config.ts`).
- [x] Handlers/adapters mapeados e migrados para sessão real (6 endpoints de API).
- [x] Fixtures de integração adaptadas para existência de usuários reais (`tests/integration/setup/index.ts`).
- [x] Configuração com `trustedOrigins` e `bearer()` aplicada para runtime web/serverless.

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

* Estratégia: schema primeiro (SCH-001 a SCH-005) → auth setup (AUTH-001) → middleware (AUTH-002) → adaptação de handlers (AUTH-003) → testes (AUTH-004, AUTH-005).
* Fixtures de integração devem criar registros de `users` reais antes de criar orders/events.

### Casos de teste planejados

* [x] Cenário 1: registro de usuário cria registro com role correto (`tests/integration/api/auth/auth.integration.test.ts`).
* [x] Cenário 2: login retorna sessão válida com `userId` e `role` (`tests/integration/api/auth/auth.integration.test.ts`).
* [x] Cenário 3: requisição sem sessão válida retorna `401 Unauthorized` (suítes de adapters + regressão auth).
* [x] Cenário 4: customer não acessa endpoint de organizer (RBAC preservado em handlers e regressão).
* [x] Cenário 5: organizer acessa apenas seus próprios eventos (ownership validado em `tests/integration/api/events/auth.test.ts`).

---

## Etapa 3 — Testes Primeiro (TDD)

* [x] Testes para sessão inválida (`401`) implementados antes do fechamento da sprint.
* [x] Testes para extração de role da sessão implementados.
* [x] Suítes de unit/regression/integration verdes no estado atual.

---

## Etapa 4 — Implementação

Sequência recomendada:

1. SCH-001: tabela `user` (Better Auth)
2. SCH-002, SCH-003: FKs em `orders` e `events`
3. SCH-004: campos de apresentação em `events`
4. SCH-005: `UserRepository` contract + implementação Drizzle
5. AUTH-001: Better Auth setup + rotas
6. AUTH-002: session middleware
7. AUTH-003: adaptar handlers existentes
8. AUTH-004: testes de integração de auth
9. AUTH-005: regressão de RBAC com auth real

---

## Etapa 5 — Validação

* [x] `npm run test` — passando em 2026-03-30: `255 unit + 18 regression + 357 integration = 630`.
* [x] `npm run lint:architecture` — sem violações.
* [x] Fluxo manual de homologação (registrar → logar → request autenticado) evidenciado em 2026-03-30: sem sessão `401 unauthenticated`; com sessão válida `400 validation` (request autenticado alcançando validação de payload).
* [x] Endpoints da sprint cobertos para `401` sem sessão em testes de adapters/regressão.

---

## Critérios de Aceite da Sprint

- [x] Tabela `user` criada com FKs em `orders` e `events`.
- [x] Auth integrado com registro e login funcionais.
- [x] Todos os handlers da sprint validam sessão real.
- [x] Testes de auth e RBAC passando.
- [x] `npm run test` verde.
- [x] `npm run lint:architecture` sem violações.
