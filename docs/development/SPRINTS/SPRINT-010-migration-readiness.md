## Sprint 010 — Migration Readiness

### Objetivo

Auditar acoplamentos ao runtime atual, provar portabilidade empírica das camadas de negócio e produzir o plano técnico de migração incremental para Next.js + NestJS.

---

## Contexto

* **Problema atual:** sem inventário formal de acoplamentos ao Vinext/Workers; risco de retrabalho na migração se novos acoplamentos forem introduzidos nas fases seguintes sem detecção.
* **Impacto:** a migração para NestJS é o objetivo técnico declarado no PRD — esta fase define o caminho.
* **Riscos envolvidos:** prova de portabilidade pode revelar dependências inesperadas que exigem refatoração.
* **Áreas afetadas:** `src/server/domain/`, `src/server/application/`, `src/server/repositories/`, `eslint.config.mjs`, `docs/development/`.

---

## Etapa 1 — Discovery Técnico

* Varrer importações em `src/server/domain/` e `src/server/application/` — esperado: apenas Zod e imports internos.
* Varrer `src/server/repositories/` — esperado: Drizzle apenas nas implementações, não nos contratos.
* Verificar `eslint.config.mjs` para entender guardrails existentes e o que pode ser expandido.

---

## Etapa 2 — Design

* Estrutura do `MIGRATION-PLAN.md`:
  1. Visão geral e objetivo
  2. Camadas portáveis sem modificação: domain, application, repository contracts
  3. Camadas que precisam de adapter: repository implementations (Drizzle → NestJS provider)
  4. Camadas substituídas: handlers → NestJS controllers, route adapters → Guards/Pipes
  5. Infraestrutura substituída: Vinext → Next.js, auth middleware → NestJS JwtAuthGuard
  6. Ordem de migração incremental (não big-bang)
  7. Marcos de validação
  8. Riscos e mitigações

---

## Etapa 3 — Implementação

Sequência recomendada:

1. MIG-001: auditoria de dependências Vinext
2. MIG-002: auditoria de dependências Workers
3. MIG-003: mapear domain + application como portáveis
4. MIG-004: mapear repositórios como portáveis com adapter
5. MIG-005: mapeamento NestJS (module boundaries)
6. MIG-007: prova prática de portabilidade (branch isolada)
7. MIG-006: criar `MIGRATION-PLAN.md` completo
8. MIG-008: expandir guardrails ESLint

---

## Etapa 4 — Validação

* `npm run lint:architecture` — sem violações com guardrails expandidos.
* `MIGRATION-PLAN.md` revisado pelo usuário.
* Prova de portabilidade: `tsc --noEmit` em contexto isolado sem erros.

---

## Critérios de Aceite da Sprint

- [x] Inventário de acoplamentos documentado.
- [x] domain + application confirmados portáveis empiricamente.
- [x] `MIGRATION-PLAN.md` criado com plano incremental.
- [x] Guardrails ESLint expandidos.
- [x] `npm run lint:architecture` verde.
