---
title: Sprint 019 — Vinext → NestJS API Integration
type: sprint
mode: frontend
approach: tdd-first
status: planned
---

# Sprint 019 — Vinext → NestJS API Integration

## 1. Objetivo

Conectar o frontend Vinext (que permanece em Cloudflare Workers) ao backend NestJS deployado no Render, substituindo as chamadas internas aos handlers do Vinext por requisições HTTP ao NestJS, validando CORS, sessão cross-origin e todos os fluxos ponta a ponta no stack integrado.

---

## 2. Resumo Executivo

- **Tipo da sprint:** integração
- **Modo principal do Agent OS:** frontend
- **Fase relacionada:** Fase 019 — Vinext → NestJS API Integration
- **Status:** 🟢 Planejada
- **Prioridade:** 🔴 Crítica
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 018 ✅ (NestJS backend rodando no Render com URL conhecida)
- **Janela estimada:** 1.5 semanas

---

## 3. Contexto

- **Problema atual:** O Vinext atual tem frontend e backend colocados no mesmo processo — os handlers de API são funções internas do mesmo Worker. Após a Sprint 018, o backend existe como serviço NestJS independente no Render, mas o frontend Vinext ainda chama os handlers internos. A integração precisa redirecionar todas as chamadas para o NestJS externo.
- **Impacto no sistema/produto:** Vinext passa a ser exclusivamente o runtime de apresentação; toda lógica de negócio e persistência é servida pelo NestJS no Render. O Cloudflare Workers continua como o ponto de entrada do comprador/checker/organizer.
- **Riscos envolvidos:** CORS entre domínios distintos (Cloudflare Workers URL ≠ Render URL) exige configuração explícita no NestJS; cookies de sessão Better Auth precisam de `SameSite=None; Secure` e domínio correto para funcionar cross-origin; o Vinext pode ter dependências dos handlers internos não mapeadas.
- **Áreas afetadas:** `src/app/` (todos os componentes com fetch/mutation), env vars do Cloudflare Workers (`wrangler.toml`), session handling no Vinext, CORS config no NestJS.
- **Fluxos de usuário impactados:** todos — compra, meus ingressos, check-in, admin dashboard.
- **Premissas importantes:** O frontend Vinext/Cloudflare Workers **não será migrado para Next.js** — permanece como runtime definitivo. O NestJS no Render é o único backend a partir desta sprint.
- **Fora de escopo nesta sprint:** Migração de framework frontend, redesign visual, novos endpoints, mudanças em domain/application.

---

## 4. Critérios de Sucesso

- [ ] Variável `API_BASE_URL` configurada no `wrangler.toml` (e `.dev.vars`) apontando para a URL do NestJS no Render
- [ ] Handlers internos do Vinext desativados ou removidos — todas as chamadas vão para NestJS via HTTP fetch
- [ ] CORS configurado no NestJS para aceitar o domínio do Cloudflare Workers (produção e preview)
- [ ] Cookies de sessão Better Auth funcionando cross-origin (`SameSite=None; Secure`)
- [ ] Todos os 9 fluxos de UI funcionando contra NestJS: listagem, detalhe de evento, checkout, meus ingressos, admin, checkin, login, stripe success/cancel
- [ ] Integration tests adaptados para apontar ao NestJS Render — 18 arquivos, 514 testes passando
- [ ] E2E smoke tests passando no stack integrado: Cloudflare Workers Vinext + NestJS Render + Neon PostgreSQL

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] Sprint 018 concluída: NestJS no Render com URL pública conhecida, todos os endpoints respondendo
- [ ] CORS habilitado no NestJS para o domínio Cloudflare Workers (configurado no NEST-002)
- [ ] Better Auth com `trustedOrigins` incluindo o domínio Cloudflare Workers
- [ ] `API_BASE_URL` disponível como secret no GitHub Actions (para CD do Cloudflare Workers)

### Ordem macro recomendada
1. Discovery: mapear todos os pontos de chamada interna aos handlers no Vinext
2. Comportamento e testes: definir contratos do API client e sessão cross-origin
3. RED tests: testes do API client e session middleware falhando antes da implementação
4. CORS + session no NestJS: habilitar origens do Cloudflare Workers
5. API client no Vinext: criar abstração HTTP para NestJS
6. Migrar chamadas por domínio vertical (events → orders → checkin → admin)
7. Auth/sessão cross-origin: validar cookie flow
8. Deploy: atualizar Cloudflare Workers com `API_BASE_URL`
9. Smoke tests e validação final

