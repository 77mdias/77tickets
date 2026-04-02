---
title: Tasks — Fase 014: Payment Gateway Integration
type: phase-task-board
mode: execution-tracking
status: completed
---

# Tasks — Fase 014: Payment Gateway Integration

**Status:** ✅ CONCLUÍDA
**Última atualização:** 2026-04-01
**Sprint Atual:** Sprint 014
**Modo principal:** backend
**Status Geral:** ✅ 100% (15/15) tarefas completas
**ETA:** Concluída
**Pré-requisito:** Sprint 013 ✅ (CD Cloudflare + Release Security)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-014.md`

---

## Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Domain & Application | 4 | 4 | 0 | 0 | 0 |
| Infrastructure/Payment | 2 | 2 | 0 | 0 | 0 |
| API | 3 | 3 | 0 | 0 | 0 |
| Frontend | 3 | 3 | 0 | 0 | 0 |
| Tests | 3 | 3 | 0 | 0 | 0 |
| **TOTAL** | **15** | **15** | **0** | **0** | **0** |

### Principais Indicadores
- ✅ Fase concluída — todas as tarefas encerradas
- ✅ Contrato `PaymentProvider` definido e isolado em `src/server/payment/`
- ✅ Caminho crítico concluído: PAY-005 → PAY-001 → PAY-009 → PAY-007 → PAY-002 → PAY-013 → PAY-014 → PAY-015
- ✅ Suites unit, integration e regression executadas com sucesso

---

## Objetivos da Fase

- Implementar contrato `PaymentProvider` portável, com `StripePaymentProvider` isolado em `src/server/payment/`
- Fechar fluxo de checkout: pedido `pending` transita para `paid` via Stripe Checkout Session
- Processar webhook Stripe com validação HMAC, ativando tickets e incrementando coupon após confirmação
- Habilitar fallback de simulação (`PAYMENT_MODE=demo`) para demo sem dependência de Stripe real
- Garantir cobertura de testes: unit (use-cases), integration (webhook handler), regression (fluxo compra → pagamento → ticket ativo)

---

## Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 013 concluída ✅ — ambiente de deploy Cloudflare Workers operacional
- Repositórios de `Order`, `Ticket`, `Lot`, `Coupon` disponíveis com métodos de atualização de status
- Schema Drizzle com campos `status` em `orders` e `tickets`, `quantity` em `lots`, `redemption_count` em `coupons`

### Caminho crítico
1. PAY-005 — Contrato `PaymentProvider` + `StripePaymentProvider`
2. PAY-001 — `CreateStripeCheckoutSessionUseCase`
3. PAY-009 — Atualizar `POST /api/orders` para retornar `checkoutUrl`
4. PAY-007 — `POST /api/webhooks/stripe` com validação HMAC
5. PAY-002 — `ConfirmOrderPaymentUseCase`
6. PAY-013, PAY-014, PAY-015 — Testes unitários, de integração e regressão

### Paralelização possível
- PAY-003 e PAY-004 em paralelo após PAY-005 (ambos dependem apenas do contrato)
- PAY-010, PAY-011, PAY-012 (frontend) em paralelo após PAY-009 (quando `checkoutUrl` está disponível)
- PAY-013 (unit tests) e PAY-014 (integration tests) podem ser escritos em paralelo na RED phase

### Checkpoints
- [x] Discovery concluído: fluxo de pedido mapeado, contrato `PaymentProvider` rascunhado
- [x] Estratégia técnica validada: casos de teste definidos, matriz revisada
- [x] PAY-005 e PAY-006 implementados (infra base disponível)
- [x] Webhook handler integrado e testado (PAY-007 + PAY-014)
- [x] Encerramento pronto: todos os critérios de aceite da sprint atendidos

---

## Estrutura de Categorias

---

### Domain & Application — Use-cases de pagamento portáveis

#### Objetivo
Implementar os use-cases que orquestram o ciclo de vida do pagamento — criação de sessão Stripe, confirmação de pedido, cancelamento por falha e simulação demo — mantendo zero acoplamento com qualquer framework ou gateway concreto. Todo acesso ao Stripe ocorre exclusivamente via contrato `PaymentProvider`.

#### Escopo da categoria
- `CreateStripeCheckoutSessionUseCase`: cria sessão no gateway e retorna URL de redirecionamento
- `ConfirmOrderPaymentUseCase`: transita pedido para `paid`, ativa tickets, incrementa coupon
- `CancelOrderOnPaymentFailureUseCase`: transita pedido para `cancelled`, reverte quantidade no lot
- `SimulatePaymentUseCase`: confirma pedido sem gateway real, disponível apenas em `PAYMENT_MODE=demo`

#### Riscos da categoria
- Use-case importando Stripe SDK diretamente quebraria portabilidade para NestJS
- `SimulatePaymentUseCase` sem guarda server-side poderia ser ativado em produção indevidamente

---

#### PAY-001 — `CreateStripeCheckoutSessionUseCase`

- [x] **PAY-001** — Criar use-case que recebe `orderId` e `customerId`, chama `PaymentProvider.createCheckoutSession` e retorna `checkoutUrl`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar use-case que aceita `orderId` e `customerId`, busca o pedido com seus itens e chama `PaymentProvider.createCheckoutSession(order, items)`.
  - Retornar objeto com `checkoutUrl` para uso no handler de `POST /api/orders`.
  - Não importar Stripe diretamente — apenas injetar e chamar `PaymentProvider`.

  **Contexto mínimo:**
  - Depende de PAY-005 para ter o contrato `PaymentProvider` definido
  - O `orderId` deve ser derivado server-side — nunca confiado no client
  - `checkoutUrl` será passado pelo handler para o frontend redirecionar

  **Implementação sugerida:**
  - Injetar `PaymentProvider`, `OrderRepository` e `OrderItemRepository` (ou equivalente)
  - Buscar pedido e validar que está em `pending` antes de criar sessão
  - Chamar `paymentProvider.createCheckoutSession(order, lineItems)` e retornar a URL

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/create-stripe-checkout-session.use-case.ts`

  **Critérios de aceitação:**
  - [x] Retorna `checkoutUrl` quando pedido está em `pending`
  - [x] Lança erro se pedido não existe ou não está em `pending`
  - [x] Não importa Stripe SDK — usa apenas interface `PaymentProvider`
  - [x] Coberto por teste unitário com mock de `PaymentProvider`

  **Estratégia de teste:**
  - [x] Unitário: mock de `PaymentProvider`, assertar que `createCheckoutSession` é chamado com dados corretos
  - [x] Regressão: pedido em status diferente de `pending` deve ser rejeitado

  **Dependências:** PAY-005
  **Bloqueia:** PAY-009
  **Pode rodar em paralelo com:** PAY-003, PAY-004 (após PAY-005)

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Teste unitário adicionado e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem import de Stripe fora de `src/server/payment/`

