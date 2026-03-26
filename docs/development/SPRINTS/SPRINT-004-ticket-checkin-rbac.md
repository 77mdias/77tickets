## Sprint 004 — Ticket Validation + Check-in + RBAC

### Objetivo

Implementar validação de ticket e fluxo de check-in seguro com prevenção de reutilização, além de autorização por papel (`customer`, `organizer`, `admin`, `checker`) para operações críticas.

---

## Contexto

* Problema atual: mesmo com pedido criado, não existe ciclo operacional completo para validação de ingresso no evento.
* Impacto no sistema/produto: sem check-in seguro e RBAC, há risco de fraude e violação de acesso.
* Riscos envolvidos: ticket reutilizado, validação fora de contexto de evento, permissões excessivas.
* Áreas afetadas: `src/server/application/validate-checkin.use-case.ts`, handlers de check-in/admin, políticas de autorização.

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

* [ ] Cenário 1: ticket válido é marcado como usado uma única vez no evento correto.
* [ ] Cenário 2: ticket já usado ou cancelado é rejeitado com erro de conflito.
* [ ] Cenário 3: checker sem autorização no evento não pode realizar check-in.

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes antes da implementação
* Garantir que os testes falhem pelo motivo correto inicialmente
* Validar cobertura dos fluxos críticos
* Garantir que regras de negócio estejam representadas nos testes

### Testes a implementar primeiro

* [ ] Teste unitário: `validateTicketCheckin` impede reutilização e valida contexto do evento.
* [ ] Teste de integração: update atômico de status de ticket durante check-in.
* [ ] Teste de regressão: ticket de pedido expirado não pode ser aceito.
* [ ] Teste de autorização/autenticação: regras RBAC por papel e ownership de evento.
* [ ] Teste de edge case: tentativas simultâneas de check-in no mesmo ticket resultam em apenas uma confirmação válida.

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

* Estratégia de deploy: liberar check-in para grupo reduzido de eventos antes de expansão total.
* Uso de feature flag: recomendado para habilitação progressiva por evento.
* Plano de monitoramento pós-release: taxa de falha por validação, tentativas duplicadas, erro de autorização por papel.

### Responsáveis

* Backend: equipe core
* Frontend: equipe operações/check-in
* QA: equipe core
* Produto: product owner

### Janela de deploy

* Horário recomendado: antes de eventos piloto e fora de horários de pico.
* Tempo de monitoramento: 120 minutos após deploy.

---

## Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Check-in único | Mesmo ticket não pode ser usado duas vezes | Teste concorrente + validação manual | ⬜ |
| Contexto de evento | Ticket só é válido no evento correto | Teste automatizado de contexto | ⬜ |
| RBAC ativo | Cada papel só executa ações permitidas | Teste de autorização | ⬜ |

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
