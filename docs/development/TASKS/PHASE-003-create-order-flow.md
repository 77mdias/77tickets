# 🚀 Tasks - Fase 003: Create Order Flow (Server-First)

**Status:** 🟡 EM ANDAMENTO
**Última atualização:** 2026-03-27
**Sprint Atual:** Sprint 003
**Status Geral:** 🟡 18% (2/11 tarefas completas) - EM ANDAMENTO
**ETA:** 1 sprint (7 a 10 dias úteis)
**Pré-requisito:** Fase 002 (concluída)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Use-case e Regras de Compra | 4 | 2 | 0 | 0 | 2 |
| API e Persistência Transacional | 4 | 0 | 0 | 0 | 4 |
| Checkout UI, QA e Observabilidade | 3 | 0 | 0 | 0 | 3 |
| **TOTAL** | **11** | **2** | **0** | **0** | **9** |

### 🎯 Principais Indicadores (opcional)
- ✅ Fluxo-alvo definido no AGENTS (`createOrder` server-side).
- ⚠️ Dependência de domínio/repositórios da fase 002.
- ⚠️ Alto risco de regressão sem testes de concorrência e expiração.

---

## 🎯 Objetivos da Fase

- Implementar `createOrder` como use-case central da compra.
- Garantir cálculo de total exclusivamente no servidor.
- Aplicar validação de estoque/janela de lote e limite por pedido.
- Integrar aplicação de cupom com regras de elegibilidade.
- Persistir pedido, itens e tickets de forma transacional.
- Expor handler/API com validação Zod e mapeamento de erros.
- Conectar fluxo mínimo de checkout no frontend sem regra de negócio.
- Cobrir fluxo com TDD (unit, integration, regressão e autorização).

---

## 📦 Estrutura de Categorias

### 📦 Use-case e Regras de Compra - Orquestração de negócio

#### Objetivo
Concentrar toda regra crítica de compra na camada de aplicação/domínio, com testes dirigindo comportamento. Esta categoria é o núcleo do MVP funcional da plataforma.

#### ORD.1 - Comportamento e implementação de `createOrder`

- [x] **ORD-001** - Definir contrato de entrada/saída do use-case

  **Descrição curta:**
  - Definir DTOs/schemas para criação de pedido.
  - Formalizar dados de resposta para API/UI.

  **Implementação sugerida:**
  - Criar `create-order.schema.ts`.
  - Definir tipos explícitos de comando e resultado.
  - Validar compatibilidade com contratos de repositório.

  **Arquivos/áreas afetadas:** `src/server/api/schemas/create-order.schema.ts`, `src/server/application/orders/order.types.ts`

  **Critérios de aceitação:**
  - [x] Payload inválido é rejeitado antes do use-case.
  - [x] Contrato inclui campos mínimos para geração de tickets.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 2h  
  **Dependências:** Fase 002  
  **Status:** ✅ Concluído

- [x] **ORD-002** - Escrever testes RED do fluxo principal de compra

  **Descrição curta:**
  - Cobrir cenários de sucesso e falha antes da implementação.
  - Provar restrições críticas de preço e estoque.

  **Implementação sugerida:**
  - Teste para cálculo server-side ignorando preço do client.
  - Teste para falta de estoque e lote fora da janela.
  - Teste para cupom válido/inválido e retorno esperado.

  **Arquivos/áreas afetadas:** `tests/unit/application/create-order.use-case.test.ts`

  **Critérios de aceitação:**
  - [x] Testes iniciam em RED pelos motivos corretos.
  - [x] Cenários críticos mapeados no AGENTS estão cobertos.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** ORD-001  
  **Status:** ✅ Concluído

- [ ] **ORD-003** - Implementar `createOrder` mínimo para GREEN

  **Descrição curta:**
  - Implementar orquestração do pedido com regras server-side.
  - Garantir ordem de validação antes de persistir.

  **Implementação sugerida:**
  - Carregar evento/lotes com repositório.
  - Validar disponibilidade, limites e cupom.
  - Calcular total e montar aggregate de pedido.

  **Arquivos/áreas afetadas:** `src/server/application/create-order.use-case.ts`, `src/server/application/orders/*`

  **Critérios de aceitação:**
  - [ ] Testes unitários de `createOrder` passam.
  - [ ] Nenhuma regra crítica no handler ou UI.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 6h  
  **Dependências:** ORD-002  
  **Status:** 🟡 Pendente

