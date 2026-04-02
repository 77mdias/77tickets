---
title: Sprint 019 — Next.js Frontend Migration
type: sprint
mode: frontend
approach: tdd-first
status: planned
---

# Sprint 019 — Next.js Frontend Migration

## 1. Objetivo

Migrar o frontend de Vinext (Vite adapter para Cloudflare Workers) para Next.js 15 com App Router estável em `packages/web/`, com todas as páginas migradas, conectadas ao NestJS backend via API client, e deploy funcional no Vercel.

---

## 2. Resumo Executivo

- **Tipo da sprint:** migração
- **Modo principal do Agent OS:** frontend
- **Fase relacionada:** Fase 019 — Next.js Frontend Migration
- **Status:** 🟢 Planejada
- **Prioridade:** 🔴 Crítica
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 018 ✅ (NestJS backend rodando em Railway)
- **Janela estimada:** 2 semanas

---

## 3. Contexto

- **Problema atual:** o frontend usa Vinext (Vite adapter para Cloudflare Workers), um framework experimental sem suporte de longo prazo, que acopla o runtime de apresentação à infraestrutura Cloudflare e dificulta a evolução para o stack definido no MIGRATION-PLAN.md.
- **Impacto no sistema/produto:** substituição completa do runtime de frontend; deploy migra de Cloudflare Workers para Vercel; Server Actions do Next.js substituem os route handlers internos do Vinext.
- **Riscos envolvidos:** diferenças entre o modelo de renderização do Vinext e do Next.js App Router (Server Components, Server Actions, streaming); integração do Better Auth com Next.js via cookies HttpOnly requer atenção ao modelo de sessão; funil de checkout depende de redirects do Stripe que devem ser testados no novo domínio Vercel.
- **Áreas afetadas:** `packages/web/` (novo pacote), toda `src/app/` (migra para `packages/web/src/app/`).
- **Fluxos de usuário impactados:** todos os fluxos de comprador (listagem, detalhe, checkout, meus ingressos), fluxo do organizador (admin dashboard), fluxo do checker (check-in via câmera).
- **Premissas importantes:** domain e application não mudam — apenas a camada de apresentação migra; NestJS backend (Sprint 018) está pronto para receber requests do novo frontend; React 19 + Tailwind 4 + shadcn/ui são mantidos.
- **Fora de escopo nesta sprint:** redesign visual, novos componentes UI, migração de backend (concluída na Sprint 018).

---

## 4. Critérios de Sucesso

- [ ] `packages/web/` com Next.js 15 (App Router) bootstrapped com TypeScript strict e `src/` dir
- [ ] Todas as 9 rotas migradas: `/`, `/eventos/[slug]`, `/checkout/success`, `/checkout/cancel`, `/meus-ingressos`, `/admin`, `/checkin`, `/login`
- [ ] `lib/api-client.ts` apontando para NestJS backend URL com Authorization header
- [ ] Server Actions implementadas: `createOrder`, `checkinTicket`, `createEvent`, `createLot`, `updateLot`
- [ ] Better Auth integrado com Next.js (session via cookies HttpOnly, `auth()` helper server-side)
- [ ] Middleware de proteção de rotas para `/admin`, `/meus-ingressos`, `/checkin`
- [ ] Deploy no Vercel com `NEXT_PUBLIC_API_URL` apontando para Railway (NestJS)
- [ ] E2E smoke tests passando no stack Next.js + NestJS integrado

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] Sprint 018 concluída: NestJS backend rodando em Railway com endpoints de eventos, orders, checkin, auth
- [ ] Better Auth configurado no NestJS com acesso ao banco Neon (schema users/sessions compartilhado)
- [ ] Stripe webhooks configurados no NestJS, rotas de checkout/success/cancel funcionais
- [ ] `NEXT_PUBLIC_API_URL` (Railway URL) disponível como secret no GitHub Actions

