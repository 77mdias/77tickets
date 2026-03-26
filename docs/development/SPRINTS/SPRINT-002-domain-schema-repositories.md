## Sprint 002 — Core Domain + Schema + Repositories

### Objetivo

Modelar o núcleo de domínio de ticketing (eventos, lotes, pedidos, tickets, cupons e papéis), criar schema de banco com Drizzle e contratos de repositório para uso pelos casos de uso.

---

## Contexto

* Problema atual: inexistência de modelo de domínio e persistência alinhados às regras do AGENTS.md.
* Impacto no sistema/produto: sem domínio consistente, as regras críticas (estoque, validade, status) ficam dispersas e frágeis.
* Riscos envolvidos: schema incompleto, acoplamento ao ORM dentro da aplicação, inconsistência de regras de negócio.
* Áreas afetadas: `src/server/domain/*`, `src/server/repositories/*`, `src/server/infrastructure/db/*`, `drizzle/*`.

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

* [ ] Cenário 1: lote fora da janela de venda é considerado indisponível.
* [ ] Cenário 2: transição inválida de status do pedido é rejeitada pelo domínio.
* [ ] Cenário 3: cupom expirado ou sem saldo de uso não é aplicável.

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes antes da implementação
* Garantir que os testes falhem pelo motivo correto inicialmente
* Validar cobertura dos fluxos críticos
* Garantir que regras de negócio estejam representadas nos testes

### Testes a implementar primeiro

* [ ] Teste unitário: invariantes de domínio para `OrderStatus`, `LotSaleWindow`, `TicketValidity` e `CouponPolicy`.
* [ ] Teste de integração: repositórios Drizzle persistem e recuperam agregados com campos esperados.
* [ ] Teste de regressão: prevenir oversell em cenário de estoque limite.
* [ ] Teste de autorização/autenticação: leitura de eventos por organizador limitada ao owner.
* [ ] Teste de edge case: datas de início/fim de venda invertidas devem falhar na validação.

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

* Estratégia de deploy: aplicar migrations em ambiente controlado e publicar incrementos de domínio/repositório em pequenos PRs.
* Uso de feature flag: opcional para leituras públicas enquanto dados iniciais são validados.
* Plano de monitoramento pós-release: monitorar erros de migration e queries principais de eventos/lotes.

### Responsáveis

* Backend: equipe core
* Frontend: suporte eventual
* QA: equipe core
* Produto: product owner

### Janela de deploy

* Horário recomendado: janela de menor tráfego.
* Tempo de monitoramento: 90 minutos após deploy.

---

## Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Domínio central modelado | Entidades/regras disponíveis e cobertas por testes unitários | Test report + revisão de código | ⬜ |
| Repositórios isolados | Use-cases dependem de contrato e não de Drizzle direto | Testes + revisão arquitetural | ⬜ |
| Migrations consistentes | Schema em banco reflete intenção de domínio | Histórico de migration + validação local | ⬜ |

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
