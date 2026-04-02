# 🚀 Tasks - Fase {{NÚMERO}}: {{NOME DA SPRINT/TASK}}

> **Como usar:** copie este arquivo para `docs/development/tasks/PHASE-{{N}}-{{SLUG}}.md` e substitua os espaços `{{ }}` com as informações da fase atual. Mantenha o formato para garantir consistência entre fases.

**Status:** {{🟢 ATIVA / ✅ CONCLUÍDA / 🔴 BLOQUEADA}}
**Última atualização:** {{AAAA-MM-DD}}
**Sprint Atual:** {{Sprint ou período}}
**Status Geral:** {{emoji}} {{% concluído}} ({{X/Y}} tarefas completas) – {{FASE ATIVA / FASE ARQUIVADA}}
**ETA:** {{duração ou intervalo}}
**Pré-requisito:** {{fase anterior}} ({{status}})

---

> **📌 NOTA (opcional):** Use este bloco quando a fase estiver arquivada ou quando houver instruções especiais (ex.: “não editar – referência histórica”).

---

## 📊 Resumo de Progresso

| Categoria             | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------------------- | ----- | --------- | ------------ | -------- | --------- |
| {{Categoria A}}       | {{}}  | {{}}      | {{}}         | {{}}     | {{}}      |
| {{Categoria B}}       | {{}}  | {{}}      | {{}}         | {{}}     | {{}}      |
| {{Categoria C}}       | {{}}  | {{}}      | {{}}         | {{}}     | {{}}      |
| **TOTAL**             | **{{}}** | **{{}}** | **{{}}**    | **{{}}** | **{{}}**  |

### 🎯 Principais Indicadores (opcional)
- ✅ Destaque 1
- ✅ Destaque 2
- ⚠️ Risco / bloqueio relevante

---

## 🎯 Objetivos da Fase

Descreva em forma de lista o que a fase deve entregar (ex.: “Completar autenticação com tokens JWT”, “Publicar MVP de fórum com posts/comentários”). Mantenha entre 5 e 8 bullets com foco em resultados, não em tarefas.

---

## 📦 Estrutura de Categorias

> Cada categoria representa um macro-bloco (ex.: “Backend Auth”, “Schema/DB”, “Frontend UI”, “Security/Infra”). Dentro delas, separe em seções menores com objetivos e tarefas.

### 📦 {{Categoria}} - {{Descrição breve}}

#### Objetivo
Explique em 2–3 frases o propósito desta categoria (por que existe e quais módulos cobre).

#### {{Sigla Categoria}}.{{n}} - {{Nome da Subfase ou Tema}}

- [ ] **{{ID}}** - {{Título da tarefa}}

  **Descrição curta:**
  - Explique o problema a resolver.
  - Liste requisitos funcionais principais.

  **Implementação sugerida:**
  - Passo 1
  - Passo 2
  - Passo 3

  **Arquivos/áreas afetadas:** `path/relativo` (adicione mais se necessário)

  **Critérios de aceitação:**
  - [ ] Critério funcional
  - [ ] Critério técnico/teste

  **Prioridade:** {{🔴 Crítica / 🟡 Alta / 🟢 Média / 🔵 Baixa}}  
  **Estimativa:** {{tempo}}  
  **Dependências:** {{IDs necessários}}  
  **Status:** {{✅ Completo / 🟡 Em andamento / 🔴 Pendente / ⛔ Bloqueado}} + notas curtas (ex.: “concluído em 11/11”, “aguardando API X”)
  **Notas adicionais (opcional):**
  - `AIDEV-*` anchors importantes
  - Links para docs relacionados (`docs/...`)

Repita o bloco acima para cada tarefa dentro da subcategoria. Para tarefas arquivadas, mantenha o checkbox marcado `[x]` e inclua notas históricas (tempo real gasto, decisões tomadas). Para tarefas futuras, mantenha `[ ]` e descreva dependências claramente.

---

## 🧪 Testes e Validações

- **Suites necessárias:** Liste Jest, E2E, Cypress, Karma, etc.
- **Cobertura alvo:** {{ex.: >80% branches}}
- **Comandos de verificação:** `make test`, `cd frontend && bun test --watch=false`, etc.
- **Estado atual:** ✅ Passando / ⚠️ Em falha (detalhar)

---

## 📚 Documentação e Comunicação

- Atualizar `docs/development/TASKS.md` → marcar fase como ativa/concluída.
- Atualizar `docs/development/CHANGELOG.md` → resumir entregas sob `[Unreleased]`.
- Se houver mudanças de schema, documentar em `docs/database/…`.
- Se impactar DevOps/deploy, atualizar `docs/infrastructure/…`.

---

## ✅ Checklist de Encerramento da Fase

- [ ] Todas as tarefas da tabela marcadas como concluídas.
- [ ] Migrations aplicadas e committed (`make prisma-migrate` + `git add backend/prisma/migrations`).
- [ ] Testes backend/frontend executados e passando (`make test`, `bun test`).
- [ ] Documentação atualizada (TASKS.md, CHANGELOG.md, notas relevantes).
- [ ] Revisão de segurança/AIDEV anchors verificada.
- [ ] Aprovação final registrada (issue, PR ou doc).

Ao finalizar, mova a fase para o estado “ARQUIVADA” (ajuste emoji/títulos) e adicione a nota histórica no topo. Para nova fase, copie este template novamente garantindo que o histórico anterior permaneça somente leitura.
