---
title: Sprint 014 — Payment Gateway Integration
type: sprint
mode: sprint
approach: tdd-first
status: planned
---

# Sprint 014 — Payment Gateway Integration

## 1. Objetivo

Fechar o gap crítico de pagamento: pedidos criados em estado `pending` devem transitar para `paid` via integração Stripe (modo teste) com fallback de simulação para demo, ativando tickets e completando o fluxo de checkout de ponta a ponta.

---

## 2. Resumo Executivo

- **Tipo da sprint:** feature
- **Modo principal do Agent OS:** backend
- **Fase relacionada:** Fase 014 — Payment Gateway Integration
- **Status:** 🟢 Planejada
- **Prioridade:** 🔴 Crítica
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 013 ✅
- **Janela estimada:** 2 semanas

---

## 3. Contexto

- **Problema atual:** `createOrder` cria pedido em `pending` — nunca transita para `paid` automaticamente. Tickets só são ativados quando `order.status = paid` (regra de domínio preservada), portanto nenhum comprador recebe ingressos válidos sem o fluxo de pagamento.
- **Impacto no sistema/produto:** Todos os fluxos de compra ficam incompletos. A demonstração do produto não cobre o ciclo checkout → pagamento → ticket ativo, tornando o produto inútil como demo.
- **Riscos envolvidos:** Acoplamento do Stripe SDK no domain/application quebraria portabilidade para NestJS. Webhook sem validação de assinatura expõe transições de estado a ataques.
- **Áreas afetadas:** `src/server/payment/`, `src/server/application/use-cases/`, `src/app/api/webhooks/`, `src/app/api/orders/`, `src/app/checkout/`, `src/features/checkout/`
- **Fluxos de usuário impactados:** Compra de ingresso (checkout → pagamento → confirmação → ticket ativo), cancelamento de pagamento (falha → pedido cancelado → estoque revertido).
- **Premissas importantes:** Stripe SDK fica estritamente em `src/server/payment/`. O contrato `PaymentProvider` isola o domain/application de qualquer dependência de gateway. Modo demo é controlado por env flag `PAYMENT_MODE=demo`.
- **Fora de escopo nesta sprint:** Split financeiro, PIX real, reembolso via gateway, autenticação 3DS.

---

## 4. Critérios de Sucesso

- [ ] Checkout redireciona para Stripe Checkout Session criada server-side
- [ ] Webhook `POST /api/webhooks/stripe` processa `checkout.session.completed` → `order.status = paid` → tickets `active`
- [ ] Webhook processa `payment_intent.payment_failed` → `order.status = cancelled` → lot quantity revertida
- [ ] Fallback demo: botão "Simular Pagamento" ativa pedido sem Stripe (controlado por `PAYMENT_MODE=demo`)
- [ ] Redemption count de cupom incrementa apenas após pagamento confirmado
- [ ] Contrato `PaymentProvider` em `src/server/payment/` com zero acoplamento Stripe no domain/application
- [ ] Testes unitários para `ConfirmOrderPaymentUseCase` passando (transição, ativação de tickets, incremento de coupon)
- [ ] Testes de integração para `POST /api/webhooks/stripe` com payload Stripe mockado e assinatura validada
- [ ] Teste de regressão cobrindo fluxo completo: compra → pagamento → ticket ativo

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] Sprint 013 ✅ — pipeline de CD Cloudflare operacional
- [ ] Contrato `PaymentProvider` definido antes de qualquer use-case de pagamento
- [ ] Variáveis de ambiente `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_MODE` configuradas
- [ ] Entidades `Order`, `Ticket`, `Lot`, `Coupon` disponíveis via repositórios existentes

### Ordem macro recomendada
1. Discovery técnico — mapear fluxo de pedido atual e pontos de integração
2. Definição do contrato `PaymentProvider` e estratégia de testes
3. RED tests para use-cases e webhook handler
4. Implementação de `StripePaymentProvider` + use-cases + endpoints
5. Refatoração — garantir limites de camada e portabilidade
6. Validação end-to-end e rollout incremental com `PAYMENT_MODE=demo`

