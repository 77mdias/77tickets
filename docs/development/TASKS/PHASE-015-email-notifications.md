---
title: Tasks — Fase 015: Email Transacional + Ticket Delivery
type: phase-task-board
mode: execution-tracking
status: completed
---

# 🚀 Tasks — Fase 015: Email Transacional + Ticket Delivery

**Status:** ✅ CONCLUÍDA
**Última atualização:** 2026-04-02
**Sprint Atual:** Sprint 015
**Modo principal:** backend
**Status Geral:** ✅ 100% (11/11 tarefas completas) — FASE CONCLUÍDA
**ETA:** 1 semana
**Pré-requisito:** Sprint 014 ✅ (pagamento confirmado — `ConfirmOrderPaymentUseCase` com transição de status `paid`)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-015.md`

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Infrastructure/Email | 3 | 3 | 0 | 0 | 0 |
| Application | 2 | 2 | 0 | 0 | 0 |
| Templates HTML | 2 | 2 | 0 | 0 | 0 |
| Scheduling/API | 1 | 1 | 0 | 0 | 0 |
| Tests | 3 | 3 | 0 | 0 | 0 |
| **TOTAL** | **11** | **11** | **0** | **0** | **0** |

### 🎯 Principais Indicadores
- ✅ Implementação técnica concluída com EMAIL-001 até EMAIL-011
- ✅ Contrato `EmailProvider` concluído e integrado
- ✅ SDK Resend isolado em `src/server/email/resend.email-provider.ts`
- ✅ Integração aplicada sobre `ConfirmOrderPaymentUseCase` com dispatch não bloqueante
- ✅ Cobertura adicionada em unit, integration e regression para fluxos críticos

---

## 🎯 Objetivos da Fase

- Entregar fluxo de email de confirmação de pedido com QR codes inline após pagamento confirmado
- Entregar fluxo de lembrete automático 24h antes do evento via cron endpoint protegido
- Estabelecer contrato `EmailProvider` portável em `src/server/email/` seguindo o padrão do módulo `src/server/payment/`
- Garantir que use-cases de email permaneçam framework-agnostic (sem imports de Vinext, Cloudflare Workers ou Next.js)
- Cobrir todos os fluxos críticos com testes unitários, de integração e regressão antes da implementação

---

## 🗺️ Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 014 concluída com `ConfirmOrderPaymentUseCase` funcional e `order.status` transitando para `paid`
- `RESEND_API_KEY` e `EMAIL_FROM` configurados como env vars e wrangler secrets antes do deploy
- Utilitário de geração de QR code como data URL base64 disponível (novo ou existente)

### Caminho crítico
1. EMAIL-001 — Contrato `EmailProvider` (base para todos os use-cases e adapter)
2. EMAIL-002 — `ResendEmailProvider` com retry (implementação do contrato)
3. EMAIL-004 — `SendOrderConfirmationEmailUseCase` (use-case principal pós-pagamento)
4. EMAIL-006 — Template HTML de confirmação (payload do use-case)
5. EMAIL-009 — Testes unitários do use-case de confirmação (valida o caminho crítico)

### Paralelização possível
- EMAIL-005 (`SendEventReminderEmailUseCase`) pode iniciar em paralelo com EMAIL-004 após EMAIL-001 definido
- EMAIL-007 (template de lembrete) pode rodar em paralelo com EMAIL-006 (template de confirmação)
- EMAIL-008 (cron endpoint) pode rodar em paralelo com EMAIL-004 após EMAIL-001 definido
- EMAIL-003 (env vars) pode ser configurado em qualquer momento antes do deploy

### Checkpoints
- [x] Discovery concluído: `ConfirmOrderPaymentUseCase` mapeado, ponto de extensão de email identificado
- [x] Estratégia técnica validada: interface `EmailProvider` revisada e aprovada
- [x] Primeira batch implementada: EMAIL-001, EMAIL-002, EMAIL-003 concluídos
- [x] Integração validada: email de confirmação disparado e recebido em staging
- [x] Encerramento pronto: todos os testes passando, cron operacional, fase concluída

---

## 📦 Estrutura de Categorias

---

### 📦 Infrastructure/Email — Contrato e adaptador do provedor de email

#### Objetivo
Estabelecer o módulo `src/server/email/` com contrato portável `EmailProvider` e implementação `ResendEmailProvider`. Este módulo é a única camada que conhece o SDK Resend — todos os outros módulos dependem apenas da interface.

#### Escopo da categoria
- Interface `EmailProvider` com métodos tipados para confirmação e lembrete
- Implementação `ResendEmailProvider` com retry e exponential backoff
- Variáveis de ambiente `RESEND_API_KEY` e `EMAIL_FROM` documentadas e versionadas

#### Riscos da categoria
- Acoplamento acidental do SDK Resend em use-cases ou handlers quebraria portabilidade
- Configuração incorreta de `EMAIL_FROM` pode causar rejeição pelos servidores de email

#### EMAIL.1 — Infraestrutura de Email

- [x] **EMAIL-001** — Contrato `EmailProvider` em `src/server/email/email.provider.ts`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Criar interface TypeScript `EmailProvider` que define o contrato de envio de email, sem dependência de nenhum SDK específico.
  - A interface deve ter dois métodos: `sendOrderConfirmation(order, tickets, event)` e `sendEventReminder(order, event)`.
  - Seguir o mesmo padrão arquitetural de `src/server/payment/` onde contrato e adapter vivem no mesmo módulo.

  **Contexto mínimo:**
  - O padrão de contrato + adapter em `src/server/payment/` é a referência arquitetural a seguir
  - A interface deve aceitar apenas tipos de domínio (Order, Ticket, Event) — não tipos do SDK Resend
  - Use-cases dependem desta interface via injeção de dependência, nunca do adapter diretamente

  **Implementação sugerida:**
  - Criar arquivo `src/server/email/email.provider.ts` com `export interface EmailProvider { ... }`
  - Tipar os parâmetros com types de domínio existentes em `src/server/`
  - Exportar barrel em `src/server/email/index.ts`

  **Arquivos/áreas afetadas:** `src/server/email/email.provider.ts`, `src/server/email/index.ts`

  **Critérios de aceitação:**
  - [ ] Interface `EmailProvider` exportada com métodos `sendOrderConfirmation` e `sendEventReminder`
  - [ ] Nenhum import de `resend`, `@resend/node` ou qualquer SDK externo no arquivo do contrato
  - [ ] Tipos de parâmetros usam tipos de domínio (Order, Ticket, Event) da camada de servidor
  - [ ] Barrel export disponível via `src/server/email/index.ts`

  **Estratégia de teste:**
  - [ ] Unitário: mock implementando a interface compila e é aceito pelo TypeScript
  - [ ] Nenhum teste de runtime necessário para a interface pura

  **Dependências:** Nenhuma
  **Bloqueia:** EMAIL-002, EMAIL-004, EMAIL-005, EMAIL-008
  **Pode rodar em paralelo com:** EMAIL-003

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Interface compila sem erros
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **EMAIL-002** — `ResendEmailProvider` implementando `EmailProvider`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Implementar `ResendEmailProvider` em `src/server/email/resend.email-provider.ts` como adapter concreto do contrato `EmailProvider`.
  - Usar Resend SDK para envio. Implementar retry com exponential backoff: máximo 3 tentativas, delays de 1s, 2s e 4s.
  - Este é o único arquivo em todo o projeto que pode importar o SDK Resend.

  **Contexto mínimo:**
  - Resend SDK: `import { Resend } from 'resend'` — disponível via npm
  - `RESEND_API_KEY` e `EMAIL_FROM` lidos de `process.env` no construtor
  - Retry deve ser transparente para o use-case: o use-case chama `provider.sendOrderConfirmation()` uma vez e o adapter cuida das retentativas internamente

  **Implementação sugerida:**
  - Criar classe `ResendEmailProvider implements EmailProvider`
  - Método `sendWithRetry(fn, maxAttempts = 3)` privado com exponential backoff
  - Converter templates HTML para string antes de chamar `resend.emails.send()`
  - Logar falhas com contexto (orderId, tentativa) sem relançar para o caller

  **Arquivos/áreas afetadas:** `src/server/email/resend.email-provider.ts`

  **Critérios de aceitação:**
  - [ ] `ResendEmailProvider` implementa todos os métodos da interface `EmailProvider`
  - [ ] Retry com máximo 3 tentativas e exponential backoff implementado
  - [ ] SDK Resend não importado em nenhum outro arquivo além deste
  - [ ] Falha após 3 tentativas é logada mas não relançada (fire-and-forget seguro)

  **Estratégia de teste:**
  - [ ] Unitário: mock do SDK Resend valida que retry é tentado 3 vezes antes de desistir
  - [ ] Unitário: falha após 3 tentativas não lança exceção para o caller
  - [ ] Integração: adapter usa `RESEND_API_KEY` e `EMAIL_FROM` do ambiente corretamente

  **Dependências:** EMAIL-001
  **Bloqueia:** EMAIL-004, EMAIL-005
  **Pode rodar em paralelo com:** EMAIL-003, EMAIL-006, EMAIL-007

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **EMAIL-003** — Env vars: `RESEND_API_KEY` e `EMAIL_FROM`

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - Documentar e registrar as variáveis de ambiente necessárias para o módulo de email.
  - `RESEND_API_KEY`: chave da API do Resend para autenticação.
  - `EMAIL_FROM`: endereço de origem dos emails (ex.: `ingressos@77ticket.com`).

  **Contexto mínimo:**
  - Sem `RESEND_API_KEY` configurada, `ResendEmailProvider` deve operar como no-op silencioso (ou logar aviso) sem quebrar o fluxo de pagamento
  - Para Cloudflare Workers, as env vars devem ser configuradas via `wrangler secret put`
  - Para desenvolvimento local, adicionadas ao `.env.local`

  **Implementação sugerida:**
  - Adicionar `RESEND_API_KEY` e `EMAIL_FROM` ao `.env.example` com valores de placeholder
  - Documentar os comandos `wrangler secret put RESEND_API_KEY` e `wrangler secret put EMAIL_FROM` no runbook de deploy
  - Adicionar validação opcional no startup do adapter (log de aviso se ausentes, não erro fatal)

  **Arquivos/áreas afetadas:** `.env.example`, `wrangler.toml` (seção `[vars]` ou secrets)

  **Critérios de aceitação:**
  - [ ] `.env.example` atualizado com `RESEND_API_KEY` e `EMAIL_FROM`
  - [ ] Instrução de configuração para Cloudflare Workers documentada
  - [ ] Aplicação inicia sem erro quando variáveis estão ausentes (no-op com log de aviso)

  **Estratégia de teste:**
  - [ ] Regressão: build e startup não falham quando `RESEND_API_KEY` está ausente

  **Dependências:** Nenhuma
  **Bloqueia:** Nenhuma (necessário antes do deploy, não bloqueia desenvolvimento)
  **Pode rodar em paralelo com:** EMAIL-001, EMAIL-002

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 30min
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Application — Use-cases de notificação por email

#### Objetivo
Implementar os dois use-cases de email na camada de aplicação: confirmação de pedido (disparado após pagamento) e lembrete de evento (disparado pelo cron). Ambos recebem `EmailProvider` por injeção de dependência e não têm conhecimento do provedor concreto.

#### Escopo da categoria
- `SendOrderConfirmationEmailUseCase`: busca tickets, gera QR codes e chama `EmailProvider.sendOrderConfirmation`
- `SendEventReminderEmailUseCase`: lista pedidos pagos por evento e chama `EmailProvider.sendEventReminder`

#### Riscos da categoria
- `SendOrderConfirmationEmailUseCase` deve verificar `order.status === 'paid'` antes de disparar para evitar envio indevido
- Geração de QR code base64 pode ser lenta para pedidos com muitos tickets — considerar limite ou processamento assíncrono se necessário

#### EMAIL.2 — Use-cases de Email

- [x] **EMAIL-004** — `SendOrderConfirmationEmailUseCase`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Criar use-case `SendOrderConfirmationEmailUseCase` que busca tickets do pedido, gera QR code data URL base64 para cada ticket, e chama `EmailProvider.sendOrderConfirmation`.
  - Deve verificar `order.status === 'paid'` antes de qualquer operação — pedidos com status diferente não disparam email.
  - Integrar ao fluxo de `ConfirmOrderPaymentUseCase`: chamado após a transição para `paid`.

  **Contexto mínimo:**
  - Busca de tickets por `orderId` via repositório existente (não acessa banco diretamente)
  - QR code gerado como `data:image/png;base64,...` usando biblioteca de QR code (ex.: `qrcode`) — valor do QR é o `ticket.code`
  - `EmailProvider` injetado via construtor — use-case não sabe qual provider está em uso

  **Implementação sugerida:**
  - Criar `src/server/application/use-cases/send-order-confirmation-email.use-case.ts`
  - Construtor: `(ticketRepository, emailProvider: EmailProvider)`
  - `execute(orderId)`: buscar order, validar status, buscar tickets, gerar QR codes, chamar provider
  - Integrar em `ConfirmOrderPaymentUseCase` após `order.status = 'paid'` (fire-and-forget: não aguardar ou capturar exceção)

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/send-order-confirmation-email.use-case.ts`, `src/server/application/use-cases/confirm-order-payment.use-case.ts`

  **Critérios de aceitação:**
  - [ ] Use-case verifica `order.status === 'paid'` antes de disparar email
  - [ ] QR code base64 gerado para cada ticket do pedido
  - [ ] `EmailProvider.sendOrderConfirmation` chamado com order, tickets com QR codes e event
  - [ ] Falha no provider não propaga exceção para o caller de `ConfirmOrderPaymentUseCase`
  - [ ] Nenhum import de SDK Resend ou framework no arquivo do use-case

  **Estratégia de teste:**
  - [ ] Unitário: verifica chamada ao provider com payload correto quando order.status === 'paid'
  - [ ] Unitário: verifica ausência de chamada ao provider quando order.status !== 'paid'
  - [ ] Regressão: falha no provider não quebra execução do caller
  - [ ] Integração: handler de pagamento dispara use-case após transição paid

  **Dependências:** EMAIL-001, EMAIL-002
  **Bloqueia:** EMAIL-009, EMAIL-010
  **Pode rodar em paralelo com:** EMAIL-005, EMAIL-007, EMAIL-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

  **Notas adicionais:**
  - Integração com `ConfirmOrderPaymentUseCase` deve ser fire-and-forget para não impactar latência do fluxo de pagamento