### Ordem macro recomendada
1. Discovery técnico: mapear rotas Vinext existentes e componentes a migrar
2. Estratégia de comportamento e testes: definir contratos de Server Components e Server Actions
3. RED tests: escrever testes de middleware, auth e Server Actions antes da implementação
4. Setup: Next.js 15 scaffolding, Tailwind 4, shadcn/ui, api-client
5. Auth: Better Auth adapter, `auth()` helper, middleware de proteção de rotas
6. Pages: migrar rotas em ordem do caminho crítico (home → evento → meus-ingressos → admin)
7. Server Actions: createOrder, checkinTicket, createEvent, createLot/updateLot
8. Deploy: vercel.json, cd-vercel.yml, E2E smoke
9. Refatoração e validação final

### Paralelização possível
- NEXT-011, NEXT-012, NEXT-013, NEXT-014 (server actions) podem ser desenvolvidas em paralelo após NEXT-003 e NEXT-015
- NEXT-006, NEXT-009, NEXT-010 (páginas de menor complexidade) podem ser desenvolvidas em paralelo após NEXT-016
- NEXT-017 (vercel.json) pode ser preparado em paralelo com as páginas após NEXT-001

### Caminho crítico
- NEXT-001 → NEXT-002 → NEXT-003 → NEXT-015 → NEXT-016 → NEXT-004 → NEXT-005 → NEXT-007 → NEXT-008 → NEXT-019

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear todas as rotas, componentes e dependências do Vinext atual antes de iniciar a migração, confirmando o delta real entre o comportamento existente e o modelo Next.js App Router.

### Checklist
- [ ] Analisar `src/app/` atual: listar todas as rotas, layouts, loaders e componentes de cada página
- [ ] Identificar quais componentes são puramente visuais (migração direta) e quais têm lógica de side-effect (precisam virar Server Actions)
- [ ] Mapear uso de autenticação no Vinext: como sessão é lida, quais rotas são protegidas
- [ ] Verificar componentes com acesso a câmera (`QrScanner`) — compatibilidade com Next.js App Router e Client Components
- [ ] Mapear dependências de `TicketQR` (geração de QR code): confirmar compatibilidade server/client
- [ ] Identificar variáveis de ambiente usadas atualmente e equivalentes no Next.js
- [ ] Confirmar restrições de Tailwind 4 no contexto do `packages/web/` como pacote separado no monorepo
- [ ] Verificar estratégia de sessão do Better Auth: cookies HttpOnly compatíveis com Vercel Edge e SSR

### Saída esperada
- Mapa completo de rotas Vinext → rotas Next.js App Router
- Lista de componentes Client vs Server por página
- Variáveis de ambiente mapeadas (`NEXT_PUBLIC_API_URL`, `BETTER_AUTH_SECRET`, etc.)
- Riscos de compatibilidade conhecidos (QrScanner, TicketQR)

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Definir contratos verificáveis para Server Components, Server Actions e middleware de auth antes de qualquer implementação.

### Checklist
- [ ] Definir contrato do `api-client.ts`: assinatura de `apiFetch`, tratamento de erros, injeção do Authorization header
- [ ] Definir comportamento do middleware: quais rotas proteger, redirect target, como ler a sessão do cookie
- [ ] Definir contrato das Server Actions: input Zod-validated, output `{ success, data?, error? }`
- [ ] Confirmar que Server Actions não expõem totais de preço nem IDs de sessão direto ao client
- [ ] Definir estratégia de testes: unitários para Server Actions, integração para middleware e api-client, E2E smoke para fluxos críticos
- [ ] Confirmar comportamento de `/admin` para role `customer`: redirect ou 403
- [ ] Confirmar comportamento de `/meus-ingressos` sem sessão: redirect para `/login`

