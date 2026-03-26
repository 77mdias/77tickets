## Sprint 005 — Organizer/Admin Operations + Event Publication

### Objetivo

Implementar operações de gestão para organizadores e administradores, com foco em publicação de eventos, governança de ownership e controle de cupons, mantendo validações críticas no backend.

---

## Contexto

* Problema atual: não existe fluxo operacional completo para gestão de eventos por organizadores/admin.
* Impacto no sistema/produto: sem essas operações, o ciclo de venda e administração do ticketing fica incompleto.
* Riscos envolvidos: publicação indevida de eventos sem configuração mínima, violação de ownership e permissões excessivas.
* Áreas afetadas: `src/server/application/publish-event.use-case.ts`, handlers admin/organizer, repositórios de evento/lote/cupom.

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

* [ ] Cenário 1: organizador publica evento próprio somente quando configuração mínima de venda está completa.
* [ ] Cenário 2: tentativa de publicação sem lotes válidos/janela de venda é rejeitada.
* [ ] Cenário 3: admin pode operar em eventos de qualquer organizador; organizer só no próprio escopo.

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes antes da implementação
* Garantir que os testes falhem pelo motivo correto inicialmente
* Validar cobertura dos fluxos críticos
* Garantir que regras de negócio estejam representadas nos testes

### Testes a implementar primeiro

* [ ] Teste unitário: `publishEvent` valida pré-condições de publicação e transições de status.
* [ ] Teste de integração: atualização de status de evento e persistência de metadados de publicação.
* [ ] Teste de regressão: evento cancelado ou sem configuração mínima não pode ser republicado.
* [ ] Teste de autorização/autenticação: RBAC por papel + ownership para endpoints de gestão.
* [ ] Teste de edge case: conflitos de atualização concorrente no mesmo evento.

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

* Estratégia de deploy: liberar operações de gestão por grupos de usuário (admin primeiro, depois organizer).
* Uso de feature flag: recomendado para endpoints de publicação e edição avançada.
* Plano de monitoramento pós-release: erros de autorização, conflitos de atualização, taxas de publicação falha.

### Responsáveis

* Backend: equipe core
* Frontend: equipe admin/organizer
* QA: equipe core
* Produto: product owner

### Janela de deploy

* Horário recomendado: janela com equipe de suporte completa.
* Tempo de monitoramento: 120 minutos após deploy.

---

## Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Regra de publicação | Evento só publica com configuração mínima válida | Teste de use-case + integração | ⬜ |
| Ownership e RBAC | Organizer limitado ao próprio evento; admin global | Teste de autorização + prova manual | ⬜ |
| Governança de status | Transições inválidas bloqueadas | Teste unitário de domínio | ⬜ |

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

* Até 20 minutos

---

## Critérios de Aceite

* [ ] Todos os cenários críticos foram cobertos por testes
* [ ] Os testes foram escritos antes da implementação
* [ ] A implementação atende ao comportamento esperado
* [ ] Não houve regressão nos fluxos principais
* [ ] Regras críticas estão protegidas no backend
* [ ] Checklist manual executado
* [ ] Rollback definido para produção