---

#### PAY-002 — `ConfirmOrderPaymentUseCase`

- [x] **PAY-002** — Criar use-case que transita pedido `pending → paid`, ativa todos os tickets do pedido e incrementa `redemption_count` do coupon se aplicado

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar use-case chamado pelo webhook handler após `checkout.session.completed`.
  - Aceitar `orderId` derivado de `session.metadata` — nunca do body bruto sem validação.
  - Transitar `order.status` de `pending` para `paid`.
  - Ativar todos os tickets associados ao pedido (`ticket.status = active`).
  - Incrementar `coupon.redemption_count` apenas se coupon foi aplicado ao pedido.
  - Ser idempotente: pedido já `paid` não deve disparar nova transição.

  **Contexto mínimo:**
  - Regra de domínio: tickets só ficam ativos quando `order.status = paid`
  - Coupon `redemption_count` deve incrementar apenas após pagamento confirmado
  - Idempotência obrigatória — webhook pode chegar mais de uma vez

  **Implementação sugerida:**
  - Injetar `OrderRepository`, `TicketRepository`, `CouponRepository`
  - Verificar status atual do pedido antes de transitar (guard idempotente)
  - Executar transição em transação atômica: status do pedido + status dos tickets + coupon
  - Retornar pedido confirmado com tickets ativos

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/confirm-order-payment.use-case.ts`

  **Critérios de aceitação:**
  - [x] Pedido transita de `pending` para `paid`
  - [x] Todos os tickets do pedido ficam com `status = active`
  - [x] `coupon.redemption_count` incrementa quando coupon está associado
  - [x] Pedido já `paid` não dispara nova transição (idempotência)
  - [x] Coberto por teste unitário com todos os cenários

  **Estratégia de teste:**
  - [x] Unitário: transição de status, ativação de tickets, incremento de coupon
  - [x] Edge case: idempotência — chamar duas vezes com mesmo `orderId`
  - [x] Regressão: pedido sem coupon não causa erro

  **Dependências:** PAY-005, PAY-007 (chamado pelo webhook)
  **Bloqueia:** PAY-013, PAY-015
  **Pode rodar em paralelo com:** PAY-003, PAY-004

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes adicionados e passando (transição, tickets, coupon, idempotência)
  - [x] Critérios de aceitação atendidos
  - [x] Sem violação arquitetural evidente

---

#### PAY-003 — `CancelOrderOnPaymentFailureUseCase`

- [x] **PAY-003** — Criar use-case que transita pedido `pending → cancelled` e reverte a quantidade reservada no lot

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar use-case chamado pelo webhook handler após `payment_intent.payment_failed`.
  - Transitar `order.status` de `pending` para `cancelled`.
  - Reverter a quantidade de ingressos no lot (`lot.quantity += order.quantity`).
  - Ser idempotente: pedido já `cancelled` não deve disparar nova reversão de estoque.

  **Contexto mínimo:**
  - Regra de domínio: lot não pode ficar com quantidade incorreta após falha de pagamento
  - Reversão de quantidade deve ser atômica com transição de status do pedido

  **Implementação sugerida:**
  - Injetar `OrderRepository`, `LotRepository`
  - Verificar status atual do pedido (guard idempotente)
  - Reverter quantidade no lot e transitar status em transação atômica

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/cancel-order-on-payment-failure.use-case.ts`

  **Critérios de aceitação:**
  - [x] Pedido transita de `pending` para `cancelled`
  - [x] Quantidade do lot é revertida corretamente
  - [x] Pedido já `cancelled` não dispara nova reversão (idempotência)
  - [x] Coberto por teste unitário

  **Estratégia de teste:**
  - [x] Unitário: transição de status, reversão de lot
  - [x] Edge case: idempotência — chamar duas vezes com mesmo `orderId`

  **Dependências:** PAY-005
  **Bloqueia:** PAY-014, PAY-015
  **Pode rodar em paralelo com:** PAY-001, PAY-004

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes adicionados e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem violação arquitetural evidente

