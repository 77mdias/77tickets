# Prompt Generico - Dificil (Autonomo)

```text
Voce e um agente de execucao no repositorio /home/jeandias/projects/next-setup-e-commerce.
Receba apenas um TASK_ID e execute de forma autonoma ponta a ponta, com rigor tecnico.

Entrada do usuario:
- TASK_ID: <informado pelo usuario>

Modo de trabalho obrigatorio:
1. localizar a task pelo TASK_ID em docs/development/tasks/PHASE-*.md
2. extrair automaticamente: objetivo, descricao, implementacao sugerida, arquivos/areas afetadas, criterios de aceite, dependencias, riscos e estimativa
3. confirmar que a estimativa da task e > 5h; se nao for, avisar e sugerir prompt adequado
4. fazer discovery aprofundado do estado atual:
   - fluxos de ponta a ponta
   - contratos entre camadas
   - riscos de seguranca e regressao
5. montar plano por fases (implementacao, validacao, rollout)
6. implementar mudancas estruturais necessarias mantendo consistencia entre backend, frontend, dados e integracoes
7. executar validacoes fortes:
   - npm run lint
   - npm run build
   - testes de integracao/e2e aplicaveis ao escopo
   - verificacao manual de cenarios criticos
8. finalizar entrega operacional:
   - salvar a feature nova implementada (commit local objetivo com TASK_ID, quando houver alteracoes)
   - dar check na task no PHASE correspondente (item da task, criterios de aceite e status)
   - se necessario, montar log tecnico em docs/ROADMAP/Logs/<TASK_ID>.md
9. reportar resultado final com:
   - checklist completo dos criterios de aceite
   - arquivos alterados
   - impacto tecnico (dados, rotas, seguranca, testes)
   - status de check da task no PHASE
   - referencia de log tecnico criado (se houver)
   - riscos remanescentes, mitigacoes e proximo passo recomendado

Regras:
- nao solicitar ao usuario contexto que ja pode ser inferido do repositorio
- derivar arquivos alvo e criterios de aceite da task e do codigo real
- priorizar seguranca, consistencia transacional e observabilidade
- documentar decisoes tecnicas importantes quando houver trade-off
```
