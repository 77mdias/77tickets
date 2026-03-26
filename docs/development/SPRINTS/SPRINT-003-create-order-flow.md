## Sprint 003 — Create Order Flow (Server-First)

### Objetivo

Implementar o fluxo `createOrder` ponta a ponta com validação de disponibilidade, cálculo de total no servidor, aplicação de cupom e criação de tickets válidos de forma segura.

---

## Contexto

* Problema atual: fluxo de compra ainda não existe, impedindo validação das regras mais críticas do produto.
* Impacto no sistema/produto: sem esse fluxo, não há MVP funcional de ticketing.
* Riscos envolvidos: cálculo incorreto de preço, oversell, geração indevida de tickets e inconsistência transacional.
* Áreas afetadas: `src/server/application/create-order.use-case.ts`, handlers de checkout, repositórios de lotes/pedidos/tickets.

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

* [ ] Cenário 1: pedido válido cria order + order items + tickets com total calculado no servidor.
* [ ] Cenário 2: pedido rejeitado quando lote não possui disponibilidade suficiente.
* [ ] Cenário 3: cupom aplicável reduz valor; cupom inválido não altera cálculo e retorna erro adequado.

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes antes da implementação
* Garantir que os testes falhem pelo motivo correto inicialmente
* Validar cobertura dos fluxos críticos
* Garantir que regras de negócio estejam representadas nos testes

### Testes a implementar primeiro

* [ ] Teste unitário: `createOrder` calcula total sem usar preço vindo do client.
* [ ] Teste de integração: persistência transacional de pedido/itens/tickets.
* [ ] Teste de regressão: pedido expirado não pode manter tickets ativos.
* [ ] Teste de autorização/autenticação: usuário só cria pedido para si mesmo no papel `customer`.
* [ ] Teste de edge case: múltiplos lotes no mesmo pedido com uma falha parcial devem abortar operação.

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

* Estratégia de deploy: liberar endpoint de criação de pedido com observabilidade ativa e validação de erros estruturados.
* Uso de feature flag: recomendado para fluxo de checkout em ambientes de staging/prod inicial.
* Plano de monitoramento pós-release: taxa de erro por endpoint, latência, divergência entre total esperado e total salvo.

### Responsáveis

* Backend: equipe core
* Frontend: equipe checkout
* QA: equipe core
* Produto: product owner

### Janela de deploy

* Horário recomendado: início de janela de suporte da equipe.
* Tempo de monitoramento: 120 minutos após deploy.

---

## Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Cálculo server-side obrigatório | Alteração de preço no client não afeta valor final salvo | Teste automatizado + prova manual | ⬜ |
| Proteção de estoque | Sem oversell em disputa de quantidade | Teste de integração concorrente | ⬜ |
| Tickets corretos | Tickets criados apenas para pedidos válidos | Teste de fluxo completo | ⬜ |

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