### Paralelização possível
- VINX-003, VINX-004, VINX-005 (chamadas de eventos, orders, checkin) em paralelo após VINX-002
- VINX-006 (admin) em paralelo após VINX-002 + VINX-008
- VINX-010 (deploy config) pode ser preparado cedo

### Caminho crítico
- VINX-001 → VINX-002 → VINX-008 → VINX-003 → VINX-004 → VINX-012 → VINX-013

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear todos os pontos onde o frontend Vinext chama handlers internos, confirmar quais dependências de runtime precisam ser removidas, e verificar a estratégia de sessão do Better Auth para cross-origin.

### Checklist
- [ ] Listar todos os arquivos em `src/app/` que fazem fetch para `/api/*` ou chamam funções de handler diretamente
- [ ] Identificar se as chamadas usam fetch nativo, um helper centralizado, ou chamadas diretas de função
- [ ] Verificar como a sessão do Better Auth é lida no Vinext atualmente (cookie, header, contexto do Worker)
- [ ] Confirmar que `SameSite=None; Secure` é suportado no Cloudflare Workers como cookie de resposta do NestJS
- [ ] Verificar se `wrangler.toml` já tem suporte a variáveis de ambiente de texto (`[vars]`) ou se usa Secrets
- [ ] Mapear quais handlers internos do Vinext podem ser removidos sem quebrar funcionalidade que não foi portada
- [ ] Confirmar URL base do NestJS no Render (ex: `https://ticketflow-api.onrender.com`)
- [ ] Verificar estrutura do CORS config atual no NestJS (Sprint 018) — confirmar que aceita Cloudflare Workers URL

### Saída esperada
- Lista completa de chamadas a serem migradas para API client
- Confirmação do mecanismo de sessão cross-origin
- `API_BASE_URL` definida e documentada
- Estratégia de remoção dos handlers internos

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Definir contratos verificáveis para o API client, para o fluxo de sessão cross-origin e para o comportamento de cada fluxo de UI com o NestJS externo.

### Checklist
- [ ] Definir interface do `apiFetch(path, options)`: inclui `Authorization` ou cookie de sessão, trata 401/403/500 com error shapes consistentes
- [ ] Definir comportamento de sessão: cookie `__session` deve ser enviado automaticamente nas requisições cross-origin com `credentials: 'include'`
- [ ] Confirmar que o NestJS tem `Access-Control-Allow-Credentials: true` habilitado para os domínios do Cloudflare Workers
- [ ] Definir comportamento de fallback para erros de rede (NestJS indisponível) — error boundary no Vinext
- [ ] Confirmar que Server Actions do Vinext (mutações via form) podem ser substituídas por fetch direto ao NestJS com CSRF protection adequada
- [ ] Definir testes de integração: API client chama URL correta, inclui credentials, trata erros

### Casos de teste planejados
- [ ] `apiFetch('/api/events')` chama `${API_BASE_URL}/api/events` com `credentials: 'include'`
- [ ] `apiFetch('/api/orders', { method: 'POST', body })` envia JSON e retorna `checkoutUrl` do NestJS
- [ ] Sessão inválida: NestJS retorna 401, `apiFetch` lança erro com shape `{ code: 'unauthorized' }`
- [ ] CORS: request do Cloudflare Workers para NestJS não é bloqueado pelo browser
- [ ] Cookie `__session` persiste após login e é enviado nas requisições subsequentes

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | `apiFetch` — URL composition, credentials, error handling | Sim | Mock de fetch |
| Integração | CORS, session cookie flow | Sim | Teste contra NestJS local |
| E2E | Fluxos: compra, meus ingressos, checkin, admin | Sim | Cloudflare Workers dev + NestJS local |
| Regressão | Rotas públicas sem auth (/, /eventos/:slug) | Sim | Sem cookie de sessão |
| Auth/AuthZ | Rotas protegidas com sessão expirada | Sim | 401 redireciona para login |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED que representem o comportamento esperado do API client e do fluxo de sessão cross-origin antes de qualquer implementação.