- [ ] **ORD-004** - Cobrir regressões de pedido expirado e estado inválido

  **Descrição curta:**
  - Garantir que estado do pedido/ticket respeite políticas.
  - Evitar geração de tickets ativos em pedidos inválidos.

  **Implementação sugerida:**
  - Criar testes de regressão para expiração e transições inválidas.
  - Ajustar use-case e domínio para manter consistência.
  - Registrar caso de regressão no changelog técnico.

  **Arquivos/áreas afetadas:** `tests/regression/orders/*.test.ts`, `src/server/domain/orders/*`

  **Critérios de aceitação:**
  - [ ] Pedido expirado não mantém ticket ativo.
  - [ ] Regressões ficam no gate padrão de testes.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** ORD-003  
  **Status:** ⛔ Bloqueado

### 📦 API e Persistência Transacional - Handler fino e consistência de dados

#### Objetivo
Expor o fluxo de compra com handler fino, validação na fronteira e persistência transacional confiável para pedidos, itens e tickets.

#### API.1 - Endpoint de checkout e transação

- [ ] **API-001** - Implementar handler de criação de pedido com Zod

  **Descrição curta:**
  - Criar endpoint/route adapter para checkout.
  - Garantir parse de payload e mapeamento de erros estáveis.

  **Implementação sugerida:**
  - Implementar handler chamando `createOrder`.
  - Resolver usuário autenticado no boundary.
  - Mapear erros para categorias padronizadas.

  **Arquivos/áreas afetadas:** `src/server/api/orders/create-order.handler.ts`, `src/server/api/error-mapper.ts`

  **Critérios de aceitação:**
  - [ ] Handler sem regra de negócio.
  - [ ] Erros não expõem detalhes internos de DB.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** ORD-003  
  **Status:** ⛔ Bloqueado

