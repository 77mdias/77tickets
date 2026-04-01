## Sprint 013 — CD Cloudflare + Release Security

**Status:** ✅ Concluída  
**Última atualização:** 2026-04-01

### Objetivo

Automatizar deploy para Cloudflare Workers com gates de release, ambientes separados e smoke pós-deploy.

---

## Contexto

* **Problema atual:** sem pipeline de deploy versionado no repositório.
* **Impacto:** releases manuais sem trilha de auditoria e sem gate automático.
* **Riscos envolvidos:** deploys inseguros, migrações não controladas e rollback lento.
* **Áreas afetadas:** `.github/workflows/`, `docs/infrastructure/`, segredos de ambiente GitHub.

---

## Etapa 1 — Discovery Técnico

* Verificar presença de `wrangler.toml` e estratégia de ambientes (`preview`/`production`).
* Definir segredos mínimos: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL` por ambiente.
* Definir smoke endpoint de release (`/api/events`).

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

### Casos de teste planejados

* [x] Cenário 1: PR dispara deploy de preview quando configuração está presente.
* [x] Cenário 2: push em `main` dispara deploy de produção com ambiente protegido.
* [x] Cenário 3: migrations executam antes do deploy com segredo do ambiente.
* [x] Cenário 4: smoke pós-deploy falha release em erro de disponibilidade.

---

## Etapa 3 — Implementação

1. Criar workflow `cd-workers.yml` com preview/prod e `workflow_dispatch`.
2. Integrar deploy com `cloudflare/wrangler-action`.
3. Executar migrations por ambiente antes do deploy.
4. Executar smoke test básico após deploy.
5. Expor fallback explícito quando `wrangler.toml` ainda não existir.

---

## Etapa 4 — Validação

* Simular execução local de build e migration commands.
* Validar sintaxe/condicionais de jobs no workflow.
* Validar documentação operacional para configuração de secrets e approvals.

---

## Critérios de Aceite da Sprint

- [x] Pipeline de CD versionado e funcional.
- [x] Estratégia preview/prod explicitada e protegida por ambiente.
- [x] Smoke pós-deploy implementado.
- [x] Plano de fallback/skip documentado quando config de deploy estiver ausente.

---

## Evidências de Conclusão

- `.github/workflows/cd-workers.yml` criado com `preflight`, preview, production e `workflow_dispatch`.
- Deploy protegido por ambientes `preview` e `production` com validação explícita de segredos obrigatórios.
- Migrações `bun run db:migrate` executadas antes do deploy em ambos ambientes.
- Smoke pós-deploy com `curl --fail` em `/` e `/api/events?limit=1`.
- Fallback `deploy-skipped-no-wrangler` implementado e documentado em `docs/infrastructure/ci-cd-workflow.md`.