---

#### PAY-004 — `SimulatePaymentUseCase`

- [x] **PAY-004** — Criar use-case de simulação de pagamento para modo demo, que confirma pedido sem chamar gateway real

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar use-case que aceita `orderId` e confirma o pedido como pago sem gateway externo.
  - Verificar `PAYMENT_MODE` server-side: lançar erro se `PAYMENT_MODE !== 'demo'`.
  - Internamente reutilizar a lógica de `ConfirmOrderPaymentUseCase` para evitar duplicação.

  **Contexto mínimo:**
  - Disponível apenas quando `PAYMENT_MODE=demo` — nunca em produção com Stripe
  - A verificação deve ser server-side, não baseada em flag enviada pelo client
  - Permite testar fluxo completo de checkout sem configurar Stripe

  **Implementação sugerida:**
  - Verificar `process.env.PAYMENT_MODE === 'demo'` (ou equivalente de env Cloudflare)
  - Chamar `ConfirmOrderPaymentUseCase` internamente ou reutilizar a lógica
  - Retornar pedido confirmado com tickets ativos

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/simulate-payment.use-case.ts`

  **Critérios de aceitação:**
  - [x] Confirma pedido quando `PAYMENT_MODE=demo`
  - [x] Lança erro quando `PAYMENT_MODE !== 'demo'`
  - [x] Não chama nenhum gateway de pagamento externo
  - [x] Coberto por teste unitário incluindo o caso de bloqueio

  **Estratégia de teste:**
  - [x] Unitário: modo demo confirma pedido; modo stripe lança erro

  **Dependências:** PAY-005, PAY-002
  **Bloqueia:** PAY-008
  **Pode rodar em paralelo com:** PAY-001, PAY-003

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes adicionados e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem violação arquitetural evidente

---

### Infrastructure/Payment — Contrato e implementação do gateway

#### Objetivo
Definir o contrato `PaymentProvider` que isola completamente o domain/application do Stripe, e implementar `StripePaymentProvider` contendo toda a lógica de integração com o SDK do Stripe. Nenhum arquivo fora de `src/server/payment/` deve importar o SDK do Stripe.

#### Escopo da categoria
- Interface `PaymentProvider` com métodos `createCheckoutSession` e `constructWebhookEvent`
- `StripePaymentProvider` implementando o contrato e encapsulando o SDK
- Configuração de variáveis de ambiente para Stripe e controle de modo de pagamento

#### Riscos da categoria
- Stripe SDK importado fora de `src/server/payment/` quebraria portabilidade (detectável via `lint:architecture`)
- Raw body obrigatório para `constructWebhookEvent` — Cloudflare Workers pode processar o body antes do handler

---

#### PAY-005 — Contrato `PaymentProvider` + `StripePaymentProvider`

- [x] **PAY-005** — Definir interface `PaymentProvider` e implementar `StripePaymentProvider` isolando todo acesso ao SDK do Stripe

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Criar `src/server/payment/payment.provider.ts` com interface: `createCheckoutSession(order, items): Promise<{ checkoutUrl: string }>` e `constructWebhookEvent(payload: string, signature: string): WebhookEvent`.
  - Criar `src/server/payment/stripe.payment-provider.ts` implementando a interface com o SDK `stripe`.
  - Garantir que nenhum tipo do SDK Stripe vaze para fora do módulo `src/server/payment/`.

  **Contexto mínimo:**
  - Este arquivo é o único ponto de importação do SDK `stripe` em todo o projeto
  - `constructWebhookEvent` requer raw body (string), não body parseado
  - Tipos de retorno devem usar tipos próprios do domínio, não tipos do Stripe

  **Implementação sugerida:**
  - Definir tipos de domínio: `CheckoutItem`, `WebhookEvent` (com `type` e `metadata`)
  - `StripePaymentProvider.createCheckoutSession`: criar `stripe.checkout.sessions.create` com `line_items` mapeados dos itens do pedido
  - `StripePaymentProvider.constructWebhookEvent`: chamar `stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)`

  **Arquivos/áreas afetadas:** `src/server/payment/payment.provider.ts`, `src/server/payment/stripe.payment-provider.ts`

  **Critérios de aceitação:**
  - [x] Interface `PaymentProvider` define `createCheckoutSession` e `constructWebhookEvent`
  - [x] `StripePaymentProvider` implementa a interface sem expor tipos do SDK Stripe
  - [x] Nenhum outro arquivo fora de `src/server/payment/` importa `stripe`
  - [x] Lint arquitetural passa sem violações

  **Estratégia de teste:**
  - [x] Unitário: mock de `Stripe` class para testar `StripePaymentProvider` sem chamadas reais
  - [x] Integração: `constructWebhookEvent` com payload e assinatura válidos e inválidos

  **Dependências:** PAY-006
  **Bloqueia:** PAY-001, PAY-002, PAY-003, PAY-004, PAY-007
  **Pode rodar em paralelo com:** PAY-006

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes adicionados e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem import de `stripe` fora de `src/server/payment/`

---

#### PAY-006 — Stripe SDK + variáveis de ambiente

- [x] **PAY-006** — Instalar SDK `stripe`, definir variáveis de ambiente obrigatórias e atualizar `.env.example`

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - Instalar pacote `stripe` como dependência de produção.
  - Definir variáveis `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_MODE` em `.env.example`.
  - Documentar como configurar os segredos no Cloudflare Workers (via `wrangler secret put` ou dashboard).
  - Garantir que `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` nunca apareçam em logs ou respostas de API.

  **Contexto mínimo:**
  - `PAYMENT_MODE` aceita valores: `demo` (sem Stripe) ou `stripe` (modo teste ou produção)
  - `STRIPE_SECRET_KEY` deve ser chave de modo teste (`sk_test_...`) no ambiente de preview
  - `STRIPE_WEBHOOK_SECRET` é gerado ao registrar endpoint de webhook no dashboard Stripe

  **Implementação sugerida:**
  - `npm install stripe` ou `bun add stripe`
  - Adicionar ao `.env.example`: `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `PAYMENT_MODE=demo`
  - Atualizar runbook de infra com instrução de configuração para Cloudflare Workers

  **Arquivos/áreas afetadas:** `package.json`, `.env.example`, `docs/infrastructure/`

  **Critérios de aceitação:**
  - [x] SDK `stripe` instalado e disponível
  - [x] `.env.example` atualizado com as três variáveis
  - [x] Documentação de configuração para Cloudflare Workers adicionada
  - [x] Variáveis sensíveis não expostas em logs

  **Estratégia de teste:**
  - [x] Build: garantir que `stripe` resolve corretamente no target Cloudflare Workers

  **Dependências:** Nenhuma
  **Bloqueia:** PAY-005
  **Pode rodar em paralelo com:** PAY-001, PAY-002, PAY-003, PAY-004

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] `.env.example` atualizado
  - [x] Build passando com SDK instalado
  - [x] Sem violação arquitetural evidente

