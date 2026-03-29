# 🚀 Tasks - Fase 005: Organizer/Admin Operations + Event Publication

**Status:** 🟡 EM ANDAMENTO
**Última atualização:** 2026-03-29
**Sprint Atual:** Sprint 005
**Status Geral:** 🟡 20% (2/10 tarefas completas) - FASE ATIVA
**ETA:** 1 sprint (7 a 9 dias úteis)
**Pré-requisito:** Fase 004 (concluída)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Gestão de Evento | 4 | 2 | 0 | 0 | 2 |
| APIs de Organizer/Admin | 3 | 0 | 0 | 0 | 3 |
| Segurança, QA e Governança | 3 | 0 | 0 | 0 | 3 |
| **TOTAL** | **10** | **2** | **0** | **0** | **8** |

### 🎯 Principais Indicadores (opcional)
- ✅ Regras de publicação e ownership já descritas no AGENTS.md.
- ✅ Dependência de RBAC operacional consolidada na fase 004.
- ⚠️ Alto impacto em governança de acesso e consistência do catálogo de eventos.

### 🔎 Refinamentos pós-fase 004 (SEC-003)
- Priorizar testes de autorização `cross-organizer` logo no início da fase.
- Garantir `reason` estável em erros de autorização/conflito para auditoria operacional.
- Incluir regressões de status/cancelamento no gate padrão para evitar quebra silenciosa.

---

## 🎯 Objetivos da Fase

- Implementar publicação de eventos com pré-condições mínimas obrigatórias.
- Garantir que organizer só gerencie eventos próprios (ownership).
- Garantir que admin mantenha acesso global controlado.
- Criar fluxo de atualização de status de evento com regras explícitas.
- Implementar governança de cupom no contexto do organizador/evento.
- Expor endpoints administrativos com validação e erro estruturado.
- Entregar interface mínima para operações de organizer/admin sem regra de negócio no UI.
- Cobrir tudo com TDD e testes de autorização/regressão.

---

## 📦 Estrutura de Categorias

### 📦 Gestão de Evento - Regras de publicação e ciclo de vida

#### Objetivo
Assegurar que o ciclo de vida do evento seja governado por regras de domínio explícitas, bloqueando publicações inválidas e transições inconsistentes.

#### EVT.1 - Regras de publicação e status

- [x] **EVT-001** - Definir contrato/schemas de publicação de evento

  **Descrição curta:**
  - Modelar input para publicar evento e atualizar status.
  - Validar pré-condições mínimas no boundary.

  **Implementação sugerida:**
  - Criar `publish-event.schema.ts`.
  - Definir tipos de comando/resposta.
  - Mapear erros de validação/conflito.

  **Arquivos/áreas afetadas:** `src/server/api/schemas/publish-event.schema.ts`, `src/server/application/events/event.types.ts`

  **Critérios de aceitação:**
  - [x] Input inválido falha com erro estruturado.
  - [x] Contrato cobre campos obrigatórios de publicação.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** Fase 004
  **Status:** ✅ Concluído

- [x] **EVT-002** - Escrever testes RED para regras de publicação

  **Descrição curta:**
  - Cobrir comportamento esperado antes da implementação.
  - Garantir bloqueio de publicação indevida.

  **Implementação sugerida:**
  - Testar publicação sem lotes válidos.
  - Testar publicação sem janela de venda.
  - Testar transições inválidas de status.

  **Arquivos/áreas afetadas:** `tests/unit/application/publish-event.use-case.test.ts`

  **Critérios de aceitação:**
  - [x] Testes começam em RED pelos motivos corretos.
  - [x] Cenários críticos definidos no AGENTS cobertos.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** EVT-001
  **Status:** ✅ Concluído