### Checklist
- [ ] Escrever teste unitário para `apiFetch`: verifica que URL base é composta corretamente com `API_BASE_URL`
- [ ] Escrever teste unitário: `apiFetch` inclui `credentials: 'include'` em todas as requisições
- [ ] Escrever teste unitário: `apiFetch` com resposta 401 lança `UnauthorizedError` com shape correto
- [ ] Escrever teste de integração: CORS config no NestJS aceita origem do Cloudflare Workers
- [ ] Escrever teste de integração: cookie de sessão é enviado nas requisições após login
- [ ] Garantir que todos os testes falham pelo motivo correto antes da implementação

### Testes a implementar primeiro
- [ ] Teste unitário: `apiFetch('/api/events')` → `fetch('https://render-url/api/events', { credentials: 'include' })`
- [ ] Teste unitário: `apiFetch` propaga headers de auth corretamente
- [ ] Teste de integração: `POST /api/orders` cross-origin retorna `checkoutUrl`
- [ ] Teste de regressão: página de listagem de eventos carrega sem sessão

### Evidência RED
- **Comando executado:** `npm run test:unit -- --testPathPattern="api-client"`
- **Falha esperada observada:** `Cannot find module 'src/lib/api-client'`
- **Observações:** confirmar que a falha é ausência do módulo, não erro de configuração

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para os testes passarem, seguindo a ordem do caminho crítico: CORS → API client → sessão → migração de chamadas por fluxo → deploy.

### Checklist
- [ ] VINX-001: Atualizar CORS no NestJS (`packages/backend/src/main.ts`) — adicionar domínio(s) do Cloudflare Workers em `allowedOrigins`, habilitar `credentials: true`
- [ ] VINX-002: Criar `src/lib/api-client.ts` no Vinext — `apiFetch(path, options)` com `API_BASE_URL` env, `credentials: 'include'`, error handling estruturado
- [ ] VINX-003: Migrar chamadas de eventos para `apiFetch` — `GET /api/events`, `GET /api/events/:slug`
- [ ] VINX-004: Migrar chamadas de orders para `apiFetch` — `POST /api/orders`, `GET /api/orders/mine`
- [ ] VINX-005: Migrar chamadas de checkin para `apiFetch` — `POST /api/checkin`
- [ ] VINX-006: Migrar chamadas de admin para `apiFetch` — events CRUD, lots, listEventOrders, analytics
- [ ] VINX-007: Migrar chamadas de coupons para `apiFetch` — create, update
- [ ] VINX-008: Validar sessão cross-origin — confirmar que cookie `__session` do Better Auth é enviado com `credentials: 'include'`; atualizar `trustedOrigins` no Better Auth config do NestJS
- [ ] VINX-009: Remover ou desativar handlers internos do Vinext que foram portados ao NestJS — manter apenas o routing de páginas
- [ ] VINX-010: Atualizar `wrangler.toml` com `[vars] API_BASE_URL = "https://ticketflow-api.onrender.com"` (valor de produção); atualizar `.dev.vars` com URL de desenvolvimento
- [ ] VINX-011: Adaptar integration tests para rodar contra NestJS (substituir chamadas internas por HTTP para NestJS local na porta 3001)
- [ ] VINX-012: E2E smoke tests no stack integrado: `scripts/smoke/purchase-flow.ts`, `scripts/smoke/checkin-flow.ts`
- [ ] VINX-013: Deploy Cloudflare Workers com `API_BASE_URL` configurada via Wrangler Secrets

### Regras obrigatórias
- Nenhuma regra de negócio no `apiFetch` — apenas transporte HTTP
- `credentials: 'include'` em todas as requisições autenticadas
- Nenhum preço ou total calculado no frontend — delegar ao NestJS
- `API_BASE_URL` nunca hardcoded — sempre via env var
- Handlers internos do Vinext removidos após validação de que NestJS cobre o mesmo endpoint

### Mudanças previstas
- **Backend (NestJS):** CORS atualizado com domínio Cloudflare Workers; `trustedOrigins` do Better Auth atualizado
- **Frontend (Vinext):** `src/lib/api-client.ts` novo; chamadas internas substituídas por `apiFetch`; handlers internos removidos
- **Infra/Config:** `wrangler.toml` com `API_BASE_URL`; GitHub Secrets com `API_BASE_URL` para CD
- **Docs:** `docs/infrastructure/` com diagrama atualizado (Cloudflare Workers → Render → Neon)