---

- [x] **EMAIL-005** — `SendEventReminderEmailUseCase`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Criar use-case `SendEventReminderEmailUseCase` que, dado um evento, lista todos os pedidos com status `paid` e envia email de lembrete para cada comprador via `EmailProvider.sendEventReminder`.
  - Usado pelo cron endpoint `POST /api/cron/event-reminders` que passa os eventos elegíveis (startsAt entre 23h-25h a partir de agora).

  **Contexto mínimo:**
  - Busca de pedidos pagos por evento via repositório existente
  - Email de lembrete inclui nome do evento, data/hora, local e link para `/meus-ingressos`
  - Se nenhum pedido elegível encontrado, use-case retorna sem envios e sem erro

  **Implementação sugerida:**
  - Criar `src/server/application/use-cases/send-event-reminder-email.use-case.ts`
  - Construtor: `(orderRepository, emailProvider: EmailProvider)`
  - `execute(eventId)`: buscar event, listar paid orders, para cada order chamar `emailProvider.sendEventReminder`
  - Processar envios sequencialmente ou em paralelo (cuidado com rate limits do Resend)

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/send-event-reminder-email.use-case.ts`

  **Critérios de aceitação:**
  - [ ] Use-case lista apenas pedidos com status `paid` para o evento
  - [ ] `EmailProvider.sendEventReminder` chamado para cada comprador elegível
  - [ ] Use-case retorna sem erro quando nenhum pedido elegível encontrado
  - [ ] Nenhum import de SDK Resend ou framework no arquivo do use-case

  **Estratégia de teste:**
  - [ ] Unitário: verifica chamada ao provider para cada paid order do evento
  - [ ] Unitário: verifica ausência de chamadas quando não há paid orders
  - [ ] Regressão: pedidos cancelados ou expirados não recebem lembrete

  **Dependências:** EMAIL-001, EMAIL-002
  **Bloqueia:** EMAIL-008
  **Pode rodar em paralelo com:** EMAIL-004, EMAIL-007

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Templates HTML — Templates responsivos de email

#### Objetivo
Criar templates HTML responsivos para os dois tipos de email: confirmação de pedido (com QR codes inline) e lembrete de evento. Os templates são funções TypeScript puras que recebem dados de domínio e retornam string HTML — sem dependência de framework de UI.

#### Escopo da categoria
- Template de confirmação: nome do evento, data/local, lista de tickets com QR code inline, link para /meus-ingressos
- Template de lembrete: nome do evento, data/hora/local, link para /meus-ingressos, chamada para ação

#### Riscos da categoria
- QR codes como `img src=data:image/png;base64,...` podem aumentar o tamanho do email significativamente para pedidos com muitos tickets
- Compatibilidade de CSS inline com clientes de email (Gmail, Outlook) requer atenção especial — evitar flexbox/grid

#### EMAIL.3 — Templates HTML

- [x] **EMAIL-006** — Template HTML: confirmação de pedido

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar template HTML responsivo para email de confirmação de pedido em `src/server/email/templates/order-confirmation.template.ts`.
  - Função TypeScript pura que recebe `(order, tickets com QR data URLs, event)` e retorna string HTML.
  - Deve incluir: nome do evento, data/local, lista de tickets com QR code inline (`img src=data:`), link para `/meus-ingressos`.

  **Contexto mínimo:**
  - CSS deve ser inline (clientes de email não suportam `<style>` externo)
  - QR code é passado como `qrDataUrl: string` por ticket — o template apenas renderiza no `<img>`
  - Testar layout em 375px (mobile) e 600px (desktop email padrão)

  **Implementação sugerida:**
  - Criar `src/server/email/templates/order-confirmation.template.ts` com função `renderOrderConfirmationEmail(data)`
  - Estrutura: header com logo/nome da plataforma, bloco do evento, lista de tickets com QR code, footer com link `/meus-ingressos`
  - CSS inline com max-width 600px, font-size mínimo 14px, QR code com max-width 200px por ticket

  **Arquivos/áreas afetadas:** `src/server/email/templates/order-confirmation.template.ts`

  **Critérios de aceitação:**
  - [ ] Template renderiza QR codes inline via `<img src="data:image/png;base64,...">` para cada ticket
  - [ ] Layout responsivo: funciona em 375px (mobile) sem overflow horizontal
  - [ ] Inclui link clicável para `/meus-ingressos`
  - [ ] Inclui nome do evento, data formatada e local
  - [ ] Nenhuma dependência de React, shadcn, Tailwind ou qualquer framework de UI

  **Estratégia de teste:**
  - [ ] Unitário: função retorna string HTML com QR code do ticket
  - [ ] Unitário: função retorna string HTML com nome do evento e data
  - [ ] Manual: rendering verificado em cliente de email em mobile e desktop

  **Dependências:** EMAIL-001
  **Bloqueia:** EMAIL-004 (template necessário para o use-case)
  **Pode rodar em paralelo com:** EMAIL-005, EMAIL-007, EMAIL-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **EMAIL-007** — Template HTML: lembrete de evento

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar template HTML responsivo para email de lembrete de evento em `src/server/email/templates/event-reminder.template.ts`.
  - Função TypeScript pura que recebe `(order, event)` e retorna string HTML.
  - Deve incluir: nome do evento, data/hora, local, link para `/meus-ingressos`, mensagem de incentivo ("seu ingresso te espera").

  **Contexto mínimo:**
  - Template mais simples que o de confirmação — não inclui QR codes (comprador já os recebeu na confirmação)
  - Tom amigável e de urgência positiva: o evento é amanhã
  - Mesmo padrão de CSS inline e max-width 600px

  **Implementação sugerida:**
  - Criar `src/server/email/templates/event-reminder.template.ts` com função `renderEventReminderEmail(data)`
  - Estrutura: header com nome da plataforma, destaque do evento (nome em grande), data/hora/local, CTA para `/meus-ingressos`, footer
  - Destacar visualmente a data e hora do evento (fonte maior, cor de destaque)

  **Arquivos/áreas afetadas:** `src/server/email/templates/event-reminder.template.ts`

  **Critérios de aceitação:**
  - [ ] Template inclui nome do evento, data formatada e local
  - [ ] CTA com link para `/meus-ingressos` visível e clicável
  - [ ] Layout responsivo: funciona em 375px (mobile) sem overflow horizontal
  - [ ] Nenhuma dependência de React, shadcn, Tailwind ou qualquer framework de UI

  **Estratégia de teste:**
  - [ ] Unitário: função retorna string HTML com nome do evento e link para /meus-ingressos
  - [ ] Manual: rendering verificado em cliente de email em mobile

  **Dependências:** EMAIL-001
  **Bloqueia:** EMAIL-005 (template necessário para o use-case)
  **Pode rodar em paralelo com:** EMAIL-004, EMAIL-006, EMAIL-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Scheduling/API — Cron endpoint para lembretes automáticos

#### Objetivo
Criar o endpoint `POST /api/cron/event-reminders` que é acionado por Cloudflare Workers Scheduled Events para disparar lembretes de eventos com `startsAt` entre 23h e 25h a partir do momento da execução. O endpoint é protegido por `CRON_SECRET` header para evitar execuções não autorizadas.

#### Escopo da categoria
- Endpoint de cron protegido por `CRON_SECRET` header
- Lógica de busca de eventos elegíveis (startsAt na janela de 23h-25h)
- Disparo de `SendEventReminderEmailUseCase` para cada evento elegível

#### Riscos da categoria
- Janela de 23h-25h deve ser verificada com precisão — cron executado a cada hora pode disparar duplicatas se não houver idempotência
- Requests sem `CRON_SECRET` válido devem retornar 401 sem informações de diagnóstico

#### EMAIL.4 — Cron Endpoint

- [x] **EMAIL-008** — Cron endpoint `POST /api/cron/event-reminders`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Criar endpoint `POST /api/cron/event-reminders` em `src/app/api/cron/event-reminders/route.ts`.
  - Protegido por verificação de `Authorization: Bearer ${CRON_SECRET}` header.
  - Busca eventos com `startsAt` entre 23h e 25h a partir do momento da execução e dispara `SendEventReminderEmailUseCase` para cada um.

  **Contexto mínimo:**
  - Cloudflare Workers Scheduled Events chamam o endpoint via HTTP POST com `CRON_SECRET` no header
  - Janela de busca: `NOW + 23h <= event.startsAt <= NOW + 25h` para tolerar imprecisões de scheduling
  - Retorna 200 com contagem de eventos processados mesmo quando nenhum evento é encontrado

  **Implementação sugerida:**
  - Criar `src/app/api/cron/event-reminders/route.ts` com handler `POST`
  - Validar `Authorization` header contra `process.env.CRON_SECRET` — retornar 401 se inválido
  - Buscar eventos elegíveis via repositório ou query direta
  - Para cada evento, chamar `SendEventReminderEmailUseCase.execute(event.id)`
  - Registrar entrada de cron no `wrangler.toml` com `crons = ["0 * * * *"]` (a cada hora)

  **Arquivos/áreas afetadas:** `src/app/api/cron/event-reminders/route.ts`, `wrangler.toml`

  **Critérios de aceitação:**
  - [ ] Endpoint retorna 401 quando `CRON_SECRET` header ausente ou inválido
  - [ ] Endpoint retorna 200 com `{ processed: N }` quando executa com sucesso
  - [ ] Endpoint retorna 200 com `{ processed: 0 }` quando nenhum evento elegível encontrado
  - [ ] `SendEventReminderEmailUseCase` chamado para cada evento com `startsAt` na janela de 23h-25h

  **Estratégia de teste:**
  - [ ] Unitário: handler retorna 401 sem `CRON_SECRET` válido
  - [ ] Unitário: handler chama use-case para eventos na janela correta
  - [ ] Unitário: handler retorna 200 sem erro quando nenhum evento elegível

  **Dependências:** EMAIL-001, EMAIL-005
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** EMAIL-004, EMAIL-006, EMAIL-007

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

  **Notas adicionais:**
  - Adicionar `CRON_SECRET` ao `.env.example` e documentar configuração via `wrangler secret put CRON_SECRET`

---

### 📦 Tests — Cobertura de testes obrigatórios

#### Objetivo
Garantir cobertura de testes unitários, de integração e regressão para os fluxos críticos de email: envio de confirmação após pagamento, proteção contra envio indevido para pedidos não-paid, e acionamento do cron.

#### Escopo da categoria
- Testes unitários de `SendOrderConfirmationEmailUseCase` com EmailProvider mockado
- Testes de integração do handler de pagamento disparando email
- Testes de regressão validando que pedidos cancelados/expirados não recebem email

#### Riscos da categoria
- Testes que usam o SDK Resend real introduziriam dependência de rede e custo — usar sempre mock
- Cobertura insuficiente do guard `order.status === 'paid'` é o risco de regressão mais crítico

#### EMAIL.5 — Testes

- [x] **EMAIL-009** — Unit: `SendOrderConfirmationEmailUseCase` com `EmailProvider` mockado

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever testes unitários para `SendOrderConfirmationEmailUseCase` com `EmailProvider` mockado via Jest/Vitest.
  - Validar: chamada ao provider com payload correto (order, tickets, event), QR codes incluídos, ausência de chamada quando order.status !== 'paid'.

  **Contexto mínimo:**
  - `EmailProvider` mockado implementa a interface e captura chamadas
  - Order com status `paid` deve disparar exatamente uma chamada ao provider
  - QR codes devem estar presentes no payload (não nulos/vazios)

  **Implementação sugerida:**
  - Arquivo: `tests/unit/server/application/use-cases/send-order-confirmation-email.use-case.test.ts`
  - Mock de `EmailProvider` com `jest.fn()` ou `vi.fn()`
  - Testar cenários: paid order dispara email, non-paid order não dispara, payload inclui todos os tickets com QR codes

  **Arquivos/áreas afetadas:** `tests/unit/server/application/use-cases/send-order-confirmation-email.use-case.test.ts`

  **Critérios de aceitação:**
  - [ ] Teste verifica chamada ao provider com order, todos os tickets e event corretos
  - [ ] Teste verifica que QR codes (data URLs) estão presentes no payload
  - [ ] Teste verifica ausência de chamada ao provider quando order.status === 'cancelled'
  - [ ] Teste verifica ausência de chamada ao provider quando order.status === 'expired'

  **Estratégia de teste:**
  - [ ] Unitário: `EmailProvider` mockado
  - [ ] Regressão: status não-paid bloqueia envio

  **Dependências:** EMAIL-004
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** EMAIL-010, EMAIL-011

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes implementados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **EMAIL-010** — Integration: handler de confirmação de pagamento dispara email após transição paid

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever teste de integração que valida que o handler `POST /api/orders/:id/confirm-payment` (ou equivalente) dispara `SendOrderConfirmationEmailUseCase` após a transição de status para `paid`.
  - `EmailProvider` é mockado — não usa Resend real.

  **Contexto mínimo:**
  - O teste executa o handler real (ou use-case real de confirmação de pagamento) com dependências mockadas
  - Verifica que após execução bem-sucedida, `EmailProvider.sendOrderConfirmation` foi chamado
  - Verifica que a transição de status para `paid` ocorre independentemente do sucesso ou falha do email

  **Implementação sugerida:**
  - Arquivo: `tests/integration/server/api/confirm-payment-sends-email.test.ts`
  - Setup: order em estado pendente, `EmailProvider` mockado, repositórios com dados de teste
  - Execução: chamar handler/use-case de confirmação de pagamento
  - Verificação: `EmailProvider.sendOrderConfirmation` chamado com dados corretos

  **Arquivos/áreas afetadas:** `tests/integration/server/api/confirm-payment-sends-email.test.ts`

  **Critérios de aceitação:**
  - [ ] Teste confirma que `EmailProvider.sendOrderConfirmation` é chamado após transição para `paid`
  - [ ] Teste confirma que `order.status === 'paid'` mesmo se `EmailProvider` lançar exceção
  - [ ] Teste usa `EmailProvider` mockado — sem dependência de Resend real

  **Estratégia de teste:**
  - [ ] Integração: handler → use-case de pagamento → use-case de email → provider mockado

  **Dependências:** EMAIL-004, EMAIL-009
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** EMAIL-009, EMAIL-011

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes implementados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **EMAIL-011** — Regression: email NÃO é enviado para pedidos cancelados/expirados

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever teste de regressão que valida explicitamente que `SendOrderConfirmationEmailUseCase` não dispara email para pedidos com status `cancelled`, `expired` ou qualquer status diferente de `paid`.
  - Esta é a proteção crítica contra envio indevido de ingressos para pedidos inválidos.

  **Contexto mínimo:**
  - A regra de negócio `order.status === 'paid'` é o guard que protege o envio
  - O teste deve cobrir pelo menos os status: `cancelled`, `expired`, `pending`
  - Se o use-case for chamado com order de status não-paid, deve retornar sem chamar o provider

  **Implementação sugerida:**
  - Arquivo: `tests/regression/email-not-sent-for-non-paid-orders.test.ts`
  - Parametrizar o teste com múltiplos status (`cancelled`, `expired`, `pending`)
  - Para cada status: criar order, chamar use-case, verificar que `EmailProvider.sendOrderConfirmation` NÃO foi chamado

  **Arquivos/áreas afetadas:** `tests/regression/email-not-sent-for-non-paid-orders.test.ts`

  **Critérios de aceitação:**
  - [ ] Teste cobre status `cancelled` — sem chamada ao provider
  - [ ] Teste cobre status `expired` — sem chamada ao provider
  - [ ] Teste cobre status `pending` — sem chamada ao provider
  - [ ] Teste falha se o guard `order.status === 'paid'` for removido da implementação

  **Estratégia de teste:**
  - [ ] Regressão: guard de status verificado para múltiplos estados inválidos

  **Dependências:** EMAIL-004, EMAIL-009
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** EMAIL-009, EMAIL-010

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes implementados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

## 🧪 Testes e Validações

- **Suites necessárias:** Jest ou Vitest (unitários e integração), revisão manual de templates HTML em cliente de email
- **Cobertura alvo:** 100% dos branches de guard `order.status === 'paid'` em use-cases de email; cobertura de retry logic no adapter
- **Comandos de verificação:**
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run lint:architecture`
  - `npm run build`