### Paralelização possível
- `PAY-003` (`CancelOrderOnPaymentFailureUseCase`) e `PAY-004` (`SimulatePaymentUseCase`) podem ser implementados em paralelo após `PAY-005` (contrato `PaymentProvider`)
- `PAY-010`, `PAY-011`, `PAY-012` (frontend) podem avançar em paralelo após `PAY-009` (retorno de `checkoutUrl` em `POST /api/orders`)
- Testes unitários (`PAY-013`) e de integração (`PAY-014`) podem ser escritos em paralelo após RED phase

### Caminho crítico
- `PAY-005` → `PAY-001` → `PAY-009` → `PAY-007` → `PAY-002` → testes (`PAY-013`, `PAY-014`, `PAY-015`)

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Entender o estado atual do fluxo de pedido e mapear todos os pontos onde a integração de pagamento se conecta, sem introduzir acoplamento prematuro.

### Checklist
- [ ] Analisar `createOrder` use-case e confirmar que pedido termina em `pending` sem transição automática
- [ ] Identificar repositórios de `Order`, `Ticket`, `Lot`, `Coupon` e métodos disponíveis para transição de status
- [ ] Mapear `POST /api/orders` atual — resposta, tipagem e contrato de retorno
- [ ] Verificar se existe algum módulo de pagamento em `src/server/payment/` ou equivalente
- [ ] Mapear schema de `orders`, `tickets`, `lots` e `coupons` no Drizzle — confirmar campos `status`, `quantity`, `redemption_count`
- [ ] Identificar regras de negócio em `ConfirmOrderPayment` que precisam ser testadas: transição de status, ativação de tickets, incremento de coupon
- [ ] Levantar edge cases: webhook duplicado (idempotência), pedido já pago recebendo evento novamente, lot esgotado no momento da confirmação
- [ ] Confirmar restrições de arquitetura: Stripe SDK apenas em `src/server/payment/`, zero import de Stripe em domain/application
- [ ] Verificar restrições de Cloudflare Workers para raw body no webhook (necessário para validação HMAC)

### Saída esperada
- Contrato de `PaymentProvider` rascunhado com métodos mínimos necessários
- Lista de repositórios e métodos que o `ConfirmOrderPaymentUseCase` precisará chamar
- Identificação de riscos de idempotência no webhook
- Confirmação de viabilidade de leitura de raw body no runtime Cloudflare Workers

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Transformar o escopo em comportamento verificável antes de escrever qualquer linha de implementação.

### Checklist
- [ ] Definir interface `PaymentProvider` com assinaturas explícitas e tipos de retorno
- [ ] Definir critérios de aceite testáveis para cada use-case de pagamento
- [ ] Definir estratégia de mock para `StripePaymentProvider` nos testes unitários
- [ ] Listar cenários de sucesso, falha e regressão para webhook handler
- [ ] Confirmar que `SimulatePaymentUseCase` verifica `PAYMENT_MODE` server-side (não confia em flag do client)
- [ ] Confirmar que transição `pending → paid` e `pending → cancelled` respeita invariante de status de pedido
- [ ] Confirmar que coupon `redemption_count` é incrementado apenas na confirmação, não na criação do pedido