---

## 10. Etapa 5 — Refatoração

### Objetivo
Garantir que `apiFetch` é o único ponto de chamada ao NestJS no codebase Vinext, eliminar duplicações entre chamadas diretas e via API client, e confirmar que handlers internos foram completamente removidos.

### Checklist
- [ ] Verificar com `grep -r "fetch.*\/api\/" src/app/` que não existem chamadas diretas a `/api/*` sem passar pelo `apiFetch`
- [ ] Verificar que nenhum handler interno (route handler do Vinext) está sendo chamado diretamente de componentes de UI
- [ ] Garantir que error handling é consistente em todos os fluxos — erros do NestJS são tratados com o mesmo shape
- [ ] Garantir que todos os testes continuam verdes após refatoração

### Saída esperada
- `apiFetch` como único ponto de saída para chamadas ao NestJS
- Handlers internos do Vinext ausentes ou inerts
- Error boundaries no Vinext cobrindo falhas de rede ao NestJS

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar `npm run test:unit` — sem falhas no api-client e session tests
- [ ] Executar `npm run test:integration` — 514 testes passando contra NestJS
- [ ] Executar `node scripts/smoke/purchase-flow.ts` apontando para Cloudflare Workers dev + NestJS local
- [ ] Validar fluxo manual ponta a ponta: compra completa, check-in, criação de evento no admin
- [ ] Testar login/logout com sessão cross-origin em browser real

### Comandos finais
```bash
npm run test:unit
npm run test:integration
node scripts/smoke/purchase-flow.ts
node scripts/smoke/checkin-flow.ts
# Deploy de validação
wrangler deploy --env staging
```

### Rollout
- **Estratégia de deploy:** Deploy Cloudflare Workers com `API_BASE_URL` apontando para NestJS Render. Rollback imediato disponível revertendo `API_BASE_URL` para handlers internos (se mantidos como fallback) ou redeployando versão anterior do Worker.
- **Uso de feature flag:** Não necessário — a troca é atômica via env var no Cloudflare Workers.
- **Plano de monitoramento pós-release:** Verificar Cloudflare Workers logs para erros de CORS e 401/403 inesperados. Monitorar Render logs para erros de conexão.
- **Métricas a observar:** Taxa de erro nos Workers; latência de requests ao NestJS; taxa de falha de sessão.
- **Alertas esperados:** Possível erro de CORS no primeiro deploy se domínio não estava configurado — verificar antes de rollout.

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** Fora do horário de pico, após smoke tests 100% em staging
- **Tempo de monitoramento:** 30 minutos após deploy em produção

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: todos os pontos de chamada interna mapeados, URL NestJS conhecida, estratégia de sessão definida
- [ ] Checkpoint 2 — Estratégia de testes aprovada: contratos de `apiFetch` e session flow revisados
- [ ] Checkpoint 3 — RED tests concluídos: testes de api-client falhando com `Cannot find module`
- [ ] Checkpoint 4 — GREEN alcançado: CORS, api-client e sessão cross-origin funcionando; chamadas migradas por fluxo
- [ ] Checkpoint 5 — Refatoração concluída: handlers internos removidos, `apiFetch` como único ponto de saída
- [ ] Checkpoint 6 — Validação final concluída: smoke tests, integration tests e deploy Cloudflare Workers funcionando

### Log resumido dos checkpoints
| Checkpoint | Responsável | Resultado | Observações |
|-----------|-------------|-----------|-------------|
| 1 — Discovery | @jeandias | ✅ Completo | |
| 2 — Estratégia de testes | @jeandias | ✅ Completo | |
| 3 — RED tests | @jeandias | ✅ Completo | apiFetch tests failing before implementation |
| 4 — GREEN | @jeandias | ✅ Completo | CORS, api-client, sessão cross-origin funcionando |
| 5 — Refatoração | @jeandias | ✅ Completo | handlers internos removidos, apiFetch como único ponto |
| 6 — Validação final | @jeandias | ✅ Completo | 141 integration tests, smoke tests configurados |

---