---

### API — Endpoints de pagamento e webhook

#### Objetivo
Implementar os handlers de API que expõem o fluxo de pagamento: webhook Stripe com validação HMAC, endpoint de simulação demo e atualização do endpoint de criação de pedido para retornar `checkoutUrl`. Handlers devem permanecer finos — toda lógica de negócio em use-cases.

#### Escopo da categoria
- `POST /api/webhooks/stripe`: processa eventos Stripe com validação de assinatura
- `POST /api/orders/:id/simulate-payment`: aciona simulação apenas em modo demo
- `POST /api/orders`: atualizado para retornar `checkoutUrl` na criação

#### Riscos da categoria
- Raw body corrompido pelo framework antes da validação HMAC invalidaria todas as assinaturas
- Handler com lógica de negócio inline violaria arquitetura thin-handler

---

#### PAY-007 — `POST /api/webhooks/stripe`

- [x] **PAY-007** — Implementar handler de webhook Stripe com validação de assinatura HMAC e despacho para use-case correto

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Criar `src/app/api/webhooks/stripe/route.ts`.
  - Ler o header `stripe-signature` e o raw body da requisição.
  - Chamar `StripePaymentProvider.constructWebhookEvent(rawBody, signature)` para validar HMAC.
  - Retornar HTTP 400 se assinatura inválida, sem processar o evento.
  - Despachar `checkout.session.completed` para `ConfirmOrderPaymentUseCase`.
  - Despachar `payment_intent.payment_failed` para `CancelOrderOnPaymentFailureUseCase`.
  - Retornar HTTP 200 para eventos reconhecidos e processados.

  **Contexto mínimo:**
  - Cloudflare Workers: usar `request.text()` para obter raw body antes de qualquer parse
  - `orderId` deve ser extraído de `session.metadata.orderId` — nunca do body diretamente
  - Handler deve ser stateless — não armazenar estado entre requisições

  **Implementação sugerida:**
  - `const rawBody = await request.text()`
  - Validar assinatura via `paymentProvider.constructWebhookEvent(rawBody, signature)`
  - `switch (event.type)` para despachar para use-case correto
  - Retornar `{ received: true }` com HTTP 200 após processamento

  **Arquivos/áreas afetadas:** `src/app/api/webhooks/stripe/route.ts`

  **Critérios de aceitação:**
  - [x] Assinatura inválida retorna HTTP 400 sem processar evento
  - [x] `checkout.session.completed` dispara `ConfirmOrderPaymentUseCase`
  - [x] `payment_intent.payment_failed` dispara `CancelOrderOnPaymentFailureUseCase`
  - [x] Handler não contém lógica de negócio inline
  - [x] Coberto por teste de integração com payload e assinatura mockados

  **Estratégia de teste:**
  - [x] Integração: payload `checkout.session.completed` com assinatura válida → 200
  - [x] Integração: payload com assinatura inválida → 400
  - [x] Integração: payload `payment_intent.payment_failed` → cancelamento executado

  **Dependências:** PAY-005, PAY-002, PAY-003
  **Bloqueia:** PAY-014, PAY-015
  **Pode rodar em paralelo com:** PAY-008, PAY-009

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes de integração adicionados e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem lógica de negócio no handler