### Casos de teste planejados
- [ ] Cenário 1: Webhook `checkout.session.completed` com metadata de `orderId` válido transita pedido para `paid` e ativa todos os tickets
- [ ] Cenário 2: Webhook `payment_intent.payment_failed` cancela pedido e reverte quantidade no lot
- [ ] Cenário 3: Assinatura HMAC inválida no webhook retorna HTTP 400 sem processar evento
- [ ] Cenário 4: `SimulatePaymentUseCase` lança erro quando `PAYMENT_MODE != demo`
- [ ] Edge case 1: Webhook duplicado para pedido já `paid` não re-ativa tickets nem incrementa coupon novamente (idempotência)
- [ ] Edge case 2: Coupon `redemption_count` não incrementa se pagamento falhar
- [ ] Regressão 1: Fluxo completo compra → pagamento → ticket ativo não regride o fluxo existente de `createOrder`

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | `ConfirmOrderPaymentUseCase`, `CancelOrderOnPaymentFailureUseCase`, `SimulatePaymentUseCase` | Sim | Mock de `PaymentProvider` e repositórios |
| Integração | `POST /api/webhooks/stripe`, `POST /api/orders/:id/simulate-payment` | Sim | Payload Stripe mockado com assinatura válida e inválida |
| E2E | Checkout → Stripe → retorno → ticket ativo | Não (modo teste Stripe suficiente) | Validado manualmente em homologação |
| Regressão | Fluxo `createOrder` → pagamento → ticket | Sim | Garantir que `createOrder` não regride |
| Auth/AuthZ | Webhook sem auth (Stripe assina), `/simulate-payment` apenas em demo mode | Sim | Validação de `PAYMENT_MODE` server-side obrigatória |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED que falhem pelo motivo correto — ausência de implementação — antes de escrever qualquer código de produção.

### Checklist
- [ ] Escrever teste unitário para `ConfirmOrderPaymentUseCase` antes da implementação
- [ ] Escrever teste unitário para `CancelOrderOnPaymentFailureUseCase` antes da implementação
- [ ] Escrever teste de integração para `POST /api/webhooks/stripe` antes da implementação do handler
- [ ] Garantir que os testes falhem por `not implemented` ou `module not found`, não por erro de lógica
- [ ] Validar cobertura das transições de status de pedido e ativação de tickets
- [ ] Garantir teste de assinatura HMAC inválida retornando 400
- [ ] Adicionar teste de regressão para `createOrder` confirmando que pedido ainda inicia como `pending`

### Testes a implementar primeiro
- [ ] Teste unitário: `ConfirmOrderPaymentUseCase` — transita `pending → paid`, ativa tickets, incrementa coupon
- [ ] Teste unitário: `CancelOrderOnPaymentFailureUseCase` — transita `pending → cancelled`, reverte lot quantity
- [ ] Teste unitário: `SimulatePaymentUseCase` — lança erro quando `PAYMENT_MODE !== 'demo'`
- [ ] Teste de integração: `POST /api/webhooks/stripe` com `checkout.session.completed` válido → 200
- [ ] Teste de integração: `POST /api/webhooks/stripe` com assinatura inválida → 400
- [ ] Teste de regressão: `createOrder` continua criando pedido em `pending`
- [ ] Teste de edge case: webhook idempotente — pedido já `paid` não sofre dupla transição

### Evidência RED
- **Comando executado:** `npm run test:unit`
- **Falha esperada observada:** `Cannot find module 'src/server/application/use-cases/confirm-order-payment.use-case'`
- **Observações:** Testes devem falhar por ausência dos módulos, não por erro de asserção incorreta

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para fazer os testes passarem, mantendo Stripe SDK estritamente em `src/server/payment/` e use-cases livres de dependências de framework ou gateway.

### Checklist
- [ ] Implementar interface `PaymentProvider` em `src/server/payment/payment.provider.ts`
- [ ] Implementar `StripePaymentProvider` em `src/server/payment/stripe.payment-provider.ts`
- [ ] Implementar `CreateStripeCheckoutSessionUseCase`
- [ ] Implementar `ConfirmOrderPaymentUseCase`
- [ ] Implementar `CancelOrderOnPaymentFailureUseCase`
- [ ] Implementar `SimulatePaymentUseCase` com guarda de `PAYMENT_MODE`
- [ ] Implementar `POST /api/webhooks/stripe` com validação de assinatura HMAC
- [ ] Implementar `POST /api/orders/:id/simulate-payment` com guarda de modo demo
- [ ] Atualizar `POST /api/orders` para retornar `checkoutUrl`
- [ ] Implementar páginas `/checkout/success` e `/checkout/cancel`
- [ ] Atualizar `checkout-form.tsx` para redirecionar ou mostrar botão de simulação
- [ ] Configurar variáveis de ambiente no `.env.example` e documentação

