# 🚀 Tasks - Fase 010: Migration Readiness

**Status:** 🔵 PLANEJADA
**Última atualização:** 2026-03-29
**Sprint Atual:** Sprint 010
**Status Geral:** 🔵 0% (0/8 tarefas completas)
**ETA:** 1 sprint
**Pré-requisito:** Fase 008 (admin dashboard completo)

> Esta fase corresponde à **Fase 6 (Migration Readiness)** do ROADMAP.md original.
> Pode ser executada em paralelo com a Fase 009 (Hardening) após a Fase 008.

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Auditoria de Acoplamentos | 4 | 0 | 0 | 4 | 0 |
| Prova de Portabilidade | 2 | 0 | 0 | 2 | 0 |
| Documentação de Migração | 2 | 0 | 0 | 2 | 0 |
| **TOTAL** | **8** | **0** | **0** | **8** | **0** |

### 🎯 Principais Indicadores
- ⚠️ Risco médio (ROADMAP): retrabalho na migração se acoplamentos ao Vinext/Workers forem introduzidos sem auditoria.
- 🎯 Meta: domain e application layers devem ser portáveis para NestJS sem modificação.
- 🎯 Meta: repositórios portáveis com apenas troca de adapter de infraestrutura.

---

## 🎯 Objetivos da Fase

- Mapear todos os acoplamentos ao Vinext e Cloudflare Workers nas camadas de negócio.
- Provar portabilidade das camadas `domain` e `application` de forma prática.
- Definir plano técnico incremental de migração para Next.js + NestJS.
- Validar que os guardrails ESLint cobrem novos acoplamentos detectados.

---

## 📦 Estrutura de Categorias

### 📦 Auditoria de Acoplamentos — Mapear dependências de runtime

#### Objetivo
Identificar onde o código de negócio está acoplado ao Vinext ou Workers, catalogar e classificar o esforço de desacoplamento.

- [ ] **MIG-001** - Auditar dependências de Vinext em `src/server/*`

  **Descrição curta:**
  - Varrer todas as importações em `src/server/` procurando APIs específicas do Vinext.
  - Catalogar: quais arquivos importam do Vinext, qual API é usada e qual camada está sendo afetada.

  **Implementação sugerida:**
  - `grep -r "vinext\|from 'next'" src/server/` e analisar resultados
  - Criar inventário: arquivo → API Vinext usada → camada → risco de migração
  - Classificar: vermelho (camada domain/application), amarelo (api/handler), verde (infrastructure)

  **Arquivos/áreas afetadas:** Todo `src/server/`

  **Critérios de aceitação:**
  - [ ] Inventário completo de acoplamentos ao Vinext.
  - [ ] Classificação por severidade de impacto na migração.
  - [ ] Nenhum acoplamento vermelho nas camadas domain/application.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** —
  **Status:** ⏳ Pendente

- [ ] **MIG-002** - Auditar dependências de Cloudflare Workers em camadas de negócio

  **Descrição curta:**
  - Verificar se APIs específicas de Workers (KV, Durable Objects, env bindings) estão em camadas que não devem tê-las.
  - Identificar qualquer uso de APIs Node.js incompatíveis com Workers no código de negócio.

  **Implementação sugerida:**
  - Verificar importações de `@cloudflare/*` e APIs globais de Workers
  - Focar nas camadas `domain`, `application` e `repositories`
  - Documentar achados no mesmo inventário do MIG-001

  **Arquivos/áreas afetadas:** `src/server/domain/`, `src/server/application/`, `src/server/repositories/`

  **Critérios de aceitação:**
  - [ ] Camadas domain/application sem APIs de Workers.
  - [ ] APIs de Workers isoladas apenas em `infrastructure/`.
  - [ ] Inventário atualizado com achados de Workers.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** MIG-001
  **Status:** ⏳ Pendente

- [ ] **MIG-003** - Mapear módulos `domain` e `application` como portáveis

  **Descrição curta:**
  - Para cada arquivo em `src/server/domain/` e `src/server/application/use-cases/`, confirmar ausência de importações de framework.
  - Gerar lista formal de módulos confirmados portáveis.

  **Implementação sugerida:**
  - Listar importações de cada arquivo nas camadas domain/application
  - Confirmar que apenas `zod`, TypeScript built-ins e imports internos estão presentes
  - Documentar: lista de módulos portáveis + any exceptions

  **Arquivos/áreas afetadas:** `src/server/domain/`, `src/server/application/`

  **Critérios de aceitação:**
  - [ ] Lista de módulos confirmados portáveis documentada.
  - [ ] Nenhuma importação de framework em domain/application.
  - [ ] Exceções (se houver) documentadas com plano de resolução.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** MIG-001, MIG-002
  **Status:** ⏳ Pendente

- [ ] **MIG-004** - Mapear repositórios como portáveis com troca de adapter

  **Descrição curta:**
  - Confirmar que os contratos de repositório (`*.repository.contracts.ts`) são framework-agnostic.
  - Documentar que apenas as implementações Drizzle precisam de adaptação.
  - Identificar se há acoplamento ao cliente Neon específico que exigirá adaptação.

  **Implementação sugerida:**
  - Revisar contratos: verificar que usam apenas tipos TypeScript e tipos de domínio
  - Revisar implementações: identificar o que é Drizzle-specific vs. genérico
  - Documentar: interface do contrato é portável, implementação precisa de adapter NestJS

  **Arquivos/áreas afetadas:** `src/server/repositories/`

  **Critérios de aceitação:**
  - [ ] Contratos de repositório confirmados como portáveis.
  - [ ] Mapa de esforço de adaptação para NestJS documentado.
  - [ ] Nenhum contrato com dependência de framework.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** MIG-002
  **Status:** ⏳ Pendente