---

#### PAY-008 — `POST /api/orders/:id/simulate-payment`

- [x] **PAY-008** — Implementar endpoint de simulação de pagamento disponível apenas em `PAYMENT_MODE=demo`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Criar `src/app/api/orders/[id]/simulate-payment/route.ts`.
  - Extrair `orderId` do parâmetro de rota `:id` (nunca do body).
  - Chamar `SimulatePaymentUseCase` com o `orderId`.
  - Retornar HTTP 403 se `PAYMENT_MODE !== 'demo'` (verificado server-side pelo use-case).
  - Retornar pedido confirmado com tickets ativos em caso de sucesso.

  **Contexto mínimo:**
  - Endpoint não deve existir funcionalmente em modo `stripe` — use-case já garante isso
  - `orderId` do path param deve ser validado com Zod antes de usar

  **Implementação sugerida:**
  - Validar `params.id` com Zod
  - Chamar `simulatePaymentUseCase.execute({ orderId: params.id })`
  - Tratar erro de `PAYMENT_MODE` inválido retornando HTTP 403

  **Arquivos/áreas afetadas:** `src/app/api/orders/[id]/simulate-payment/route.ts`

  **Critérios de aceitação:**
  - [x] Retorna HTTP 200 com pedido confirmado em modo `demo`
  - [x] Retorna HTTP 403 quando `PAYMENT_MODE !== 'demo'`
  - [x] `orderId` validado com Zod
  - [x] Handler thin — sem lógica de negócio inline

  **Estratégia de teste:**
  - [x] Unitário: delegado ao `SimulatePaymentUseCase` (PAY-004)
  - [x] Integração: chamada em modo demo → 200; chamada em modo stripe → 403

  **Dependências:** PAY-004
  **Bloqueia:** PAY-010
  **Pode rodar em paralelo com:** PAY-007, PAY-009

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes adicionados e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem violação arquitetural evidente

---

#### PAY-009 — Atualizar `POST /api/orders` para retornar `checkoutUrl`

- [x] **PAY-009** — Atualizar handler de criação de pedido para chamar `CreateStripeCheckoutSessionUseCase` e retornar `checkoutUrl` ou redirecionar para simulação

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Após criar o pedido em `pending`, chamar `CreateStripeCheckoutSessionUseCase` se `PAYMENT_MODE=stripe`.
  - Se `PAYMENT_MODE=demo`, retornar URL do endpoint de simulação (`/api/orders/:id/simulate-payment`).
  - Incluir `checkoutUrl` na resposta de `POST /api/orders`.
  - Preservar contrato de resposta existente — adicionar `checkoutUrl` sem remover campos atuais.

  **Contexto mínimo:**
  - Handler deve permanecer thin — delegar para use-cases
  - Frontend usa `checkoutUrl` para redirecionar o usuário para o Stripe Checkout ou botão de simulação

  **Implementação sugerida:**
  - Após `createOrderUseCase.execute(...)`, verificar `PAYMENT_MODE`
  - Em modo `stripe`: chamar `createStripeCheckoutSessionUseCase.execute({ orderId, customerId })`
  - Em modo `demo`: construir URL relativa `{ checkoutUrl: `/checkout/simulate?orderId=${orderId}` }`
  - Incluir `checkoutUrl` no objeto de resposta

  **Arquivos/áreas afetadas:** `src/app/api/orders/route.ts`

  **Critérios de aceitação:**
  - [x] Resposta de `POST /api/orders` inclui `checkoutUrl`
  - [x] Em modo `stripe`, `checkoutUrl` aponta para Stripe Checkout
  - [x] Em modo `demo`, `checkoutUrl` aponta para fluxo de simulação
  - [x] Contrato de resposta anterior não foi quebrado

  **Estratégia de teste:**
  - [x] Integração: `POST /api/orders` retorna `checkoutUrl` em ambos os modos
  - [x] Regressão: campos existentes na resposta preservados

  **Dependências:** PAY-001
  **Bloqueia:** PAY-010, PAY-015
  **Pode rodar em paralelo com:** PAY-007, PAY-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Testes adicionados e passando
  - [x] Critérios de aceitação atendidos
  - [x] Sem violação arquitetural evidente

---

### Frontend — Checkout e feedback pós-pagamento

#### Objetivo
Atualizar o fluxo de checkout no frontend para usar `checkoutUrl` retornado pela API, exibindo botão de simulação em modo demo ou redirecionando para Stripe Checkout em modo stripe. Implementar páginas de retorno com feedback claro ao usuário e atualizar "Meus Ingressos" após o checkout.

#### Escopo da categoria
- `checkout-form.tsx`: redireciona para `checkoutUrl` ou exibe botão de simulação
- `/checkout/success`: página de confirmação de pagamento
- `/checkout/cancel`: página de cancelamento com instruções
- "Meus Ingressos": refetch do estado após retorno do checkout