- [ ] **API-002** - Implementar persistência transacional de pedido/itens/tickets

  **Descrição curta:**
  - Garantir atomicidade do fluxo de compra.
  - Evitar gravação parcial em caso de falha.

  **⚠️ Constraint herdada de DBR-003:** O driver atual (`drizzle-orm/neon-http`) não suporta `db.transaction()`. `DrizzleOrderRepository.create` usa inserts sequenciais sem atomicidade DB-level. Esta task deve resolver isso antes de ir para produção. Ver decisão completa em `docs/development/Logs/DBR-003.md`.

  **Implementação sugerida:**
  - Avaliar migração do client para `drizzle-orm/neon-serverless` (driver WebSocket, suporta `db.transaction()`). A mudança é cirúrgica: apenas `src/server/infrastructure/db/client.ts` e o tipo `Db`.
  - Alternativamente: implementar compensação explícita no use-case (cleanup de órfão em falha parcial).
  - Persistir na ordem lógica `order → items → tickets` dentro de uma transação.
  - Tratar rollback automático em erro.

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/client.ts`, `src/server/repositories/drizzle/drizzle-order.repository.ts`, `src/server/repositories/drizzle/drizzle-ticket.repository.ts`

  **Critérios de aceitação:**
  - [ ] Sem dados órfãos em falha parcial.
  - [ ] Fluxo de compra é idempotente quando aplicável.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 5h
  **Dependências:** ORD-003, Fase 002 DBR-003
  **Status:** ⛔ Bloqueado

- [ ] **API-003** - Testes de integração do endpoint de compra

  **Descrição curta:**
  - Validar cenário ponta a ponta da API.
  - Cobrir erro de estoque, cupom e payload inválido.

  **Implementação sugerida:**
  - Criar suíte integration para endpoint de checkout.
  - Preparar fixtures de evento/lote/cupom.
  - Validar shape de resposta e status code.

  **Arquivos/áreas afetadas:** `tests/integration/api/orders/*.test.ts`, `tests/fixtures/orders/*`

  **Critérios de aceitação:**
  - [ ] Cenários críticos passam com dados de teste isolados.
  - [ ] Cenários negativos retornam erro estruturado.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** API-001, API-002  
  **Status:** ⛔ Bloqueado

- [ ] **API-004** - Teste de autorização para criação de pedido

  **Descrição curta:**
  - Garantir que `customer` só cria pedido para si.
  - Bloquear role claims sem verificação server-side.

  **Implementação sugerida:**
  - Criar testes com identidades divergentes.
  - Validar comportamento para roles não autorizados.
  - Ajustar policy/handler conforme falhas.

  **Arquivos/áreas afetadas:** `tests/integration/api/orders/auth.test.ts`, `src/server/application/security/*`

  **Critérios de aceitação:**
  - [ ] Pedido em nome de terceiro é bloqueado.
  - [ ] Logs de tentativa indevida disponíveis para auditoria.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h30  
  **Dependências:** API-001  
  **Status:** ⛔ Bloqueado

### 📦 Checkout UI, QA e Observabilidade - Conexão mínima e validação final

#### Objetivo
Conectar o fluxo backend ao frontend de forma enxuta, sem mover regra de negócio para a interface, e validar qualidade com monitoramento básico e checklist de homologação.

#### UX.1 - Integração mínima com o app

- [ ] **UX-001** - Implementar formulário mínimo de checkout integrado ao endpoint

  **Descrição curta:**
  - Adicionar interação mínima para submissão do pedido.
  - Manter UI limitada a captura e exibição de estados.

  **Implementação sugerida:**
  - Criar componente de formulário de compra.
  - Consumir endpoint com payload validado.
  - Exibir feedback de sucesso/erro.

  **Arquivos/áreas afetadas:** `src/features/checkout/*`, `app/*`

  **Critérios de aceitação:**
  - [ ] UI não calcula total nem valida estoque.
  - [ ] Erro backend exibido de forma compreensível.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 4h  
  **Dependências:** API-001  
  **Status:** ⛔ Bloqueado

- [ ] **UX-002** - Instrumentar logs e métricas básicas de checkout

  **Descrição curta:**
  - Acompanhar taxa de sucesso/falha do fluxo.
  - Facilitar diagnóstico pós-deploy.

  **Implementação sugerida:**
  - Adicionar logs estruturados no handler/use-case.
  - Registrar latência e categoria de erro.
  - Definir painel/consulta mínima de acompanhamento.

  **Arquivos/áreas afetadas:** `src/server/api/orders/*`, `src/server/application/create-order.use-case.ts`, `docs/infrastructure/*`

  **Critérios de aceitação:**
  - [ ] Métricas mínimas disponíveis para operação.
  - [ ] Logs não vazam dados sensíveis.

  **Prioridade:** 🟢 Média  
  **Estimativa:** 2h  
  **Dependências:** API-001..API-003  
  **Status:** ⛔ Bloqueado

- [ ] **UX-003** - Fechamento de fase com QA e documentação

  **Descrição curta:**
  - Validar checklist funcional e técnico completo.
  - Atualizar documentação de execução e status.

  **Implementação sugerida:**
  - Executar checklist manual de compra.
  - Atualizar changelog e roadmap.
  - Marcar fase no índice de tasks.

  **Arquivos/áreas afetadas:** `docs/development/TASKS.md`, `docs/development/CHANGELOG.md`, `docs/development/ROADMAP.md`

  **Critérios de aceitação:**
  - [ ] Evidências de testes e checklist anexadas.
  - [ ] Fase pronta para check-in/RBAC da fase 004.

  **Prioridade:** 🟢 Média  
  **Estimativa:** 1h30  
  **Dependências:** ORD-001..ORD-004, API-001..API-004, UX-001..UX-002  
  **Status:** ⛔ Bloqueado

---

## 🧪 Testes e Validações

- **Suites necessárias:** Unit (use-case/domínio), Integration (API + repositories), Regression (expiração/oversell), smoke manual.
- **Cobertura alvo:** >85% no módulo de ordem e >80% de handlers de checkout.
- **Comandos de verificação:** `npm run test:unit`, `npm run test:integration`, `npm run test`, `npm run lint`.
- **Estado atual:** ⚠️ Em falha (fase bloqueada por dependências anteriores).

---

## 📚 Documentação e Comunicação

- Atualizar `docs/development/TASKS.md` ao iniciar e concluir fase.
- Atualizar `docs/development/CHANGELOG.md` com entregas de compra.
- Registrar decisões de transação e consistência de dados.
- Compartilhar riscos/resolução de concorrência com o time.

---

## ✅ Checklist de Encerramento da Fase

- [ ] Fluxo `createOrder` funcional com TDD comprovado.
- [ ] Cálculo de total e estoque 100% server-side.
- [ ] Persistência transacional validada por testes.
- [ ] Autorização e regressões críticas cobertas.
- [ ] UI conectada sem conter regra de negócio.
- [ ] Documentação e evidências atualizadas.
