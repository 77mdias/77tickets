---
title: Sprint 015 — Email Transacional + Entrega de Ticket
type: sprint
mode: sprint
approach: tdd-first
status: planned
---

# Sprint 015 — Email Transacional + Entrega de Ticket

## 1. Objetivo

Entregar fluxo completo de notificação pós-compra: comprador recebe email de confirmação de pedido com QR codes inline após pagamento confirmado, e lembrete automático 24 horas antes do evento via cron. Contrato `EmailProvider` na camada de infraestrutura garante portabilidade zero-coupling com Resend ou qualquer outro provedor.

---

## 2. Resumo Executivo

- **Tipo da sprint:** feature
- **Modo principal do Agent OS:** backend
- **Fase relacionada:** Fase 015 — Email Transacional + Ticket Delivery
- **Status:** 🟢 Planejada
- **Prioridade:** 🟡 Alta
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 014 ✅ (pagamento confirmado necessário para disparar email de ingresso)
- **Janela estimada:** 1 semana

---

## 3. Contexto

- **Problema atual:** Após pagamento confirmado, comprador só visualiza ticket dentro da plataforma. Sem email de confirmação, a experiência de compra parece incompleta e não profissional. Tickets QR codes precisam ser acessíveis offline (no email, não só no app). Organizer não pode comunicar mudanças de evento sem canal de notificação.
- **Impacto no sistema/produto:** Fluxo pós-compra completo; retenção e confiança do comprador aumentam com entrega imediata dos ingressos por email.
- **Riscos envolvidos:** Acoplamento direto do SDK Resend no domain/application quebraria portabilidade para Next.js/NestJS. Falha de envio de email não deve bloquear o fluxo de confirmação de pagamento.
- **Áreas afetadas:** `src/server/email/`, `src/server/application/use-cases/`, `src/app/api/cron/`, `src/server/api/`
- **Fluxos de usuário impactados:** Fluxo de compra pós-pagamento; lembrete de evento próximo para compradores com pedidos pagos.
- **Premissas importantes:** Sprint 014 (pagamento) está concluída e `ConfirmOrderPaymentUseCase` já realiza a transição de status para `paid`. Resend está disponível como provedor inicial.
- **Fora de escopo nesta sprint:** SMS, push notification, emails de marketing, unsubscribe management, bounce handling.

---

## 4. Critérios de Sucesso

- [ ] Email de confirmação disparado após `ConfirmOrderPaymentUseCase` com QR codes inline (base64) de cada ticket
- [ ] Email de lembrete 24h antes do `event.startsAt` via cron endpoint `POST /api/cron/event-reminders`
- [ ] Contrato `EmailProvider` em `src/server/email/` — zero acoplamento Resend no domain/application
- [ ] Templates HTML responsivos testados em mobile (375px) e desktop
- [ ] Retry com exponential backoff em caso de falha de envio (máximo 3 tentativas)
- [ ] Testes: unit (use-cases com EmailProvider mockado), integration (handler → provider mockado), regression (não envia para pedidos cancelados/expirados)

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [x] Sprint 014 concluída com `ConfirmOrderPaymentUseCase` funcional e transição de status `paid` validada
- [ ] Contrato `EmailProvider` definido antes de qualquer use-case de email
- [ ] `RESEND_API_KEY` e `EMAIL_FROM` configurados no ambiente antes do deploy
- [ ] Cron endpoint registrado no `wrangler.toml` como Cloudflare Scheduled Event

### Ordem macro recomendada
1. Discovery: mapear fluxo de `ConfirmOrderPaymentUseCase` e pontos de extensão
2. Design de comportamento: definir contrato `EmailProvider` e casos de teste
3. RED tests: escrever testes unitários falhando para `SendOrderConfirmationEmailUseCase`
4. Implementação mínima: `EmailProvider` + `ResendEmailProvider` + use-cases
5. Refatoração: templates HTML, retry logic, cron endpoint
6. Validação e rollout: smoke em staging, configuração de cron no wrangler.toml

### Paralelização possível
- EMAIL-005 (`SendEventReminderEmailUseCase`) pode rodar em paralelo com EMAIL-004 após EMAIL-001 definido
- EMAIL-007 (template de lembrete) pode rodar em paralelo com EMAIL-006 (template de confirmação)
- EMAIL-008 (cron endpoint) pode rodar em paralelo com EMAIL-004 após EMAIL-001 definido

### Caminho crítico
- EMAIL-001 (contrato `EmailProvider`)
- EMAIL-002 (`ResendEmailProvider` com retry)
- EMAIL-004 (`SendOrderConfirmationEmailUseCase`)
- EMAIL-006 (template HTML de confirmação)
- EMAIL-009 (testes unitários do use-case de confirmação)

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear o fluxo atual de `ConfirmOrderPaymentUseCase`, identificar o ponto de extensão para envio de email e confirmar que nenhum acoplamento de infraestrutura existe no domain/application.

