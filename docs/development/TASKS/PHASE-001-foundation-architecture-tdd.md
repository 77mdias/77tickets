# 🚀 Tasks - Fase 001: Foundation Architecture + TDD Tooling

**Status:** 🟢 CONCLUÍDA
**Última atualização:** 2026-03-26
**Sprint Atual:** Sprint 001
**Status Geral:** 🟢 100% (9/9 tarefas completas) - FASE CONCLUÍDA
**ETA:** 1 sprint (5 a 7 dias úteis)
**Pré-requisito:** Nenhum (fase inicial)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Arquitetura Base | 3 | 3 | 0 | 0 | 0 |
| Qualidade e TDD | 3 | 3 | 0 | 0 | 0 |
| Infra e Dados Base | 3 | 3 | 0 | 0 | 0 |
| **TOTAL** | **9** | **9** | **0** | **0** | **0** |

### 🎯 Principais Indicadores (opcional)
- ✅ Estrutura inicial da documentação já pronta.
- ✅ Sprint técnica inicial definida com TDD obrigatório.
- ✅ Stack de testes automatizados configurada com Vitest.

---

## 🎯 Objetivos da Fase

- Criar a estrutura em camadas `server/api/application/domain/repositories/infrastructure`.
- Definir contratos iniciais para reduzir acoplamento com framework.
- Implantar base de TDD com testes unitários e integração desde o início.
- Configurar validação server-side com Zod nas fronteiras de entrada.
- Inicializar infraestrutura de dados com Drizzle orientada a PostgreSQL.
- Definir guardrails arquiteturais para impedir violações de camada.
- Documentar comandos e fluxo operacional para execução contínua.

---

## 📦 Estrutura de Categorias

### 📦 Arquitetura Base - Estrutura e fronteiras de camadas

#### Objetivo
Estabelecer os diretórios, contratos e convenções mínimas para garantir separação de responsabilidades desde o primeiro commit funcional. Esta categoria reduz risco de acoplamento acidental e prepara terreno para migração futura para NestJS.

#### ARC.1 - Estrutura de código e contratos iniciais

- [x] **ARC-001** - Criar estrutura base de camadas do backend

  **Descrição curta:**
  - Estruturar `src/server` com módulos por responsabilidade.
  - Garantir que cada camada tenha propósito claro e sem sobreposição.

  **Implementação sugerida:**
  - Criar diretórios `src/server/{api,application,domain,repositories,infrastructure}`.
  - Adicionar arquivos placeholder com comentários curtos de responsabilidade.
  - Definir barrel exports mínimos onde fizer sentido.

  **Arquivos/áreas afetadas:** `src/server/*`, `src/server/README.md`

  **Critérios de aceitação:**
  - [x] Estrutura criada e refletindo o fluxo `UI -> handler -> use-case -> repository -> database`.
  - [x] Nenhum arquivo de UI contendo regra de negócio.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** nenhuma  
  **Status:** 🟢 Concluída  
  **Notas adicionais (opcional):**
  - `AIDEV-ARCH-001`

- [x] **ARC-002** - Definir contratos e tipos base da aplicação

  **Descrição curta:**
  - Criar contratos para repositórios e tipos de erro de aplicação.
  - Preparar base para use-cases independentes de framework.

  **Implementação sugerida:**
  - Criar `*.contracts.ts` para interfaces de repositório.
  - Definir erros tipados (`validation`, `not-found`, `conflict`, `internal`).
  - Criar helpers de mapeamento de erro para handler.

  **Arquivos/áreas afetadas:** `src/server/repositories/*.contracts.ts`, `src/server/application/errors/*`, `src/server/api/error-mapper.ts`

  **Critérios de aceitação:**
  - [x] Contratos não dependem de Drizzle/Vinext.
  - [x] Erros tipados podem ser serializados em resposta estável.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** ARC-001  
  **Status:** 🟢 Concluída  
  **Notas adicionais (opcional):**
  - `AIDEV-ARCH-002`