### Casos de teste planejados
- [ ] Home page (`/`) carrega lista de eventos via NestJS corretamente como Server Component
- [ ] `/meus-ingressos` redireciona para `/login` quando não autenticado
- [ ] `/admin` retorna redirect ou 403 para role `customer`
- [ ] `createOrder` Server Action chama `POST /api/orders` no NestJS e retorna `{ checkoutUrl }`
- [ ] Middleware bloqueia `/admin` para sessão com role `customer`
- [ ] `checkinTicket` Server Action retorna erro estruturado quando ticket já foi usado
- [ ] Better Auth `auth()` helper server-side retorna `null` para request sem cookie de sessão válido

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | Server Actions (createOrder, checkinTicket, createEvent) | Sim | Validação Zod, error shape |
| Integração | api-client, middleware de auth | Sim | Headers, redirects, RBAC |
| E2E | Fluxo de compra, admin, checkin | Sim | Smoke no stack Vercel + Railway |
| Regressão | Rotas públicas sem auth | Sim | Backward compat com URLs existentes |
| Auth/AuthZ | Middleware para /admin, /meus-ingressos, /checkin | Sim | Roles customer, organizer, checker |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED que representem o comportamento esperado do middleware de auth, das Server Actions e do api-client antes de qualquer implementação.

### Checklist
- [ ] Escrever testes de middleware: rotas protegidas redirecionam sem sessão, passam com sessão válida
- [ ] Escrever testes unitários para `createOrder` Server Action: chama api-client com payload correto, retorna checkoutUrl
- [ ] Escrever testes unitários para `checkinTicket` Server Action: retorna erro estruturado para ticket inválido
- [ ] Escrever testes de integração para `api-client`: injeta Authorization header, trata 401/403/500
- [ ] Garantir que os testes falhem pelo motivo correto (middleware e Server Actions não existem ainda)
- [ ] Adicionar testes de regressão para rotas públicas (`/`, `/eventos/[slug]`) acessíveis sem auth

### Testes a implementar primeiro
- [ ] Teste de integração: middleware redireciona `/admin` para `/login` sem sessão
- [ ] Teste de integração: middleware permite `/admin` com sessão de role `organizer`
- [ ] Teste unitário: `createOrder` valida input com Zod antes de chamar api-client
- [ ] Teste unitário: `api-client.apiFetch` inclui `Authorization: Bearer <token>` no header
- [ ] Teste de autorização: `auth()` helper retorna `null` sem cookie de sessão
- [ ] Teste de regressão: página `/` acessível sem autenticação

### Evidência RED
- **Comando executado:** `cd packages/web && npx vitest run --reporter=verbose`
- **Falha esperada observada:** testes falham com "Cannot find module" para middleware, Server Actions e api-client inexistentes
- **Observações:** confirmar que o erro é ausência dos módulos, não erro de configuração do runner de testes

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para os testes passarem, na ordem do caminho crítico, preservando a separação entre camada de apresentação e domain/application.

### Checklist
- [ ] Bootstrapar `packages/web/` com `create-next-app@latest` (TypeScript strict, App Router, `src/` dir)
- [ ] Configurar Tailwind 4 e shadcn/ui no `packages/web/`
- [ ] Implementar `packages/web/src/lib/api-client.ts` com `apiFetch`, Authorization header e tratamento de erros
- [ ] Implementar Better Auth adapter para Next.js em `packages/web/src/lib/auth.ts` e `src/app/api/auth/[...all]/route.ts`
- [ ] Implementar middleware de proteção de rotas em `packages/web/src/middleware.ts`
- [ ] Migrar página `/` como Server Component com fetch via api-client
- [ ] Migrar `/eventos/[slug]` com Server Component para dados do evento e Client Component para LotSelector
- [ ] Migrar `/meus-ingressos` com guard de autenticação e componente `TicketQR`
- [ ] Migrar `/admin` com guard de role e Server Components para dados; Client Components para formulários
- [ ] Migrar `/checkin` com guard de role e `CheckinForm` + `QrScanner` como Client Components
- [ ] Migrar `/login` com `LoginForm` do Better Auth
- [ ] Implementar `/checkout/success` e `/checkout/cancel`
- [ ] Implementar Server Actions: `createOrder`, `checkinTicket`, `createEvent`, `createLot`, `updateLot`
- [ ] Criar `vercel.json` com rewrites, headers e referências a env vars
- [ ] Criar ou atualizar GitHub Actions para deploy do `packages/web/` no Vercel