- **Estado atual:** ⏳ Parcial — nenhum teste escrito ainda (fase em planejamento)
- **Fluxos críticos a validar manualmente:**
  - Comprador completa pagamento em staging → email de confirmação recebido com QR codes de todos os tickets
  - Email de confirmação abre corretamente em cliente mobile (375px) — QR codes visíveis
  - Cron endpoint acionado manualmente via `curl -X POST /api/cron/event-reminders -H "Authorization: Bearer $CRON_SECRET"` → email reminder enviado

---

## 🔍 Riscos, Bloqueios e Decisões

### Bloqueios atuais
- Sprint 014 (pagamento) deve estar concluída antes de integrar `SendOrderConfirmationEmailUseCase` ao fluxo de `ConfirmOrderPaymentUseCase`
- `RESEND_API_KEY` precisa ser configurada no ambiente de staging antes da homologação manual

### Riscos em aberto
- Acoplamento acidental do SDK Resend fora de `src/server/email/resend.email-provider.ts` quebraria portabilidade para Next.js/NestJS na migração futura
- Tamanho do email pode ser elevado para pedidos com muitos tickets (QR codes base64 inline) — monitorar limite de 10MB por email no Resend
- Rate limiting do Resend pode afetar o cron endpoint para eventos com muitos compradores — considerar batch com delay se necessário