#### Riscos da categoria
- Frontend não pode determinar `PAYMENT_MODE` autonomamente — deve usar o `checkoutUrl` retornado pela API
- Estado de "Meus Ingressos" pode ficar stale se não houver refetch após retorno do Stripe

---

#### PAY-010 — Checkout page: redirecionar para `checkoutUrl` ou botão de simulação

- [x] **PAY-010** — Atualizar `checkout-form.tsx` para usar `checkoutUrl` da resposta de `POST /api/orders`

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Após `POST /api/orders` retornar `checkoutUrl`, redirecionar o usuário para essa URL.
  - Se `checkoutUrl` aponta para Stripe (começa com `https://checkout.stripe.com`), usar `window.location.href`.
  - Se `checkoutUrl` é relativo (modo demo), usar router interno do Next.js/Vinext.
  - Não expor lógica de `PAYMENT_MODE` no frontend — apenas usar o `checkoutUrl` como opaco.

  **Contexto mínimo:**
  - Frontend não decide qual modo de pagamento usar — isso é determinado server-side
  - `checkoutUrl` é tratado como URL opaca — frontend apenas redireciona

  **Implementação sugerida:**
  - Após submit do formulário e resposta bem-sucedida de `POST /api/orders`
  - Verificar se `checkoutUrl` é absoluto (Stripe) ou relativo (demo)
  - Redirecionar adequadamente

  **Arquivos/áreas afetadas:** `src/features/checkout/checkout-form.tsx`

  **Critérios de aceitação:**
  - [x] Usuário é redirecionado para `checkoutUrl` após criação do pedido
  - [x] Frontend não contém lógica de `PAYMENT_MODE`
  - [x] Estado de loading/submitting tratado durante redirecionamento

  **Estratégia de teste:**
  - [x] Unitário/componente: mock de `POST /api/orders` com `checkoutUrl` mockado

  **Dependências:** PAY-009
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** PAY-011, PAY-012

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Critérios de aceitação atendidos
  - [x] Sem lógica de `PAYMENT_MODE` no frontend

---

#### PAY-011 — Páginas `/checkout/success` e `/checkout/cancel`

- [x] **PAY-011** — Criar páginas de retorno do checkout com feedback visual ao usuário

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar `src/app/checkout/success/page.tsx`: exibir mensagem de confirmação, link para "Meus Ingressos".
  - Criar `src/app/checkout/cancel/page.tsx`: exibir mensagem de cancelamento com opção de tentar novamente.
  - Stripe redireciona para essas URLs após checkout (`success_url` e `cancel_url` na sessão).
  - Páginas devem ser funcionais mesmo sem parâmetros na URL (Stripe pode não enviar todos os params).

  **Contexto mínimo:**
  - `success_url` e `cancel_url` são configurados na criação da sessão Stripe em `CreateStripeCheckoutSessionUseCase`
  - Página de sucesso não deve assumir que tickets já estão ativos — webhook pode ter latência

  **Implementação sugerida:**
  - `/checkout/success`: "Pagamento confirmado! Seus ingressos serão ativados em breve." + link para `/my-tickets`
  - `/checkout/cancel`: "Pagamento cancelado. Seu pedido foi cancelado e o estoque liberado." + link para eventos

  **Arquivos/áreas afetadas:** `src/app/checkout/success/page.tsx`, `src/app/checkout/cancel/page.tsx`

  **Critérios de aceitação:**
  - [x] `/checkout/success` exibe mensagem de confirmação e link para ingressos
  - [x] `/checkout/cancel` exibe mensagem de cancelamento e opção de voltar
  - [x] Páginas renderizam sem erro mesmo sem parâmetros de URL

  **Estratégia de teste:**
  - [x] Unitário/componente: renderização básica das duas páginas

  **Dependências:** PAY-009 (URLs configuradas na sessão Stripe)
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** PAY-010, PAY-012

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Critérios de aceitação atendidos
  - [x] Páginas renderizam sem erro

---

#### PAY-012 — "Meus Ingressos": refetch após retorno do checkout

- [x] **PAY-012** — Garantir que "Meus Ingressos" atualiza o estado ao retornar da página de sucesso do checkout

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Ao montar a página `/my-tickets` (ou equivalente), forçar refetch dos ingressos para capturar tickets recém-ativados.
  - Considerar que webhook tem latência — pode exibir estado de "aguardando confirmação" se ticket ainda estiver em `pending`.
  - Implementar polling simples ou refetch automático ao focar a página.

  **Contexto mínimo:**
  - Webhook pode ter latência de alguns segundos após retorno do Stripe
  - Estado stale de cache pode mostrar tickets como `pending` mesmo após pagamento confirmado

  **Implementação sugerida:**
  - Invalidar cache/query de ingressos ao montar a página após retorno de `/checkout/success`
  - Opcionalmente: refetch automático ao focar a aba (`refetchOnWindowFocus`)

  **Arquivos/áreas afetadas:** `src/features/checkout/` ou página de "Meus Ingressos" relevante

  **Critérios de aceitação:**
  - [x] "Meus Ingressos" exibe tickets atualizados após retorno do checkout
  - [x] Não causa requisições excessivas ao servidor

  **Estratégia de teste:**
  - [x] Unitário/componente: mock de resposta de ingressos com refetch

  **Dependências:** PAY-011
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** PAY-010, PAY-011

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Implementação concluída
  - [x] Critérios de aceitação atendidos
  - [x] Sem requisições excessivas ao servidor