### Checklist
- [ ] Analisar `ConfirmOrderPaymentUseCase` e identificar onde o email deve ser disparado (após transição para `paid`)
- [ ] Verificar se existe algum mecanismo de event/hook disponível ou se o use-case chama diretamente
- [ ] Mapear repositórios usados em pedidos e tickets para entender como buscar tickets por `orderId`
- [ ] Identificar como QR codes são gerados atualmente (se há utilitário existente ou se precisa criar)
- [ ] Confirmar padrão arquitetural em `src/server/payment/` para replicar em `src/server/email/`
- [ ] Confirmar restrições de arquitetura: `EmailProvider` deve ser framework-agnostic
- [ ] Levantar edge cases: pedido com múltiplos tickets, evento cancelado após compra, falha de rede no Resend

### Saída esperada
- Ponto de extensão para email confirmado (chamada direta do use-case ou hook pós-transação)
- Estrutura de pastas `src/server/email/` definida (contrato + adapter + templates)
- Estratégia de geração de QR code base64 confirmada
- Riscos técnicos de acoplamento mapeados

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Transformar os requisitos de notificação por email em comportamentos verificáveis e definir a estratégia de testes antes de qualquer implementação.

### Checklist
- [ ] Definir interface `EmailProvider` com métodos `sendOrderConfirmation` e `sendEventReminder`
- [ ] Definir shape de dados passados para cada método (order, tickets, event)
- [ ] Definir critérios de aceite testáveis para `SendOrderConfirmationEmailUseCase`
- [ ] Definir critérios de aceite testáveis para `SendEventReminderEmailUseCase`
- [ ] Listar cenários de sucesso, falha e regressão para cada use-case
- [ ] Confirmar que verificação `order.status === 'paid'` ocorre antes do envio (regra de negócio crítica no backend)
- [ ] Confirmar que cron endpoint é protegido por `CRON_SECRET` header

### Casos de teste planejados
- [ ] Cenário 1: `SendOrderConfirmationEmailUseCase` chama `EmailProvider.sendOrderConfirmation` com dados corretos após order `paid`
- [ ] Cenário 2: Email NÃO é enviado quando `order.status !== 'paid'` (cancelado, expirado, pendente)
- [ ] Cenário 3: Cron endpoint com `event.startsAt` em exatamente 24h dispara `SendEventReminderEmailUseCase` para todos os compradores com `paid` orders
- [ ] Cenário 4: Cron endpoint sem eventos elegíveis retorna 200 sem erro e sem envios
- [ ] Edge case 1: Falha no Resend (HTTP 500) não quebra fluxo de pagamento (fire-and-forget com retry)
- [ ] Regressão 1: Email de confirmação inclui QR codes de TODOS os tickets do pedido, não apenas o primeiro

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | `SendOrderConfirmationEmailUseCase`, `SendEventReminderEmailUseCase` | Sim | EmailProvider mockado |
| Integração | Handler de confirmação de pagamento → use-case → provider mockado | Sim | Valida disparo após transição paid |
| E2E | Fluxo pós-compra completo com email real | Não | Coberto em homologação manual |
| Regressão | Email não enviado para orders não-paid | Sim | Regra de negócio crítica |
| Auth/AuthZ | Cron endpoint protegido por CRON_SECRET | Sim | Requests sem secret retornam 401 |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED que representem corretamente o comportamento esperado de cada use-case de email antes de qualquer implementação de produção.

### Checklist
- [ ] Escrever testes unitários para `SendOrderConfirmationEmailUseCase` antes de criar o arquivo de implementação
- [ ] Escrever testes de regressão para validar que `order.status !== 'paid'` bloqueia envio
- [ ] Garantir que testes falhem pelo motivo correto: `EmailProvider` inexistente ou use-case sem lógica de guard
- [ ] Validar cobertura do fluxo crítico: order paid → email disparado com todos os tickets
- [ ] Escrever teste de integração para handler de confirmação de pagamento disparando email
- [ ] Garantir que falha do `EmailProvider` (mock que lança) não propaga para o caller

### Testes a implementar primeiro
- [ ] Teste unitário: `SendOrderConfirmationEmailUseCase` chama provider com payload correto quando order.status === 'paid'
- [ ] Teste unitário: `SendOrderConfirmationEmailUseCase` lança AppError ou ignora silenciosamente quando order.status !== 'paid'
- [ ] Teste de integração: `POST /api/orders/:id/confirm-payment` — após transição paid, `EmailProvider.sendOrderConfirmation` é chamado
- [ ] Teste de regressão: order com status `cancelled` não dispara email mesmo se use-case for chamado
- [ ] Teste de edge case: `SendOrderConfirmationEmailUseCase` inclui QR code de todos os N tickets do pedido
- [ ] Teste de contrato/API: `POST /api/cron/event-reminders` retorna 401 sem `CRON_SECRET` header válido

