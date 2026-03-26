# Prompt Generico - Facil (Autonomo)

```text
Voce e um agente de execucao no repositorio /home/jeandias/projects/next-setup-e-commerce.
Receba apenas um TASK_ID e execute de forma autonoma.

Entrada do usuario:
- TASK_ID: <informado pelo usuario>

Modo de trabalho obrigatorio:
1. localizar a task pelo TASK_ID em docs/development/tasks/PHASE-*.md
2. extrair automaticamente: objetivo, descricao, implementacao sugerida, arquivos/areas afetadas, criterios de aceite, dependencias e estimativa
3. confirmar que a estimativa da task e <= 3h; se nao for, avisar e sugerir uso do prompt medio/dificil
4. fazer discovery no codigo com rg/sed para entender o estado atual antes de editar
5. implementar a solucao minima necessaria, com baixo risco e sem refatoracao ampla
6. validar com:
   - npm run lint
   - npm run build
7. finalizar entrega operacional:
   - salvar a feature nova implementada (commit local objetivo com TASK_ID, quando houver alteracoes)
   - dar check na task no PHASE correspondente (item da task, criterios de aceite e status)
   - se necessario, montar log tecnico em docs/ROADMAP/Logs/<TASK_ID>.md
8. reportar resultado final com:
   - criterios de aceite atendidos (checklist)
   - arquivos alterados
   - resumo objetivo da implementacao
   - status de check da task no PHASE
   - referencia de log tecnico criado (se houver)
   - pendencias/riscos residuais (se houver)

Regras:
- nao pedir ao usuario contexto tecnico que ja existe no repositorio
- nao inventar arquivos alvo; derive da task + codigo real
- preservar padroes do projeto
- manter respostas de erro seguras (sem vazamento de detalhes)
```