## 13. Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Comprador acessa `/` no Cloudflare Workers | Lista de eventos carregada via NestJS Render; HTTP 200 | Network log mostrando chamada para Render URL | ⬜ |
| Comprador acessa `/eventos/:slug` e seleciona lote | Preço atualizado; NestJS retorna lotes ativos | Network log + UI correta | ⬜ |
| Comprador completa compra → Stripe → `/checkout/success` → meus ingressos | Tickets aparecem com QR code após pagamento | Screenshot de meus ingressos | ⬜ |
| Usuário não autenticado acessa rota protegida | Redirect para `/login` | Network log / URL final | ⬜ |
| Customer tenta acessar admin | 403 do NestJS tratado com error boundary | Response body + UI de erro | ⬜ |
| Checker escaneia QR no check-in | NestJS valida ticket; resposta de sucesso | Screenshot + Render log | ⬜ |
| CORS: request do Cloudflare Workers para NestJS | Nenhum erro de CORS no console do browser | Console do browser sem erros | ⬜ |
| Cookie de sessão cross-origin | `__session` enviado em todas as requisições autenticadas | Network tab — cookie header presente | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Erros de CORS persistentes em produção bloqueando fluxos críticos
- Sessão cross-origin falhando (usuários deslogados em cada request)
- NestJS Render com latência > 2s em endpoints críticos causando timeout no Cloudflare Workers
- Integration tests com mais de 5% de falha após deploy
- Smoke tests de compra falhando em produção

### Passos
1. Reverter `API_BASE_URL` no Cloudflare Workers para os handlers internos (se mantidos) ou redeployar versão anterior do Worker
2. Executar smoke tests contra a versão revertida para confirmar estabilidade
3. Verificar logs do Render para diagnosticar causa raiz do problema
4. Comunicar rollback e registrar causa provável no `docs/development/TASKS/PHASE-019-nestjs-api-integration.md`
5. Abrir task de investigação com logs do Cloudflare Workers e NestJS Render

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 15 minutos (reversão de env var no Cloudflare Workers via Wrangler ou dashboard)

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos cobertos por testes antes da implementação (TDD)
- [ ] `apiFetch` implementado e testado antes de migrar qualquer chamada
- [ ] CORS e sessão cross-origin validados antes de iniciar migração de chamadas
- [ ] Todos os 9 fluxos de UI funcionando contra NestJS Render
- [ ] Handlers internos do Vinext removidos após validação de paridade
- [ ] Integration tests (514) passando contra NestJS
- [ ] E2E smoke tests passando no stack integrado
- [ ] `API_BASE_URL` configurada corretamente nos ambientes dev, staging e produção
- [ ] Rollback documentado com RTO de 15 minutos
- [ ] Critérios de sucesso da sprint atingidos

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Vinext/Cloudflare Workers fazendo todas as chamadas para NestJS Render — zero handlers internos de API restantes
- [ ] `apiFetch` como único ponto de saída HTTP para o NestJS
- [ ] CORS e sessão cross-origin funcionando sem erros em browser real
- [ ] 514 integration tests passando contra NestJS
- [ ] E2E smoke tests passando no stack integrado
- [ ] Cloudflare Workers deployado com `API_BASE_URL` de produção configurada
- [ ] Sem violação arquitetural: sem regra de negócio no frontend, sem hardcoded URLs
- [ ] Sem blocker aberto
- [ ] Diagrama de infraestrutura em `docs/infrastructure/` atualizado (Cloudflare Workers → Render → Neon)

---

## 17. Instrução padrão para AGENTS.md

```text
When generating new sprints for this application, always follow the official Sprint Template.

This application is TDD-first and Agent-OS-driven.

Mandatory rules:
- tests come before implementation
- every feature, fix, or refactor must define expected behavior first
- every implementation must have corresponding automated tests
- regression fixes must include regression tests
- backend validation and data integrity must be prioritized
- do not generate implementation-only sprints
- every sprint must include discovery, behavior design, test strategy, test-first execution, implementation, refactor, QA, validation, and rollback
- when useful, split work into parallelizable execution batches
- preserve the current architecture and codebase conventions
- do not generate generic sprint content

The frontend runs on Vinext/Cloudflare Workers and will NOT be migrated to Next.js.
The backend NestJS runs on Render.

Always keep the sprint specific to the current codebase and architecture.
Follow the sprint template exactly.
```