---

### Tests — Cobertura obrigatória de TDD

#### Objetivo
Implementar os testes RED-first que validam os comportamentos críticos do fluxo de pagamento: transição de status de pedido, ativação de tickets, validação HMAC de webhook e fluxo de ponta a ponta. Todos os testes devem ser escritos antes da implementação correspondente.

#### Escopo da categoria
- Testes unitários para `ConfirmOrderPaymentUseCase` com todos os cenários de transição
- Testes de integração para webhook handler com payload Stripe mockado
- Teste de regressão cobrindo fluxo completo: compra → pagamento → ticket ativo

#### Riscos da categoria
- Testes frágeis que dependem de tipos internos do Stripe SDK dificultam manutenção
- Ausência de teste de idempotência pode permitir dupla ativação de tickets em produção

---

#### PAY-013 — Unit: `ConfirmOrderPaymentUseCase`

- [x] **PAY-013** — Implementar testes unitários completos para `ConfirmOrderPaymentUseCase`

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Testar transição `pending → paid` com mock de `OrderRepository`.
  - Testar ativação de todos os tickets com mock de `TicketRepository`.
  - Testar incremento de `redemption_count` com mock de `CouponRepository`.
  - Testar idempotência: pedido já `paid` não dispara nova transição.
  - Testar pedido sem coupon não causa erro.

  **Contexto mínimo:**
  - Testes devem usar mocks de repositórios — sem acesso ao banco real
  - Cobrir todos os cenários documentados em Etapa 2 desta sprint

  **Implementação sugerida:**
  - Criar `tests/unit/confirm-order-payment.use-case.test.ts`
  - Usar jest/vitest com `vi.fn()` ou equivalente para mocks de repositórios
  - Assertar chamadas aos repositórios e estado final retornado

  **Arquivos/áreas afetadas:** `tests/unit/confirm-order-payment.use-case.test.ts`

  **Critérios de aceitação:**
  - [x] Transição de status testada
  - [x] Ativação de tickets testada
  - [x] Incremento de coupon testado
  - [x] Idempotência testada
  - [x] Caso sem coupon testado sem erro

  **Estratégia de teste:**
  - [x] Unitário: todos os cenários acima com mocks

  **Dependências:** PAY-002
  **Bloqueia:** PAY-015
  **Pode rodar em paralelo com:** PAY-014

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Testes implementados e passando
  - [x] Todos os cenários críticos cobertos
  - [x] Sem dependência de banco ou Stripe real

---

#### PAY-014 — Integration: `POST /api/webhooks/stripe`

- [x] **PAY-014** — Implementar testes de integração para o webhook handler com payload Stripe mockado e assinaturas válidas e inválidas

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Testar `POST /api/webhooks/stripe` com payload `checkout.session.completed` e assinatura válida → HTTP 200.
  - Testar com assinatura inválida → HTTP 400, sem chamar use-case.
  - Testar com payload `payment_intent.payment_failed` e assinatura válida → cancelamento executado.
  - Usar mock de `StripePaymentProvider.constructWebhookEvent` para controlar resultado da validação HMAC.

  **Contexto mínimo:**
  - Não fazer chamadas reais ao Stripe — usar mocks
  - Testar que o handler despacha para o use-case correto baseado em `event.type`

  **Implementação sugerida:**
  - Criar `tests/integration/webhooks/stripe.test.ts`
  - Mock de `StripePaymentProvider`: retornar evento válido ou lançar exceção de assinatura
  - Assertar resposta HTTP e chamadas aos use-cases

  **Arquivos/áreas afetadas:** `tests/integration/webhooks/stripe.test.ts`

  **Critérios de aceitação:**
  - [x] Assinatura válida + `checkout.session.completed` → 200 + use-case chamado
  - [x] Assinatura inválida → 400 + use-case não chamado
  - [x] Assinatura válida + `payment_intent.payment_failed` → 200 + cancelamento executado

  **Estratégia de teste:**
  - [x] Integração: cenários descritos acima

  **Dependências:** PAY-007
  **Bloqueia:** PAY-015
  **Pode rodar em paralelo com:** PAY-013

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Testes implementados e passando
  - [x] Todos os cenários de assinatura cobertos
  - [x] Sem chamadas reais ao Stripe

---

#### PAY-015 — Regression: fluxo compra → pagamento → ticket ativo

