---

# Template de Sprint — TDD First

## Sprint [ID] — [Nome curto]

### Objetivo

Descreva de forma direta o que esta sprint entrega ou corrige.

---

## Contexto

* Problema atual:
* Impacto no sistema/produto:
* Riscos envolvidos:
* Áreas afetadas:

---

## Etapa 1 — Discovery Técnico

* Analisar fluxo atual relacionado à mudança
* Identificar regras de negócio afetadas
* Mapear endpoints, entidades, serviços e integrações impactadas
* Identificar riscos técnicos e dependências
* Levantar cenários de falha e edge cases

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

* Definir comportamento esperado da funcionalidade
* Definir critérios de aceite testáveis
* Definir estratégia de testes antes da implementação
* Listar cenários de sucesso, falha e regressão
* Definir quais testes serão criados primeiro:

  * testes unitários
  * testes de integração
  * testes end-to-end, se aplicável

### Casos de teste planejados

* [ ] Cenário 1:
* [ ] Cenário 2:
* [ ] Cenário 3:

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes antes da implementação
* Garantir que os testes falhem pelo motivo correto inicialmente
* Validar cobertura dos fluxos críticos
* Garantir que regras de negócio estejam representadas nos testes

### Testes a implementar primeiro

* [ ] Teste unitário:
* [ ] Teste de integração:
* [ ] Teste de regressão:
* [ ] Teste de autorização/autenticação:
* [ ] Teste de edge case:

---

## Etapa 4 — Implementação

* Implementar o mínimo necessário para fazer os testes passarem
* Aplicar validação obrigatória no backend
* Ajustar frontend apenas se necessário para suportar o novo comportamento
* Atualizar banco/schema se necessário
* Garantir integridade de dados e segurança

### Regras obrigatórias

* Não confiar em input do client
* Toda regra crítica deve estar protegida no backend
* Nenhuma implementação sem teste correspondente
* Toda correção relevante deve vir acompanhada de teste de regressão

---

## Etapa 5 — Refatoração

* Melhorar legibilidade e manutenção do código
* Remover duplicações
* Refinar nomes, contratos e responsabilidades
* Garantir que todos os testes continuem verdes após refatoração

---

## Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais

* Executar suíte unitária relevante
* Executar testes de integração relevantes
* Executar testes end-to-end críticos, se aplicável
* Executar checklist manual de homologação

### Rollout

* Estratégia de deploy:
* Uso de feature flag:
* Plano de monitoramento pós-release:

### Responsáveis

* Backend:
* Frontend:
* QA:
* Produto:

### Janela de deploy

* Horário recomendado:
* Tempo de monitoramento:

---

## Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
|         |                    |           | ⬜      |
|         |                    |           | ⬜      |
|         |                    |           | ⬜      |

---

## Plano de Rollback

### Gatilhos

* Falhas relevantes em produção
* Regressão em fluxo crítico
* Quebra de integração
* Aumento anormal de erros
* Comportamento divergente do esperado apesar de testes verdes

### Passos

1. Suspender ou limitar a liberação da mudança
2. Reverter para a versão estável anterior
3. Executar smoke tests após reversão
4. Comunicar incidente e registrar causa provável

### Responsáveis

* Execução técnica:
* Revalidação:
* Comunicação:

### RTO

* Até [X] minutos

---

## Critérios de Aceite

* [ ] Todos os cenários críticos foram cobertos por testes
* [ ] Os testes foram escritos antes da implementação
* [ ] A implementação atende ao comportamento esperado
* [ ] Não houve regressão nos fluxos principais
* [ ] Regras críticas estão protegidas no backend
* [ ] Checklist manual executado
* [ ] Rollback definido para produção

---

# Instrução padrão para colocar no AGENTS.md

```text
When generating new sprints for this application, always follow the official Sprint Template.

This application is TDD-first.

Mandatory rules:
- tests come before implementation
- every feature, fix, or refactor must define expected behavior first
- every implementation must have corresponding automated tests
- regression fixes must include regression tests
- backend validation and data integrity must be prioritized
- do not generate implementation-only sprints
- every sprint must include test strategy, test-first tasks, implementation, refactor, QA, and rollback

Always keep the sprint specific to the current codebase and architecture.
Do not generate generic sprint content.
Follow the sprint template exactly.
```

---
