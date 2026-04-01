## Sprint 012 — Runtime/API Security Hardening

**Status:** ✅ Concluída  
**Última atualização:** 2026-04-01

### Objetivo

Endurecer os endpoints críticos com rate limiting efetivo, headers de segurança e contratos de erro estáveis para `429`.

---

## Contexto

* **Problema atual:** rate limiter implementado mas não aplicado nas rotas.
* **Impacto:** superfície exposta a abuso de escrita e brute-force em auth.
* **Riscos envolvidos:** degradação de disponibilidade e inconsistência de contrato entre endpoints.
* **Áreas afetadas:** `src/server/api/`, `src/app/api/`, `tests/unit/server/api/`, `tests/regression/`.

---

## Etapa 1 — Discovery Técnico

* Confirmar rotas de escrita críticas: `orders`, `checkin`, `auth`.
* Definir estratégia de keying (`scope + actor + ip`).
* Definir shape de erro para throttling e headers obrigatórios.

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

### Casos de teste planejados

* [x] Cenário 1: exceder limite em `POST /api/orders` retorna `429` + headers.
* [x] Cenário 2: exceder limite em `POST /api/checkin` retorna `429` + headers.
* [x] Cenário 3: exceder limite em `POST /api/auth/*` retorna `429` + headers.
* [x] Cenário 4: erros continuam padronizados em `{ error: { code, message, details? } }`.

---

## Etapa 3 — Implementação

1. Introduzir erro de domínio `rate_limited` mapeado para HTTP `429`.
2. Criar utilitário de key + enforcement de limite por request.
3. Aplicar limite nas rotas críticas de escrita.
4. Aplicar headers de segurança padrão em respostas API e headers específicos de rate limit quando bloqueado.

---

## Etapa 4 — Validação

* `npm run test:unit` com cenários de throttling verdes.
* `npm run test:regression` sem regressão de RBAC/checkout/checkin.
* `npm run build` verde.

---

## Critérios de Aceite da Sprint

- [x] Rotas críticas protegidas com rate limiting.
- [x] Contrato `429` padronizado e testado.
- [x] Headers de segurança e rate limit presentes quando aplicável.
- [x] Sem regressão de contratos existentes.

---

## Evidências de Conclusão

- Erro `rate_limited` implementado e mapeado para `429`.
- Keying/enforcement implementado em `src/server/api/middleware/rate-limit-request.ts`.
- Rate limiting aplicado em `POST /api/orders`, `POST /api/checkin` e `POST /api/auth/*`.
- Headers de segurança/rate-limit padronizados em `src/server/api/security-response.ts`.
- Testes dedicados de middleware, mapeamento de erro e adapters de rota cobrindo bloqueio por limite.