- [x] **PAY-015** — Implementar teste de regressão cobrindo o fluxo completo de compra de ingresso até ticket ativo

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Testar fluxo end-to-end em nível de aplicação: `createOrder` → `confirmOrderPayment` → ticket com `status = active`.
  - Garantir que o fluxo existente de `createOrder` não regrediu.
  - Garantir que coupon `redemption_count` está correto após o fluxo completo.
  - Usar banco de teste ou mocks de repositórios conforme convenção do projeto.

  **Contexto mínimo:**
  - Regressão cobre o fluxo crítico que a sprint entrega — se quebrar em produção, este teste detecta
  - Deve cobrir tanto o caminho de sucesso quanto o caminho de falha de pagamento

  **Implementação sugerida:**
  - Criar `tests/regression/payment-flow.test.ts`
  - Simular: criar evento → criar pedido → confirmar pagamento → assertar tickets ativos
  - Simular: criar evento → criar pedido → falhar pagamento → assertar pedido cancelado + lot revertido

  **Arquivos/áreas afetadas:** `tests/regression/payment-flow.test.ts`

  **Critérios de aceitação:**
  - [x] Fluxo sucesso: pedido `paid` + tickets `active` após confirmação
  - [x] Fluxo falha: pedido `cancelled` + lot revertido após falha de pagamento
  - [x] `createOrder` ainda cria pedido em `pending` (sem regressão)
  - [x] Coupon `redemption_count` correto após fluxo completo

  **Estratégia de teste:**
  - [x] Regressão: caminho de sucesso e caminho de falha

  **Dependências:** PAY-002, PAY-003, PAY-007, PAY-013, PAY-014
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** Nenhuma (depende de todos os anteriores)

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Completo

  **Definição de pronto:**
  - [x] Testes implementados e passando
  - [x] Fluxo completo validado (sucesso + falha)
  - [x] Nenhuma regressão detectada em `createOrder`

---

## Testes e Validações

- **Suites necessárias:** Vitest/Jest — unit, integration, regression
- **Cobertura alvo:** >90% de branches nos use-cases de pagamento; 100% dos cenários de webhook handler
- **Comandos de verificação:**
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:regression`
  - `npm run lint`
  - `npm run lint:architecture`
  - `npm run build`
- **Estado atual:** ✅ Concluída — fase encerrada
- **Fluxos críticos validados manualmente:**
  - Comprador conclui checkout Stripe (modo teste) → retorna a `/checkout/success` → tickets ativos em "Meus Ingressos"
  - Pagamento falha no Stripe → retorna a `/checkout/cancel` → pedido cancelado → estoque revertido
  - Botão "Simular Pagamento" visível apenas com `PAYMENT_MODE=demo`; ausente em modo `stripe`
  - Webhook com assinatura inválida retorna HTTP 400 sem processar

---

## Evidências de Validação

```bash
npm run test:unit
# 78 files, 395 tests passing

npm run test:integration
# 104 files, 541 tests passing

npm run test:regression
# 7 files, 26 tests passing

npm run lint
# 0 errors, warnings only

npm run lint:architecture
# pass

npm run build
# pass
```

---

## Riscos, Bloqueios e Decisões

### Bloqueios observados e resolvidos
- PAY-005 concluído — contrato `PaymentProvider` isolado e validado
- Variáveis de ambiente Stripe documentadas em `.env.example` e preparadas para preview/prod

### Riscos observados
- Raw body do webhook exigiu leitura explícita no handler para preservar validação HMAC no Cloudflare Workers
- Latência de webhook Stripe pode causar estado stale em "Meus Ingressos" imediatamente após retorno do checkout; o fluxo foi coberto com páginas de retorno e guidance claro
- Tipos Stripe permaneceram confinados em `src/server/payment/` para preservar a portabilidade para NestJS

### Decisões importantes
- Stripe SDK confinado estritamente em `src/server/payment/` — regra arquitetural não negociável detectada por `lint:architecture`
- `PAYMENT_MODE` verificado server-side nos use-cases — nunca confiado em parâmetro do client
- Idempotência no `ConfirmOrderPaymentUseCase` é obrigatória — webhook pode chegar duplicado
- Deploy incremental: `PAYMENT_MODE=demo` primeiro, depois `PAYMENT_MODE=stripe` com env vars do Stripe configuradas

---

## Documentacao e Comunicacao

- [x] Atualizar `docs/development/TASKS.md` com entrada da Fase 014
- [x] Atualizar `docs/development/CHANGELOG.md` com entradas de cada tarefa concluída
- [x] Atualizar docs de infra com instrução de configuração de `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` no Cloudflare Workers
- [x] Atualizar GOV closure ao encerrar a fase
- [x] Registrar decisão arquitetural de isolamento do Stripe em `src/server/payment/`

---

## Checklist de Encerramento da Fase

- [x] Todas as tarefas críticas concluídas (PAY-001 a PAY-009, PAY-013 a PAY-015)
- [x] Tasks de prioridade média concluídas ou formalmente adiadas (PAY-010, PAY-011, PAY-012)
- [x] Sem violação arquitetural: Stripe SDK fora de `src/server/payment/` não detectado
- [x] Testes unitários, de integração e regressão executados e passando
- [x] Fluxos críticos validados manualmente (4 cenários de homologação)
- [x] Documentação atualizada (infra, changelog, TASKS.md)
- [x] Revisão de segurança: validação HMAC obrigatória no webhook, `PAYMENT_MODE` verificado server-side
- [x] Aprovação final registrada
- [x] GOV closure criado
- [x] Changelog atualizado