### Evidência RED
- **Comando executado:** `npm run test:unit -- --testPathPattern=send-order-confirmation-email`
- **Falha esperada observada:** `Cannot find module 'src/server/application/use-cases/send-order-confirmation-email.use-case'`
- **Observações:** Testes devem falhar por ausência de implementação, não por erro de sintaxe no teste

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para fazer os testes passarem, respeitando a separação entre contrato (`EmailProvider`) e implementação (`ResendEmailProvider`), e mantendo use-cases framework-agnostic.

### Checklist
- [ ] Criar `src/server/email/email.provider.ts` com interface `EmailProvider`
- [ ] Criar `src/server/email/resend.email-provider.ts` implementando `EmailProvider` com retry (3 tentativas, exponential backoff)
- [ ] Criar `src/server/application/use-cases/send-order-confirmation-email.use-case.ts`
- [ ] Criar `src/server/application/use-cases/send-event-reminder-email.use-case.ts`
- [ ] Criar templates HTML em `src/server/email/templates/`
- [ ] Criar cron endpoint `src/app/api/cron/event-reminders/route.ts` protegido por `CRON_SECRET`
- [ ] Integrar `SendOrderConfirmationEmailUseCase` ao fluxo de `ConfirmOrderPaymentUseCase`
- [ ] Configurar `RESEND_API_KEY` e `EMAIL_FROM` no `.env.example` e wrangler.toml

### Regras obrigatórias
- `EmailProvider` não deve ter dependência de Vinext, Cloudflare Workers ou Next.js
- Resend SDK fica exclusivamente em `src/server/email/resend.email-provider.ts`
- `SendOrderConfirmationEmailUseCase` verifica `order.status === 'paid'` antes de disparar
- Falha no Resend não quebra o fluxo de pagamento (fire-and-forget com retry assíncrono)
- QR code gerado como data URL base64 inline no template HTML (não depende de URL externa)

### Mudanças previstas
- **Backend:** `src/server/email/` (novo módulo), `src/server/application/use-cases/` (2 novos use-cases), integração em `ConfirmOrderPaymentUseCase`
- **API:** `src/app/api/cron/event-reminders/route.ts` (novo endpoint)
- **Frontend:** `src/server/email/templates/` (templates HTML — sem dependência de framework de UI)
- **Banco/Schema:** Nenhuma migration necessária; usa tabelas `orders`, `tickets`, `events` existentes
- **Infra/Config:** `RESEND_API_KEY`, `EMAIL_FROM` em env vars; entrada de cron no `wrangler.toml`
- **Docs:** Atualizar `docs/development/TASKS/PHASE-015-email-notifications.md` com evidências

---

## 10. Etapa 5 — Refatoração

### Objetivo
Após testes verdes, melhorar legibilidade e coesão dos templates HTML, lógica de retry e responsabilidades dos use-cases sem alterar comportamento validado.

### Checklist
- [ ] Extrair lógica de geração de QR base64 para utilitário dedicado se usada em múltiplos lugares
- [ ] Garantir que templates HTML usam helper de formatação de data/hora consistente com o restante do projeto
- [ ] Validar que `ResendEmailProvider` encapsula toda lógica de retry sem expor detalhes ao use-case
- [ ] Remover qualquer duplicação entre templates de confirmação e lembrete
- [ ] Garantir que todos os testes continuem verdes após refatoração
- [ ] Verificar que `EmailProvider` e use-cases não têm imports de `@cloudflare/workers-types` ou `next/`

### Saída esperada
- Módulo `src/server/email/` coeso e portável
- Use-cases legíveis sem detalhes de infraestrutura
- Templates HTML com responsabilidade única por tipo de email

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar `npm run test:unit` — todos os testes de use-cases de email passando
- [ ] Executar `npm run test:integration` — handler de confirmação de pagamento dispara email
- [ ] Executar checklist manual de homologação: comprar ingresso em staging e validar recebimento do email
- [ ] Executar `npm run lint:architecture` — sem violação de boundaries
- [ ] Executar `npm run build` — build limpo sem erros de TypeScript
- [ ] Validar rendering do email em mobile (375px) e desktop via Resend preview ou cliente de email

### Comandos finais
```bash
npm run test:unit
npm run test:integration
npm run lint:architecture
npm run build
```