- [x] **ARC-003** - Criar convenção de schemas de entrada com Zod

  **Descrição curta:**
  - Padronizar criação e parse de payload na camada de handler.
  - Evitar validação espalhada em UI ou camadas internas.

  **Implementação sugerida:**
  - Criar pasta de schemas em `src/server/api/schemas`.
  - Adotar padrão `*.schema.ts` por endpoint/use-case.
  - Implementar utilitário de parse seguro com erro padronizado.

  **Arquivos/áreas afetadas:** `src/server/api/schemas/*`, `src/server/api/validation/*`

  **Critérios de aceitação:**
  - [x] Payload inválido retorna erro de validação estruturado.
  - [x] Use-cases recebem input já tipado/validado.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** ARC-001, ARC-002  
  **Status:** 🟢 Concluída
  **Notas adicionais (opcional):**
  - `AIDEV-ARCH-003`

### 📦 Qualidade e TDD - Testes antes de implementação

#### Objetivo
Implantar disciplina TDD operacional (Red/Green/Refactor) com comandos reproduzíveis em ambiente local e CI. Esta categoria assegura evidência de comportamento antes de qualquer incremento de produção.

#### QLT.1 - Setup de testes e primeiros cenários

- [x] **TDD-001** - Configurar runner de testes e scripts no projeto

  **Descrição curta:**
  - Definir stack de testes unitários/integrados (Vitest recomendado).
  - Padronizar comandos no `package.json`.

  **Implementação sugerida:**
  - Adicionar dependências de teste (`vitest`, `@vitest/coverage-v8`, etc.).
  - Criar `vitest.config.ts` com ambientes separados.
  - Criar scripts `test`, `test:unit`, `test:integration`, `test:watch`.

  **Arquivos/áreas afetadas:** `package.json`, `vitest.config.ts`, `tsconfig.json`

  **Critérios de aceitação:**
  - [x] `npm run test` executa sem erro de configuração.
  - [x] Suites unit e integration separadas por padrão claro.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** ARC-001  
  **Status:** 🟢 Concluída  
  **Notas adicionais (opcional):**
  - `AIDEV-TDD-001`

- [x] **TDD-002** - Escrever primeiros testes falhando para contratos/schemas

  **Descrição curta:**
  - Criar teste RED para validação de schema e isolamento de contratos.
  - Garantir falha inicial pelo motivo correto.

  **Implementação sugerida:**
  - Criar testes para payload inválido e erro esperado.
  - Criar teste para contrato de repositório desacoplado de ORM.
  - Rodar e registrar evidência da falha inicial.

  **Arquivos/áreas afetadas:** `tests/unit/api/*.test.ts`, `tests/unit/application/*.test.ts`

  **Critérios de aceitação:**
  - [x] Testes iniciam em RED com justificativa correta.
  - [x] Evidência da transição RED -> GREEN documentada no PR.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** ARC-002, ARC-003, TDD-001  
  **Status:** 🟢 Concluída
  **Notas adicionais (opcional):**
  - `docs/development/Logs/TDD-002.md`

- [x] **TDD-003** - Criar guardrails de fronteira arquitetural

  **Descrição curta:**
  - Evitar importações indevidas entre camadas por regra automatizada.
  - Reduzir regressão arquitetural em longo prazo.

  **Implementação sugerida:**
  - Definir regras de lint/import (ex.: `no-restricted-imports`).
  - Incluir validação em pipeline local/CI.
  - Adicionar testes/checagens de arquitetura em scripts de qualidade.

  **Arquivos/áreas afetadas:** `eslint.config.mjs`, `package.json`, `docs/development/README.md`

  **Critérios de aceitação:**
  - [x] Import indevido falha no lint.
  - [x] Regras documentadas para o time.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h  
  **Dependências:** ARC-001, TDD-001  
  **Status:** 🟢 Concluída
  **Notas adicionais (opcional):**
  - `docs/development/Logs/TDD-003.md`