### Decisões importantes
- `EmailProvider` segue o mesmo padrão arquitetural de `src/server/payment/` (contrato + adapter no mesmo módulo) — garante consistência
- Fire-and-forget para email de confirmação: falha no provider não bloqueia transição de status do pedido para `paid`
- QR code gerado como data URL base64 inline (não como URL para endpoint de imagem) para garantir disponibilidade offline do email
- Cron protegido por `CRON_SECRET` header (Bearer token) — padrão simples e suficiente para Cloudflare Scheduled Events

---

## 📚 Documentação e Comunicação

- [x] Atualizar `docs/development/TASKS.md` com entrada da Fase 015
- [x] Atualizar `docs/development/CHANGELOG.md` com funcionalidades de email entregues
- [x] Documentar comandos de configuração de wrangler secrets no runbook de deploy (`docs/infrastructure/`)
- [x] Atualizar `.env.example` com `RESEND_API_KEY`, `EMAIL_FROM` e `CRON_SECRET`
- [x] Registrar decisão de fire-and-forget para email pós-pagamento

---

## ✅ Checklist de Encerramento da Fase

- [x] EMAIL-001 a EMAIL-011 concluídas ou formalmente adiadas
- [x] `npm run test:unit` passando com cobertura de guards de status
- [x] `npm run test:integration` passando com handler de pagamento disparando email
- [x] Testes de regressão para pedidos não-paid passando
- [ ] Homologação manual: email de confirmação recebido em staging com QR codes
- [ ] Homologação manual: email de lembrete recebido após cron trigger manual
- [x] `EmailProvider` portável verificado: sem imports de framework nos use-cases
- [x] `RESEND_API_KEY` e `CRON_SECRET` documentados no runbook de deploy
- [x] Cron registrado em `wrangler.toml` como Scheduled Event
- [x] `docs/development/CHANGELOG.md` atualizado
- [x] GOV closure criado para Fase 015