---

### 📦 Prova de Portabilidade — Validar empiricamente

- [ ] **MIG-005** - Definir contratos de interface para NestJS (module boundaries)

  **Descrição curta:**
  - Projetar como os módulos `domain`, `application` e `repositories` seriam estruturados em NestJS.
  - Definir: quais seriam os NestJS modules, providers e injeções de dependência.
  - Não implementar — apenas documentar o mapeamento.

  **Implementação sugerida:**
  - `docs/development/MIGRATION-PLAN.md` — seção: Mapeamento de Módulos NestJS
  - Para cada use-case: identificar o NestJS service correspondente
  - Para cada repository: identificar o NestJS provider correspondente

  **Arquivos/áreas afetadas:** `docs/development/MIGRATION-PLAN.md`

  **Critérios de aceitação:**
  - [ ] Mapeamento completo domain/application/repositories → NestJS documentado.
  - [ ] Sem ambiguidades sobre como os contratos seriam injetados.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** MIG-003, MIG-004
  **Status:** ⏳ Pendente

- [ ] **MIG-007** - Prova prática: mover `domain` + `application` para package isolado

  **Descrição curta:**
  - Criar branch de prova de conceito onde `domain` e `application` são extraídos para um package separado (sem bundling real, apenas validação de que os imports se resolvem).
  - Confirmar que nenhum arquivo fora do escopo é necessário para compilar os dois módulos.

  **Implementação sugerida:**
  - Branch ou workspace isolado com apenas `src/server/domain/` e `src/server/application/`
  - `tsc --noEmit` sem os outros módulos
  - Documentar resultado: passou ou lista de dependências inesperadas encontradas

  **Arquivos/áreas afetadas:** Branch separada / workspace isolado

  **Critérios de aceitação:**
  - [ ] domain + application compilam isoladamente sem erros.
  - [ ] Resultado documentado em `MIGRATION-PLAN.md`.
  - [ ] Branch de prova descartada após validação.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** MIG-003
  **Status:** ⏳ Pendente

---

### 📦 Documentação de Migração — Plano técnico e guardrails

- [ ] **MIG-006** - Criar `MIGRATION-PLAN.md` com etapas incrementais

  **Descrição curta:**
  - Documento técnico com plano de migração incremental para Next.js + NestJS.
  - Estrutura: visão geral → etapas → marcos de compatibilidade → ordem de execução → riscos.

  **Implementação sugerida:**
  - `docs/development/MIGRATION-PLAN.md`
  - Seções:
    1. Objetivo da migração
    2. O que migra sem modificação (domain, application, repository contracts)
    3. O que precisa de adaptação (handlers → NestJS controllers, route adapters → Guards/Pipes)
    4. O que é substituído (Vinext → Next.js, auth middleware → NestJS Guards)
    5. Ordem de etapas recomendada
    6. Marcos de compatibilidade (checkpoints de validação)
    7. Riscos e mitigações

  **Arquivos/áreas afetadas:** `docs/development/`

  **Critérios de aceitação:**
  - [ ] Plano cobre todas as camadas.
  - [ ] Etapas incrementais (não big-bang).
  - [ ] Marcos verificáveis definidos.
  - [ ] Riscos mapeados com mitigação.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** MIG-003, MIG-004, MIG-005
  **Status:** ⏳ Pendente

- [ ] **MIG-008** - Validar e expandir ESLint guardrails para novos acoplamentos

  **Descrição curta:**
  - Revisar as regras ESLint de fronteira arquitetural e expandir para cobrir acoplamentos detectados na auditoria.
  - Garantir que novos acoplamentos ao Vinext em camadas protegidas sejam bloqueados automaticamente.

  **Implementação sugerida:**
  - Revisar `eslint.config.mjs`
  - Adicionar regras para bloquear importações de `next/*`, `vinext/*` em `domain` e `application`
  - Rodar `npm run lint:architecture` e confirmar que violações são detectadas

  **Arquivos/áreas afetadas:** `eslint.config.mjs`, `tests/unit/architecture/`

  **Critérios de aceitação:**
  - [ ] Guardrails bloqueiam importações de Vinext/Next.js em domain/application.
  - [ ] Teste arquitetural de ESLint cobre os novos guardrails.
  - [ ] `lint:architecture` passa sem violações.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** MIG-001, MIG-002
  **Status:** ⏳ Pendente

---

## ✅ Critérios de Encerramento da Fase

- [ ] Inventário de acoplamentos ao Vinext e Workers documentado.
- [ ] domain e application layers confirmados portáveis (prova prática).
- [ ] `MIGRATION-PLAN.md` criado com plano incremental.
- [ ] Guardrails ESLint expandidos para cobrir acoplamentos detectados.
- [ ] `npm run lint:architecture` sem violações.
- [ ] GOV doc de encerramento criado.
- [ ] CHANGELOG atualizado.