- [x] **EVT-003** - Implementar `publishEvent` (GREEN)

  **Descrição curta:**
  - Implementar use-case de publicação conforme regras.
  - Garantir validação de ownership e pré-condições.

  **Implementação sugerida:**
  - Carregar evento/lotes e verificar configuração mínima.
  - Validar role e ownership.
  - Atualizar status e metadados de publicação.

  **Arquivos/áreas afetadas:** `src/server/application/publish-event.use-case.ts`, `src/server/domain/events/*`

  **Critérios de aceitação:**
  - [x] Evento sem configuração mínima não publica.
  - [x] Testes unitários passam com regras completas.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 5h
  **Dependências:** EVT-002
  **Status:** ✅ Concluído

- [ ] **EVT-004** - Cobrir regressões de status e evento cancelado

  **Descrição curta:**
  - Garantir proteção contra republicação indevida.
  - Preservar consistência de status de evento.

  **Implementação sugerida:**
  - Criar testes de regressão para evento cancelado.
  - Criar testes para transição não permitida.
  - Integrar testes ao gate principal.

  **Arquivos/áreas afetadas:** `tests/regression/events/*.test.ts`, `src/server/domain/events/*`

  **Critérios de aceitação:**
  - [ ] Regras de transição inválida protegidas.
  - [ ] Regressões reproduzíveis em caso de quebra.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h30  
  **Dependências:** EVT-003  
  **Status:** ⛔ Bloqueado

### 📦 APIs de Organizer/Admin - Operação e gestão de catálogo

#### Objetivo
Disponibilizar APIs e interface mínima para operações administrativas com handlers finos, segurança server-side e contratos estáveis.

#### ADM.1 - Endpoints e operações de gestão

- [ ] **ADM-001** - Implementar endpoints de publish/update para organizer/admin

  **Descrição curta:**
  - Criar handlers para publicação e atualização de evento.
  - Manter regras no use-case e validação na borda.

  **Implementação sugerida:**
  - Integrar schema Zod + use-cases.
  - Mapear erros por categoria.
  - Garantir resposta consistente para frontend.

  **Arquivos/áreas afetadas:** `src/server/api/events/publish-event.handler.ts`, `src/server/api/events/update-event.handler.ts`

  **Critérios de aceitação:**
  - [ ] Handler permanece fino.
  - [ ] Erros de autorização/conflito padronizados.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** EVT-003  
  **Status:** ⛔ Bloqueado

- [ ] **ADM-002** - Implementar governança de cupom por evento

  **Descrição curta:**
  - Permitir gestão de cupom no escopo do evento correto.
  - Garantir validação de ownership e regras de cupom.

  **Implementação sugerida:**
  - Criar endpoints/use-cases de criação/atualização de cupom.
  - Reusar regras de elegibilidade do domínio.
  - Adicionar testes de integração para conflitos.

  **Arquivos/áreas afetadas:** `src/server/application/coupons/*`, `src/server/api/coupons/*`, `tests/integration/api/coupons/*.test.ts`

  **Critérios de aceitação:**
  - [ ] Organizer não gerencia cupom fora do próprio evento.
  - [ ] Cupom inválido é rejeitado com erro de validação/conflito.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 5h  
  **Dependências:** EVT-003, Fase 002 DOM-004  
  **Status:** ⛔ Bloqueado

- [ ] **ADM-003** - Criar tela mínima de gestão organizer/admin

  **Descrição curta:**
  - Entregar UI funcional para operar publicação e status.
  - Manter frontend somente como camada de interação.

  **Implementação sugerida:**
  - Criar módulo `features/admin` / `features/events` para gestão.
  - Integrar endpoints de publish/update/cupom.
  - Exibir retorno de erro/sucesso com clareza.

  **Arquivos/áreas afetadas:** `src/features/admin/*`, `src/features/events/*`, `app/admin/*`

  **Critérios de aceitação:**
  - [ ] UI não contém regras de publicação/ownership.
  - [ ] Fluxo operacional completo para organizer/admin.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 5h  
  **Dependências:** ADM-001, ADM-002  
  **Status:** ⛔ Bloqueado

### 📦 Segurança, QA e Governança - RBAC final e readiness operacional