### Regras obrigatórias
- Não confiar em input do client para calcular totais de pedido — Server Actions delegam toda lógica de preço ao NestJS
- Auth e verificação de role no middleware e nos Server Actions, não apenas no frontend
- Nenhuma implementação de Server Action sem teste correspondente
- Componentes de câmera (`QrScanner`) e geração de QR (`TicketQR`) marcados como `'use client'`
- Variáveis de ambiente com prefixo `NEXT_PUBLIC_` apenas para valores não-sensíveis

### Mudanças previstas
- **Backend:** nenhuma — NestJS permanece inalterado
- **API:** nenhuma — contratos de API do NestJS não mudam
- **Frontend:** `packages/web/` inteiro (novo pacote); `src/app/` no Vinext torna-se legado até validação
- **Banco/Schema:** nenhuma — mesmo banco Neon, mesmo schema Better Auth
- **Infra/Config:** `vercel.json`, GitHub Actions `cd-vercel.yml`, secrets `NEXT_PUBLIC_API_URL` e `BETTER_AUTH_SECRET`
- **Docs:** atualizar `docs/infrastructure/` com novo diagrama de deploy (Vercel + Railway + Neon)

---

## 10. Etapa 5 — Refatoração

### Objetivo
Garantir clareza na separação entre Server Components, Client Components e Server Actions após os testes passarem, e eliminar duplicações entre o código migrado e eventuais adaptações temporárias.

### Checklist
- [ ] Revisar todos os componentes migrados e confirmar marcação correta de `'use client'` (somente onde necessário)
- [ ] Extrair utilitários compartilhados (formatação de data, formatação de moeda) para `packages/web/src/lib/`
- [ ] Remover qualquer duplicação de lógica de fetch entre Server Components e Server Actions
- [ ] Garantir que todos os testes continuem verdes após refatoração
- [ ] Verificar que `api-client.ts` não contém lógica de negócio — apenas transporte HTTP

### Saída esperada
- Separação clara entre Server e Client Components em cada página
- `api-client.ts` como único ponto de chamada ao NestJS backend
- Sem duplicação de guards de auth entre middleware e Server Actions
- Todos os testes verdes

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar `cd packages/web && next build` — sem erros de TypeScript ou de build
- [ ] Executar `cd packages/web && next lint` — sem warnings críticos
- [ ] Executar testes unitários das Server Actions
- [ ] Executar testes de integração do middleware e api-client
- [ ] Executar `node scripts/smoke/purchase-flow.ts` apontando para Vercel preview URL
- [ ] Validar fluxo manual ponta a ponta: compra, admin, checkin

### Comandos finais
```bash
cd packages/web && next build
cd packages/web && next lint
npm run test:unit -- --testPathPattern="packages/web"
npm run test:integration -- --testPathPattern="packages/web"
node scripts/smoke/purchase-flow.ts
```

### Rollout
- **Estratégia de deploy:** deploy no Vercel como novo projeto; Vinext em Cloudflare Workers permanece como fallback até validação; troca de DNS/URL da demo apenas após smoke tests 100% no novo stack
- **Uso de feature flag:** não necessário — novo projeto Vercel com URL separada até troca de DNS
- **Plano de monitoramento pós-release:** verificar logs do Vercel para erros de Server Actions; monitorar latência de SSR nas páginas críticas (`/`, `/eventos/[slug]`)
- **Métricas a observar:** tempo de build Vercel, latência de TTFB nas páginas com SSR, taxa de erro em Server Actions
- **Alertas esperados:** nenhum no Vinext/Cloudflare — deploy paralelo

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** qualquer horário — deploy paralelo sem troca de DNS imediata
- **Tempo de monitoramento:** 30 minutos após troca de DNS para o Vercel

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: mapa de rotas, componentes client/server e variáveis de ambiente definidos
- [ ] Checkpoint 2 — Estratégia de testes aprovada: contratos de middleware, Server Actions e api-client revisados
- [ ] Checkpoint 3 — RED tests concluídos: testes de middleware, Server Actions e api-client falhando pelo motivo correto
- [ ] Checkpoint 4 — GREEN alcançado: setup, auth e páginas críticas funcionais com testes passando
- [ ] Checkpoint 5 — Refatoração concluída: separação Server/Client Components revisada, sem duplicações
- [ ] Checkpoint 6 — Validação final concluída: build, lint, smoke e homologação manual passando

