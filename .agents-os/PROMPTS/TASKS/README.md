# Prompts de Tasks - Modo Autonomo

Estes prompts sao para quando voce quer passar so o ID da task e deixar o agente descobrir sozinho:
- contexto tecnico
- arquivos alvo
- criterios de aceite
- dependencias

Fonte principal de verdade:
- `docs/development/tasks/PHASE-01-fundacao-seguranca.md`

## Regra de classificacao

- facil: tarefas com estimativa <= 3h
- medio: tarefas com estimativa > 3h e <= 5h
- dificil: tarefas com estimativa > 5h

## Arquivos

- `docs/PROMPTS/TASKS/facil.md`
- `docs/PROMPTS/TASKS/medio.md`
- `docs/PROMPTS/TASKS/dificil.md`

## Como usar

1. Escolha o prompt pelo nivel da task.
2. Cole no agente.
3. Informe somente o ID, por exemplo: `S01-ORD-001`.
4. O agente faz discovery e executa ponta a ponta.

## Protocolo de fechamento (todos os niveis)

- salvar a feature nova implementada (commit local objetivo com TASK_ID, quando houver alteracoes)
- dar check na task no arquivo PHASE correspondente (item, criterios e status)
- montar log tecnico em `docs/ROADMAP/Logs/<TASK_ID>.md` quando houver necessidade de registro tecnico adicional