### 📦 Infra e Dados Base - Drizzle e ambiente de dados inicial

#### Objetivo
Preparar configuração de persistência e ambiente para testes de integração orientados a PostgreSQL, respeitando a diretriz de evolução para Neon e futuro backend NestJS.

#### INF.1 - Bootstrap de dados e comandos operacionais

- [x] **INF-001** - Inicializar Drizzle para PostgreSQL

  **Descrição curta:**
  - Configurar Drizzle com foco em Neon/PostgreSQL.
  - Criar estrutura mínima de schema e migrations.

  **Implementação sugerida:**
  - Adicionar dependências Drizzle e driver Postgres.
  - Criar `drizzle.config.ts` + pasta `drizzle/`.
  - Criar primeira migration baseline.

  **Arquivos/áreas afetadas:** `drizzle.config.ts`, `drizzle/*`, `src/server/infrastructure/db/*`

  **Critérios de aceitação:**
  - [x] Migration baseline gerada com sucesso.
  - [x] Conexão configurável por env sem hardcode.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** ARC-001
  **Status:** 🟢 Concluída

- [x] **INF-002** - Definir estratégia de dados para testes de integração

  **Descrição curta:**
  - Garantir isolamento e repetibilidade em testes integrados.
  - Definir setup/teardown de dados.

  **Implementação sugerida:**
  - Criar helper de seed por suite.
  - Implementar limpeza entre testes.
  - Documentar banco de teste e variáveis necessárias.

  **Arquivos/áreas afetadas:** `tests/integration/setup/*`, `tests/fixtures/*`, `.env.example`

  **Critérios de aceitação:**
  - [x] Testes de integração rodam de forma determinística.
  - [x] Ambiente de teste não polui dados de desenvolvimento.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** INF-001, TDD-001
  **Status:** 🟢 Concluída
  **Notas adicionais:**
  - `docs/development/Logs/INF-002.md`

- [x] **INF-003** - Consolidar checklist operacional de fase 001

  **Descrição curta:**
  - Fechar sprint com documentação e comandos claros.
  - Reduzir ambiguidade para início da fase 002.

  **Implementação sugerida:**
  - Atualizar roadmap/status da fase.
  - Atualizar changelog com entregas reais.
  - Registrar decisão de stack de teste e dados.

  **Arquivos/áreas afetadas:** `docs/development/ROADMAP.md`, `docs/development/CHANGELOG.md`, `docs/development/TASKS.md`

  **Critérios de aceitação:**
  - [x] Todos os comandos essenciais documentados.
  - [x] Fase pronta para transição para domínio.

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h30
  **Dependências:** ARC-001..ARC-003, TDD-001..TDD-003, INF-001..INF-002
  **Status:** 🟢 Concluída

---

## 🧪 Testes e Validações

- **Suites necessárias:** Vitest (unit), Vitest integration, smoke manual.
- **Cobertura alvo:** >80% dos módulos criados na fase.
- **Comandos de verificação:** `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run test`.
- **Estado atual:** ✅ Suite unit passando. Integration requer `TEST_DATABASE_URL` (ver `docs/development/Logs/INF-002.md`).

---

## 📚 Documentação e Comunicação

- Atualizar `docs/development/TASKS.md` com status da fase.
- Atualizar `docs/development/CHANGELOG.md` com progresso em `[Unreleased]`.
- Se houver schema/migration, registrar decisões em `docs/database/` (quando criado).
- Comunicar riscos de arquitetura no checkpoint de sprint.

---

## ✅ Checklist de Encerramento da Fase

- [x] Todas as tarefas da fase marcadas como concluídas.
- [x] Base de testes instalada e validada em CI/local.
- [x] Estrutura de camadas criada e guardrails ativos.
- [x] Documentação atualizada (`TASKS.md`, `CHANGELOG.md`, roadmap).
- [x] Aprovação técnica para iniciar fase 002.