### Rollout
- **Estratégia de deploy:** Deploy normal para Cloudflare Workers com `RESEND_API_KEY` configurado via wrangler secret. Cron registrado em `wrangler.toml` como Scheduled Event.
- **Uso de feature flag:** Não necessário; `EmailProvider` ausente (env var não configurada) resulta em no-op silencioso no adapter.
- **Plano de monitoramento pós-release:** Verificar Resend dashboard para taxa de entrega e bounces nas primeiras 24h após deploy.
- **Métricas a observar:** Taxa de entrega de emails de confirmação, ausência de erros 5xx no cron endpoint, latência de envio (alvo < 30s após pagamento confirmado).
- **Alertas esperados:** Resend API key inválida resulta em log de erro sem quebrar fluxo de pagamento.

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias (templates HTML)
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** Fora do horário de pico (antes das 9h ou após as 22h)
- **Tempo de monitoramento:** 30 minutos após deploy

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: fluxo de `ConfirmOrderPaymentUseCase` mapeado, ponto de extensão de email confirmado
- [ ] Checkpoint 2 — Estratégia de testes aprovada: interface `EmailProvider` definida, casos de teste listados
- [ ] Checkpoint 3 — RED tests concluídos: testes unitários e de integração falhando pelo motivo correto
- [ ] Checkpoint 4 — GREEN alcançado: `EmailProvider`, `ResendEmailProvider`, use-cases e cron endpoint implementados com testes passando
- [ ] Checkpoint 5 — Refatoração concluída: templates HTML refinados, retry encapsulado, sem importações de framework nos use-cases
- [ ] Checkpoint 6 — Validação final concluída: homologação manual em staging, build limpo, smoke de email recebido

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
| Comprador completa pagamento em staging | Email de confirmação recebido em até 30s com QR codes de todos os tickets | Screenshot do email recebido | ⬜ |
| Email de confirmação aberto em mobile (375px) | Layout responsivo sem overflow; QR codes visíveis e legíveis | Screenshot em dispositivo móvel | ⬜ |
| Evento com `startsAt` em 24h — cron trigger manual | Email reminder enviado para todos compradores com paid orders desse evento | Log do cron endpoint + email recebido | ⬜ |
| Pedido cancelado — `SendOrderConfirmationEmailUseCase` chamado | Email NÃO enviado; use-case retorna sem erro | Log da aplicação sem chamada ao provider | ⬜ |
| `RESEND_API_KEY` inválida — comprador finaliza compra | Pagamento confirmado normalmente; erro de email logado sem propagar 500 | Log de erro no Resend adapter; order status = paid | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Taxa de erro no cron endpoint acima de 5% nas primeiras 24h
- Email de confirmação não entregue para mais de 10% dos pedidos pagos
- Falha no Resend propagando erro 500 para o fluxo de pagamento
- Build quebrado após introdução do módulo de email
- Comportamento divergente do esperado apesar de testes verdes

### Passos
1. Desabilitar `RESEND_API_KEY` via `wrangler secret delete RESEND_API_KEY` — emails param sem quebrar pagamento
2. Reverter para versão estável anterior via revert de commit no `main`
3. Executar `npm run test:unit && npm run test:integration` após reversão
4. Comunicar incidente via canal interno e registrar causa provável
5. Abrir task de pós-mortem em `docs/development/TASKS/` se necessário

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 15 minutos (desabilitar `RESEND_API_KEY` é suficiente para isolar o problema sem reverter deploy)

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos foram cobertos por testes (unit, integration, regression)
- [ ] Os testes foram escritos antes da implementação (TDD)
- [ ] A implementação atende ao comportamento esperado: email com QR codes após pagamento confirmado
- [ ] Não houve regressão nos fluxos de pagamento e visualização de tickets
- [ ] Regra crítica `order.status === 'paid'` protegida no backend antes de disparar email
- [ ] Checklist de homologação manual executado em staging
- [ ] Rollback definido (desabilitar `RESEND_API_KEY`) documentado e testado
- [ ] Documentação mínima atualizada: `PHASE-015-email-notifications.md` com evidências de conclusão
- [ ] `EmailProvider` portável: sem imports de Vinext, Cloudflare Workers ou Next.js nos use-cases

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Fluxo de email de confirmação com QR codes entregue e funcionando em staging
- [ ] Fluxo de lembrete 24h via cron entregue e funcionando em staging
- [ ] Critérios de aceite atendidos
- [ ] `npm run test:unit`, `npm run test:integration`, `npm run build` passando
- [ ] Sem violação arquitetural crítica (EmailProvider portável, Resend isolado no adapter)
- [ ] Sem blocker aberto
- [ ] `PHASE-015-email-notifications.md` atualizado com evidências de conclusão

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
