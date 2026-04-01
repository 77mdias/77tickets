## Sprint 011 — CI Foundation + Supply Chain Security

**Status:** ✅ Concluída  
**Última atualização:** 2026-04-01

### Objetivo

Criar gate de qualidade e segurança no GitHub para bloquear regressões em PR e reduzir risco de supply chain.

---

## Contexto

* **Problema atual:** ausência total de workflows em `.github/workflows`.
* **Impacto:** merges sem validação automatizada de qualidade/segurança.
* **Riscos envolvidos:** regressões silenciosas, falhas em produção, dependências vulneráveis sem detecção.
* **Áreas afetadas:** `.github/workflows/`, `scripts/ci/`, `package.json`, `docs/development/`.

---

## Etapa 1 — Discovery Técnico

* Validar comandos de qualidade existentes (`lint`, `lint:architecture`, `test:*`, `build`).
* Definir política de execução de integração com `TEST_DATABASE_URL` via segredo de CI.
* Definir threshold de bloqueio para vulnerabilities (`high`/`critical`).

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

### Casos de teste planejados

* [x] Cenário 1: PR executa quality gate e falha em regressão de lint/test/build.
* [x] Cenário 2: dependency audit bloqueia apenas severidades `high/critical`.
* [x] Cenário 3: integração roda quando `TEST_DATABASE_URL` está configurado e é explicitamente marcada como skipped quando ausente.

---

## Etapa 3 — Implementação

1. Criar `ci.yml` (quality + integration).
2. Criar `security.yml` (CodeQL + secret scan + audit de dependências).
3. Criar script `scripts/ci/check-bun-audit-high.mjs`.
4. Adicionar scripts `ci:quality`, `ci:integration`, `security:audit`.

---

## Etapa 4 — Validação

* `bun run ci:quality` local verde.
* `bun run security:audit` local verde para cenário sem high/critical.
* YAMLs válidos e acionáveis em PR/push.

---

## Critérios de Aceite da Sprint

- [x] Repositório com workflow de CI ativo.
- [x] Repositório com workflow de segurança ativo.
- [x] Bloqueio de vulnerabilidades `high/critical` documentado.
- [x] Execução de integração condicionada por segredo documentada.

---

## Evidências de Conclusão

- `.github/workflows/ci.yml` criado e ativo com quality gate + integração condicional por segredo.
- `.github/workflows/security.yml` criado e ativo com CodeQL + Gitleaks + dependency audit.
- `scripts/ci/check-bun-audit-high.mjs` criado e integrado ao script `security:audit`.
- Verificação local em 2026-04-01:
  - `npm run ci:quality` ✅
  - `npm run security:audit` ✅
