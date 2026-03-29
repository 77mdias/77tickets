## Sprint 006 — Auth Integration & Schema Completion

### Objetivo

Fechar o gap crítico de identidade de usuário integrando auth real, criando a tabela `users` com FKs de referência e completando o schema de eventos com campos de apresentação necessários para as fases seguintes.

---

## Contexto

* **Problema atual:** tabela `users` ausente no schema; `customerId` e `organizerId` são UUIDs sem FK enforcement; handlers recebem identidade injetada sem validação de sessão real.
* **Impacto no sistema/produto:** sem auth real, checkout, "meus ingressos" e operações admin são inviáveis para usuários reais.
* **Riscos envolvidos:** migration com FK em tabelas existentes pode quebrar dados de teste; integração de auth exige atualização de todos os handlers.
* **Áreas afetadas:** `src/server/infrastructure/db/schema/`, `src/server/repositories/`, `src/server/api/` (todos os handlers), `src/server/infrastructure/auth/`.

---

## Etapa 1 — Discovery Técnico

* Confirmar biblioteca de auth: Better Auth com adapter Drizzle (recomendado pela PRD).
* Mapear todos os handlers que recebem `userId`/`role` injetados para atualização em AUTH-003.
* Identificar fixtures de testes de integração que usam UUIDs hardcoded — precisarão de `users` reais após SCH-001.
* Verificar compatibilidade do Better Auth com Cloudflare Workers (modo edge).

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

* Estratégia: schema primeiro (SCH-001 a SCH-005) → auth setup (AUTH-001) → middleware (AUTH-002) → adaptação de handlers (AUTH-003) → testes (AUTH-004, AUTH-005).
* Fixtures de integração devem criar registros de `users` reais antes de criar orders/events.

### Casos de teste planejados

* [ ] Cenário 1: registro de usuário cria registro em `users` com role correto.
* [ ] Cenário 2: login retorna sessão válida com userId e role.
* [ ] Cenário 3: requisição sem sessão válida retorna `401 Unauthorized`.
* [ ] Cenário 4: customer não acessa endpoint de organizer (RBAC preservado com auth real).
* [ ] Cenário 5: organizer acessa apenas seus próprios eventos (ownership preservado).

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes RED para sessão inválida → 401 em handlers existentes.
* Escrever testes RED para extração de role da sessão.
* Implementar (GREEN) → refatorar.

---

## Etapa 4 — Implementação

Sequência recomendada:

1. SCH-001: tabela `users` + enum `user_role`
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

* `npm run test` — todos os testes passando.
* `npm run lint:architecture` — sem violações.
* Fluxo manual: registrar → logar → fazer request autenticado → verificar sessão.
* Verificar que os 6 endpoints existentes retornam `401` sem sessão.

---

## Critérios de Aceite da Sprint

- [ ] Tabela `users` criada com FKs em `orders` e `events`.
- [ ] Auth integrado com registro e login funcionais.
- [ ] Todos os handlers validam sessão real.
- [ ] Testes de auth e RBAC passando.
- [ ] `npm run test` verde.
