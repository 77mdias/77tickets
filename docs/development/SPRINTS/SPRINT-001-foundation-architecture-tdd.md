## Sprint 001 — Foundation Architecture + TDD Tooling

### Objetivo

Estabelecer a fundação técnica da aplicação TicketFlow: estrutura em camadas, stack base de backend (Drizzle + Zod), infraestrutura mínima de testes e fluxo TDD obrigatório para as próximas sprints.

---

## Contexto

* Problema atual: projeto ainda está em estado inicial (bootstrap) sem camadas de domínio/aplicação/repositório implementadas.
* Impacto no sistema/produto: sem essa fundação, as próximas features tendem a acoplar regra de negócio ao framework e gerar retrabalho de migração.
* Riscos envolvidos: dívida arquitetural cedo, ausência de cobertura de testes, inconsistência entre handlers e domínio.
* Áreas afetadas: `src/server/*`, `src/lib/*`, `drizzle/`, scripts do `package.json`, configuração de testes.

---

## Etapa 1 — Discovery Técnico

* Analisar estrutura atual do projeto (Vinext + app inicial) e lacunas para arquitetura proposta no AGENTS.md
* Identificar regras de negócio afetadas (fluxos ainda não implementados, mas com diretrizes obrigatórias)
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

* [ ] Cenário 1: validação de schema Zod rejeita payload inválido na fronteira do handler.
* [ ] Cenário 2: use-case não importa APIs de framework/web (isolamento de camada).
* [ ] Cenário 3: contrato de repositório é consumido por use-case sem acesso direto ao ORM.

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes antes da implementação
* Garantir que os testes falhem pelo motivo correto inicialmente
* Validar cobertura dos fluxos críticos
* Garantir que regras de negócio estejam representadas nos testes

### Testes a implementar primeiro

* [ ] Teste unitário: contratos de domínio/aplicação e validações de DTO com Zod.
* [ ] Teste de integração: adapter de handler chamando use-case com input validado.
* [ ] Teste de regressão: impedir acesso direto a dados sensíveis vindos do client em fluxo de pedido (teste de guarda arquitetural).
* [ ] Teste de autorização/autenticação: esqueleto de política por papel (`customer`, `organizer`, `admin`, `checker`).
* [ ] Teste de edge case: payload parcialmente válido com campos extras/suspeitos deve falhar na validação.

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

* Estratégia de deploy: sem release funcional; sprint de fundação com merge incremental em branch principal após testes verdes.
* Uso de feature flag: não aplicável para esta sprint técnica.
* Plano de monitoramento pós-release: monitorar pipeline CI (lint + unit + integration) e falhas de build.

### Responsáveis

* Backend: equipe core
* Frontend: equipe core
* QA: equipe core
* Produto: product owner

### Janela de deploy

* Horário recomendado: horário comercial com equipe disponível.
* Tempo de monitoramento: 60 minutos após merge.

---

## Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Estrutura em camadas criada | Diretórios `src/server/{api,application,domain,repositories,infrastructure}` disponíveis | PR + árvore de arquivos | ⬜ |
| Testes TDD base configurados | Comandos de teste executam e cobrem unit/integration iniciais | Logs CI/local | ⬜ |
| Guardrails de validação ativos | Payload inválido falha com erro estruturado | Resultado de teste | ⬜ |

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

* Execução técnica: líder técnico
* Revalidação: QA
* Comunicação: product owner

### RTO

* Até 30 minutos

---

## Critérios de Aceite

* [ ] Todos os cenários críticos foram cobertos por testes
* [ ] Os testes foram escritos antes da implementação
* [ ] A implementação atende ao comportamento esperado
* [ ] Não houve regressão nos fluxos principais
* [ ] Regras críticas estão protegidas no backend
* [ ] Checklist manual executado
* [ ] Rollback definido para produção