#### Objetivo
Consolidar autorização por papel/ownership para operações de gestão e encerrar a fase com evidência de estabilidade funcional e técnica.

#### GOV.1 - Segurança e encerramento da fase

- [ ] **GOV-001** - Cobrir RBAC/ownership completo em operações de gestão

  **Descrição curta:**
  - Testar permissões para `organizer` e `admin` em todos endpoints da fase.
  - Validar bloqueio de acessos indevidos.

  **Implementação sugerida:**
  - Criar testes integration de autorização por role/owner.
  - Criar cenários negativos (cross-organizer).
  - Ajustar políticas e mensagens conforme falhas.

  **Arquivos/áreas afetadas:** `tests/integration/api/events/auth*.test.ts`, `tests/integration/api/coupons/auth*.test.ts`, `src/server/application/security/*`

  **Critérios de aceitação:**
  - [ ] Organizer só opera no próprio escopo.
  - [ ] Admin com acesso global validado por testes.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** ADM-001, ADM-002  
  **Status:** ⛔ Bloqueado

- [ ] **GOV-002** - Executar QA funcional de ciclo de gestão de evento

  **Descrição curta:**
  - Homologar fluxo real de publicação e atualização.
  - Confirmar comportamento em cenários de erro.

  **Implementação sugerida:**
  - Executar checklist manual com perfis distintos.
  - Validar casos de publish permitido/bloqueado.
  - Documentar evidências para auditoria.

  **Arquivos/áreas afetadas:** `docs/development/Logs/*`, `docs/development/TASKS.md`

  **Critérios de aceitação:**
  - [ ] Checklist completo com evidência anexada.
  - [ ] Nenhum bloqueador crítico aberto.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h  
  **Dependências:** EVT-003, ADM-001..ADM-003, GOV-001  
  **Status:** ⛔ Bloqueado

- [ ] **GOV-003** - Encerrar fase com documentação e handoff

  **Descrição curta:**
  - Atualizar documentação operacional e roadmap.
  - Preparar backlog de hardening/migration readiness.

  **Implementação sugerida:**
  - Atualizar changelog e status de fases.
  - Registrar decisões de segurança/governança.
  - Formalizar próximos passos da plataforma.

  **Arquivos/áreas afetadas:** `docs/development/ROADMAP.md`, `docs/development/CHANGELOG.md`, `docs/development/TASKS.md`

  **Critérios de aceitação:**
  - [ ] Documentação sincronizada com entregas reais.
  - [ ] Próximas fases definidas com riscos e prioridades.

  **Prioridade:** 🟢 Média  
  **Estimativa:** 1h30  
  **Dependências:** EVT-001..EVT-004, ADM-001..ADM-003, GOV-001..GOV-002  
  **Status:** ⛔ Bloqueado

---

## 🧪 Testes e Validações

- **Suites necessárias:** Unit (publish/policy), Integration (events/coupons/auth), Regression (status/cancelamento), smoke manual.
- **Cobertura alvo:** >80% em módulos de gestão/evento e >90% em policies de autorização.
- **Comandos de verificação:** `npm run test:unit`, `npm run test:integration`, `npm run test`, `npm run lint`.
- **Estado atual:** 🟡 Em andamento (fase iniciada; dependências internas de sequência ainda em aberto).

---

## 📚 Documentação e Comunicação

- Atualizar `docs/development/TASKS.md` ao destravar/iniciar fase.
- Atualizar `docs/development/CHANGELOG.md` por entrega concluída.
- Registrar políticas de governança em documentação interna.
- Comunicar impactos de autorização para operação e produto.

---

## ✅ Checklist de Encerramento da Fase

- [ ] Publicação de evento com pré-condições implementada.
- [ ] RBAC/ownership validado por testes automatizados.
- [ ] Endpoints de organizer/admin estáveis e documentados.
- [ ] Fluxo operacional homologado.
- [ ] Documentação atualizada e handoff concluído.