### Regras obrigatórias
- Não confiar em input do client para `orderId` no webhook — derivar de `session.metadata`
- Stripe SDK importado apenas em `src/server/payment/stripe.payment-provider.ts`
- Toda regra crítica (transição de status, ativação de tickets) protegida em use-cases no backend
- Nenhuma implementação sem teste correspondente
- Toda correção relevante acompanhada de teste de regressão
- Handlers de webhook e API devem permanecer finos — delegar para use-cases
- `SimulatePaymentUseCase` deve verificar `PAYMENT_MODE` a partir de variável de ambiente server-side

### Mudanças previstas
- **Backend:** 4 novos use-cases em `src/server/application/use-cases/`; interface e implementação Stripe em `src/server/payment/`
- **API:** `POST /api/webhooks/stripe`, `POST /api/orders/:id/simulate-payment`, atualização de `POST /api/orders`
- **Frontend:** `src/features/checkout/checkout-form.tsx`, `/checkout/success`, `/checkout/cancel`
- **Banco/Schema:** sem alteração de schema — transições de status usam campos existentes
- **Infra/Config:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_MODE` em `.env.example` e Cloudflare secrets
- **Docs:** atualizar `docs/development/TASKS/PHASE-014-payment-gateway.md` com progresso; adicionar vars no runbook de infra

---

## 10. Etapa 5 — Refatoração

### Objetivo
Melhorar legibilidade e garantir que os limites entre camadas estejam nítidos, sem alterar o comportamento já validado pelos testes verdes.

### Checklist
- [ ] Revisar `StripePaymentProvider` — garantir que não vaza tipos Stripe para fora do módulo `src/server/payment/`
- [ ] Revisar use-cases — confirmar que dependem apenas de interfaces de repositório e `PaymentProvider`, não de implementações concretas
- [ ] Remover qualquer duplicação de lógica de transição de status entre use-cases
- [ ] Refinar nomes de métodos e tipos no contrato `PaymentProvider` para máxima clareza
- [ ] Garantir que todos os testes continuem verdes após refatoração
- [ ] Verificar que handler de webhook não contém lógica de negócio inline

### Saída esperada
- `PaymentProvider` com contrato limpo e portável para NestJS
- Use-cases sem dependência de Stripe, Cloudflare ou Next.js
- Handlers de webhook e API reduzidos a roteamento e validação de entrada

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar suíte unitária: `ConfirmOrderPaymentUseCase`, `CancelOrderOnPaymentFailureUseCase`, `SimulatePaymentUseCase`
- [ ] Executar testes de integração: webhook handler com payload Stripe mockado
- [ ] Executar teste de regressão: fluxo compra → pagamento → ticket ativo
- [ ] Executar checklist manual de homologação (4 cenários abaixo)
- [ ] Executar lint, typecheck e validações arquiteturais
- [ ] Validar fluxo real com `PAYMENT_MODE=stripe` em ambiente de preview (Stripe modo teste)

### Comandos finais
```bash
npm run test:unit
npm run test:integration
npm run test:regression
npm run lint
npm run lint:architecture
npm run build
```

### Rollout
- **Estratégia de deploy:** Deploy incremental — ativar primeiro com `PAYMENT_MODE=demo`, validar fluxo completo de simulação, depois configurar `PAYMENT_MODE=stripe` com env vars do Stripe em modo teste.
- **Uso de feature flag:** `PAYMENT_MODE` env var controla o gateway ativo (`demo` | `stripe`).
- **Plano de monitoramento pós-release:** Observar logs de webhook no Cloudflare Workers para eventos Stripe processados; monitorar transições de status de pedido no banco.
- **Métricas a observar:** Taxa de sucesso de webhook `checkout.session.completed`; pedidos transitando de `pending` para `paid`; tickets sendo ativados.
- **Alertas esperados:** Falha de assinatura HMAC (pode indicar misconfiguration de `STRIPE_WEBHOOK_SECRET`); pedidos travados em `pending` após 15 minutos.

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** Fora de pico, com ambiente de preview validado primeiro
- **Tempo de monitoramento:** 30 minutos após ativação de `PAYMENT_MODE=stripe`

---

## 12. Checkpoints do Agent OS

Use estes checkpoints para sprints executadas por agentes.

- [ ] Checkpoint 1 — Discovery validado: fluxo de pedido mapeado, contrato `PaymentProvider` rascunhado
- [ ] Checkpoint 2 — Estratégia de testes aprovada: todos os casos de teste definidos e matriz revisada
- [ ] Checkpoint 3 — RED tests concluídos: testes falham por ausência de implementação
- [ ] Checkpoint 4 — GREEN alcançado: todos os testes passando com implementação mínima
- [ ] Checkpoint 5 — Refatoração concluída: limites de camada verificados, Stripe isolado em `src/server/payment/`
- [ ] Checkpoint 6 — Validação final concluída: homologação manual + deploy incremental validado

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
| Comprador conclui checkout Stripe → retorna a `/checkout/success` | Tickets aparecem como ativos em "Meus Ingressos" | Print de "Meus Ingressos" com ingresso ativo | ⬜ |
| Pagamento falha → retorna a `/checkout/cancel` | Pedido cancelado; estoque revertido no lot | Log de status do pedido + quantidade do lot | ⬜ |
| Botão "Simular Pagamento" visível apenas com `PAYMENT_MODE=demo` | Botão ausente em modo `stripe`; presente em modo `demo` | Screenshot de ambos os modos | ⬜ |
| Webhook com assinatura inválida enviado para `POST /api/webhooks/stripe` | HTTP 400 retornado; nenhuma transição de status disparada | Log do worker + status do pedido inalterado | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Falhas de webhook em produção impedindo transição de `pending → paid`
- Regressão no fluxo `createOrder` introduzida inadvertidamente
- Stripe SDK vazando para domain/application (detectado por `lint:architecture`)
- Pedidos ficando presos em `pending` após pagamento confirmado no Stripe
- Comportamento divergente entre modo demo e modo stripe

### Passos
1. Reverter env var `PAYMENT_MODE` para `demo` ou remover `STRIPE_SECRET_KEY` do ambiente
2. Reverter deploy para versão anterior via Cloudflare Workers rollback
3. Executar smoke tests após reversão (`/api/events`, `/api/orders`)
4. Comunicar incidente e registrar causa provável
5. Abrir task de pós-mortem se necessário

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 15 minutos (reverter env var `PAYMENT_MODE` é suficiente para desativar integração Stripe sem redeploy)

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos foram cobertos por testes (unit + integration + regression)
- [ ] Os testes foram escritos antes da implementação (TDD)
- [ ] A implementação atende ao comportamento esperado: checkout → pagamento → ticket ativo
- [ ] Não houve regressão no fluxo `createOrder`
- [ ] Stripe SDK não importado fora de `src/server/payment/`
- [ ] Validação de assinatura HMAC obrigatória no webhook — sem bypass
- [ ] `SimulatePaymentUseCase` bloqueado server-side quando `PAYMENT_MODE !== demo`
- [ ] Checklist manual de homologação executado (4 cenários)
- [ ] Rollback definido e testado (reversão por env var em até 15 minutos)
- [ ] Documentação e changelog atualizados

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Escopo acordado entregue: `PaymentProvider`, use-cases de pagamento, webhook handler, fallback demo, páginas de retorno do checkout
- [ ] Critérios de aceite atendidos
- [ ] Testes relevantes passando: unit, integration, regression
- [ ] Integração Stripe validada em ambiente de preview (modo teste)
- [ ] Sem violação arquitetural crítica: Stripe isolado, use-cases portáveis
- [ ] Sem blocker aberto
- [ ] `PHASE-014-payment-gateway.md` e changelog atualizados

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
