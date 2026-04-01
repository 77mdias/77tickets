## Sprint 012 — Runtime/API Security Hardening

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

* [ ] Cenário 1: exceder limite em `POST /api/orders` retorna `429` + headers.
* [ ] Cenário 2: exceder limite em `POST /api/checkin` retorna `429` + headers.
* [ ] Cenário 3: exceder limite em `POST /api/auth/*` retorna `429` + headers.
* [ ] Cenário 4: erros continuam padronizados em `{ error: { code, message, details? } }`.

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

- [ ] Rotas críticas protegidas com rate limiting.
- [ ] Contrato `429` padronizado e testado.
- [ ] Headers de segurança e rate limit presentes quando aplicável.
- [ ] Sem regressão de contratos existentes.