### Log resumido dos checkpoints
| Checkpoint | Responsável | Resultado | Observações |
|-----------|-------------|-----------|-------------|
| 1 — Discovery | @jeandias | ⏳ Pendente | |
| 2 — Estratégia de testes | @jeandias | ⏳ Pendente | |
| 3 — RED tests | @jeandias | ⏳ Pendente | |
| 4 — GREEN | @jeandias | ⏳ Pendente | |
| 5 — Refatoração | @jeandias | ⏳ Pendente | |
| 6 — Validação final | @jeandias | ⏳ Pendente | |

---

## 13. Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Comprador acessa `/` no Vercel | Lista de eventos carrega via SSR sem erro | Screenshot / network log | ⬜ |
| Comprador acessa `/eventos/[slug]` e seleciona lote | LotSelector atualiza preço corretamente | Screenshot / interação manual | ⬜ |
| Comprador completa compra: `/eventos/[slug]` → Stripe → `/checkout/success` → `/meus-ingressos` | Tickets aparecem com QR code após pagamento | Screenshot de `/meus-ingressos` | ⬜ |
| Usuário não autenticado acessa `/meus-ingressos` | Redirect para `/login` | Network log / URL final | ⬜ |
| Customer autenticado acessa `/admin` | Redirect ou 403 | Network log / response body | ⬜ |
| Organizer acessa `/admin` → cria evento → publica | Evento aparece na home | Screenshot do fluxo | ⬜ |
| Checker acessa `/checkin` → escaneia QR via câmera | Check-in confirmado com feedback visual | Screenshot / response do NestJS | ⬜ |
| E2E smoke no stack Vercel + Railway | `purchase-flow.ts` retorna exit 0 | Output do script | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Build Vercel falhando em produção após troca de DNS
- Server Actions retornando erros 500 em fluxo de compra
- Middleware bloqueando rotas que deveriam estar acessíveis
- Integração com Better Auth quebrando sessão de usuários existentes
- Smoke tests falhando no novo stack após troca de DNS

### Passos
1. Reverter DNS da demo para apontar de volta ao Cloudflare Workers (Vinext)
2. Verificar se o Vinext está respondendo corretamente após re-apontamento
3. Executar smoke tests no stack Vinext: `GET /api/events`, fluxo de compra manual
4. Comunicar rollback e registrar causa provável no CHANGELOG.md
5. Abrir task de investigação com logs do Vercel e Railway para diagnosticar causa raiz

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 30 minutos (reversão de DNS para Cloudflare Workers)

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos cobertos por testes antes da implementação (TDD)
- [ ] Os testes foram escritos antes da implementação
- [ ] Todas as 9 rotas migradas e funcionais no Vercel
- [ ] Middleware de proteção de rotas funcionando para todos os roles
- [ ] Server Actions delegam lógica de negócio ao NestJS — nenhuma regra de preço no frontend
- [ ] Better Auth integrado com sessão via cookies HttpOnly no Next.js
- [ ] Build e lint passando sem erros
- [ ] E2E smoke tests passando no stack Next.js + NestJS integrado
- [ ] Não houve regressão nos fluxos críticos (compra, check-in, admin)
- [ ] Rollback documentado e testado
- [ ] Critérios de sucesso da sprint foram atingidos

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Escopo acordado entregue: todas as 9 rotas, Server Actions, auth e deploy no Vercel
- [ ] Critérios de aceite atendidos
- [ ] Testes unitários e de integração passando
- [ ] Build Vercel funcionando no ambiente de produção
- [ ] Smoke tests passando no stack integrado Vercel + Railway + Neon
- [ ] Sem violação arquitetural crítica (regras de negócio no NestJS, não no Next.js)
- [ ] Sem blocker aberto
- [ ] Documentação de infra/deploy atualizada

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

Always keep the sprint specific to the current codebase and architecture.
Follow the sprint template exactly.
```
