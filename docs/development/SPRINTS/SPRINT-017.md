---
title: Sprint 017 — UX Polish + Pre-Migration Gate
type: sprint
mode: mixed
approach: tdd-first
status: planned
---

# Sprint 017 — UX Polish + Pre-Migration Gate

## 1. Objetivo

Elevar a qualidade da UX da demo para nível portfolio/produção — com skeleton screens, error boundaries, toast notifications, mobile pass e QR scanner no check-in — e passar a auditoria formal de migration readiness (checklist `migration-portability.md`), aprovada via `MIGRATION-GATE.md`, que é gate bloqueante para iniciar a Sprint 018.

> **ATENÇÃO:** Sprint 018 (migração NestJS) NÃO pode ser iniciada sem `docs/development/MIGRATION-GATE.md` com checkbox `[x] Aprovado para Sprint 018` marcado.

---

## 2. Resumo Executivo

- **Tipo da sprint:** mixed (feature + gate)
- **Modo principal do Agent OS:** mixed (frontend + backend + architecture)
- **Fase relacionada:** Fase 017 — UX Polish + Pre-Migration Gate
- **Status:** 🟢 Planejada
- **Prioridade:** 🔴 Crítica (gate para migração)
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 016 ✅ | Sprint 018 bloqueada até gate aprovado
- **Janela estimada:** 1,5 semanas

---

## 3. Contexto

- **Problema atual:**
  - UX da demo tem estados de loading ausentes: listas e páginas de detalhe surgem sem transição.
  - Mensagens de erro são genéricas e expostas em inglês sem tratamento amigável.
  - Layout mobile não está otimizado — checkout, lot selector e "Meus Ingressos" apresentam overflow e touch targets pequenos em 375px.
  - Fluxo de check-in exige digitação manual do código; a câmera do dispositivo não está integrada.

- **Impacto no sistema/produto:**
  - Demo com UX polished transmite qualidade portfolio/produção para avaliadores.
  - QR scanner reduz fricção do checker em campo: varredura imediata sem input manual.
  - Gate de portabilidade protege a Sprint 018 de começar sobre base com acoplamentos não mapeados.

- **Riscos envolvidos:**
  - MediaDevices API indisponível em contexto HTTP não-seguro; exige HTTPS ou `localhost`.
  - Skeleton e error boundaries mal posicionados podem ocultar dados ou mascarar falhas silenciosas.
  - Auditoria de portabilidade pode revelar acoplamento introduzido nas sprints 014–016, exigindo refactor antes do gate.

- **Áreas afetadas:**
  - `src/features/` (events, tickets, checkin)
  - `src/app/` (layouts, error.tsx, layout.tsx)
  - `src/components/`
  - `docs/development/MIGRATION-PLAN.md`
  - `docs/development/MIGRATION-GATE.md` (novo)
  - `scripts/smoke/`

- **Fluxos de usuário impactados:**
  - Compra de ingresso (loading → skeleton → dado)
  - Check-in via câmera ou input manual
  - Admin: criação de evento e dashboard de vendas
  - Qualquer fluxo com erro de rede ou validação (error boundary + toast)

- **Premissas importantes:**
  - `jsQR` será adicionado como dependência; sem necessidade de biblioteca nativa.
  - Sonner ou shadcn/ui toast já está ou pode ser configurado sem breaking change.
  - Scripts de smoke rodam via `tsx` ou `node` contra servidor local em execução.

- **Fora de escopo nesta sprint:**
  - Redesign visual completo ou novo sistema de design.
  - Dark mode.
  - Internacionalização (i18n).
  - Testes E2E automatizados com browser real (apenas smoke scripts HTTP).
  - Início de qualquer trabalho de migração NestJS.

---

## 4. Critérios de Sucesso

- [ ] Skeleton screens implementados em: listagem de eventos (event cards), detalhe de evento, "Meus Ingressos" (ticket cards) e admin dashboard (tabelas).
- [ ] Error boundaries com mensagens em português em todos os layouts principais: `/`, `/eventos/[slug]`, `/checkout`, `/meus-ingressos`, `/admin`.
- [ ] Toast notifications funcionando para: pedido criado com sucesso, erro de pagamento e check-in sucesso/falha.
- [ ] Checkout, "Meus Ingressos" e Check-in validados em viewport 375px (iPhone SE) sem overflow horizontal e com touch targets ≥ 44px.
- [ ] Camera QR scanner funcionando no `/checkin` via MediaDevices API + `jsQR`; graceful degradation para input manual quando câmera estiver indisponível ou negada.
- [ ] Checklist `migration-portability.md` 100% verde após auditar sprints 014–016 (`npm run lint:architecture` + inspeção manual de imports).
- [ ] E2E smoke scripts cobrindo 3 fluxos: compra completa (com pagamento simulado), check-in e criação de evento no admin.
- [ ] `docs/development/MIGRATION-GATE.md` criado com resultado da auditoria, evidências e checkbox `[x] Aprovado para Sprint 018`.

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] Sprint 016 concluída e validada.
- [ ] Ambiente de desenvolvimento com HTTPS ou `localhost` configurado (requisito MediaDevices API).
- [ ] `jsQR` disponível via npm sem conflito de licença.
- [ ] Módulos de payment e email das sprints 014–016 acessíveis para auditoria de imports.

### Ordem macro recomendada
1. Discovery: mapear componentes afetados, confirmar padrão de skeleton com shadcn/ui, confirmar disponibilidade de `jsQR`.
2. Design de comportamento: definir contratos de `QrScanner`, `SkeletonCard`, error boundary e smoke scripts.
3. RED tests: testes de skeleton (aparece/desaparece), error boundary (captura erro filho), `QrScanner` (detecta QR de `TicketQR`).
4. Implementação: UX Polish (UX-001 a UX-004) → Mobile Pass (UX-005 a UX-007) → QR Scanner (UX-008 a UX-010).
5. Migration Gate: GATE-001 → GATE-002 → GATE-003 → GATE-004 → GATE-005.
6. Validação e rollout: comandos finais, homologação manual, aprovação formal do gate.

### Paralelização possível
- UX-005, UX-006, UX-007 (mobile pass) — independentes entre si e do QR scanner.
- UX-008, UX-009, UX-010 (QR scanner) — independentes das tasks de mobile pass.
- GATE-003 (atualização de MIGRATION-PLAN.md) — pode rodar em paralelo com GATE-002 (smoke scripts).

### Caminho crítico
- UX-001 → UX-002 → UX-003 → GATE-001 → GATE-002 → GATE-004 → GATE-005

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear componentes existentes, confirmar padrão de loading state com shadcn/ui, identificar pontos de acoplamento potencial e planejar integração do QR scanner.

### Checklist
- [ ] Analisar componentes de listagem de eventos, detalhe de evento, ticket cards e admin tables para identificar onde inserir skeletons.
- [ ] Verificar se `error.tsx` e `loading.tsx` do Next.js app router já existem em alguma rota e como estão estruturados.
- [ ] Confirmar padrão `animate-pulse` com shadcn/ui e Tailwind no projeto.
- [ ] Verificar se `sonner` ou shadcn/ui `toast` já está instalado ou se precisa ser adicionado.
- [ ] Inspecionar `CheckinForm` para entender o fluxo de submissão atual antes de adicionar câmera.
- [ ] Confirmar disponibilidade de `jsQR` no npm e ausência de conflito com dependências existentes.
- [ ] Executar `npm run lint:architecture` para obter baseline antes da auditoria da sprint.
- [ ] Inspecionar imports de `src/server/payment/` e `src/server/email/` para detectar acoplamentos ao Vinext/Cloudflare Workers.
- [ ] Verificar layouts de checkout (375px) no DevTools para confirmar pontos de overflow.
- [ ] Mapear rotas que precisam de error boundary: `/`, `/eventos/[slug]`, `/checkout`, `/meus-ingressos`, `/admin`.

### Saída esperada
- Lista de arquivos a criar/editar por categoria de task.
- Confirmação de que `jsQR` pode ser instalado.
- Resultado baseline do `lint:architecture`.
- Mapa de acoplamentos suspeitos nas sprints 014–016.
- Plano de execução por lote (UX Polish / Mobile Pass / QR Scanner / Gate).

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Definir contratos e comportamentos verificáveis antes de implementar qualquer componente novo.

### Checklist
- [ ] Definir interface de `SkeletonCard`: sem props obrigatórias, compatível com shadcn/ui `Card`.
- [ ] Definir contrato de `QrScanner`: props `onScan(code: string)`, `onError(reason: string)`, retorna `null` quando câmera indisponível.
- [ ] Definir comportamento de error boundary: captura erro de filho, exibe mensagem em português com botão "Tentar novamente" e link para home.
- [ ] Definir comportamento de toast: chamado em `onSuccess`/`onError` dos forms de checkout e checkin.
- [ ] Definir contrato dos smoke scripts: exit code 0 em sucesso, exit code 1 com mensagem descritiva em falha.
- [ ] Confirmar que regras críticas de negócio permanecem no backend (check-in ainda valida server-side).
- [ ] Confirmar que `QrScanner` apenas captura e repassa o código — validação permanece no use-case de checkin.

### Casos de teste planejados
- [ ] Cenário 1: Skeleton renderiza durante loading de eventos e desaparece após dados carregados.
- [ ] Cenário 2: Error boundary captura erro lançado em componente filho e exibe mensagem "Algo deu errado. Tente novamente." com botão funcional.
- [ ] Cenário 3: Toast de sucesso aparece ao criar pedido; toast de erro aparece ao falhar checkout.
- [ ] Cenário 4: Em viewport 375px, checkout form não apresenta overflow horizontal e touch targets medem ≥ 44px.
- [ ] Cenário 5: `QrScanner` detecta QR code gerado por `TicketQR` e chama callback `onScan` com o código correto.
- [ ] Edge case 1: Câmera negada pelo usuário → fallback silencioso para input manual com mensagem "Permissão negada. Use o campo de texto abaixo."
- [ ] Regressão 1: Checkin via input manual continua funcionando após adicionar QR scanner.

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | `QrScanner`, `SkeletonCard`, error boundary | Sim | TDD-first |
| Integração | Smoke scripts (3 fluxos HTTP) | Sim | `scripts/smoke/*.ts` |
| E2E | Compra completa, check-in, admin create event | Sim | Via smoke scripts HTTP |
| Regressão | Checkin via input manual, listagem de eventos | Sim | Garantir sem regressão |
| Auth/AuthZ | Check-in continua exigindo autenticação server-side | Sim | Validação no use-case |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED antes de qualquer implementação de componente ou script.

### Checklist
- [ ] Escrever testes de renderização para `EventCardSkeleton`, `TicketCardSkeleton` antes de criar os componentes.
- [ ] Escrever teste de error boundary: montar `ErrorBoundary` com filho que lança erro, confirmar fallback renderiza.
- [ ] Escrever teste de `QrScanner`: mock de `navigator.mediaDevices`, confirmar que `onScan` é chamado com código correto ao detectar QR.
- [ ] Escrever teste de integração: `QrScanner` decodifica imagem gerada por `TicketQR` e retorna o mesmo código.
- [ ] Garantir que testes falham pelo motivo correto (componente não existe ainda) antes de implementar.
- [ ] Escrever teste de regressão: checkin via input manual — submissão com código válido retorna sucesso.

### Testes a implementar primeiro
- [ ] Teste unitário: `EventCardSkeleton` renderiza sem props e contém elemento `animate-pulse`.
- [ ] Teste unitário: `ErrorBoundary` com filho que lança `new Error("test")` → renderiza texto "Algo deu errado".
- [ ] Teste unitário: `QrScanner` — quando `getUserMedia` retorna stream, componente renderiza elemento `<video>`.
- [ ] Teste de integração: smoke script `purchase-flow.ts` retorna exit code 0 com servidor local rodando.
- [ ] Teste de edge case: `QrScanner` — quando `getUserMedia` rejeita com `NotAllowedError`, `onError` é chamado com mensagem de permissão.
- [ ] Teste de regressão: `CheckinForm` com input manual — formulário submete e exibe resultado sem alterar comportamento existente.

### Evidência RED
- **Comando executado:** `npm run test:unit -- --testPathPattern=skeleton|error-boundary|qr-scanner`
- **Falha esperada observada:** `Cannot find module 'src/features/events/event-card-skeleton'`
- **Observações:** Confirmar falha por ausência do módulo, não por erro de configuração do runner.

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para fazer os testes passarem, respeitando a arquitetura de camadas e sem introduzir acoplamento novo ao framework.

### Checklist
- [ ] Criar componentes de skeleton com padrão `animate-pulse` consistente com shadcn/ui.
- [ ] Criar `src/app/error.tsx` global e `error.tsx` por rota conforme necessário.
- [ ] Configurar `Toaster` em `src/app/layout.tsx` e integrar chamadas de toast nos forms de checkout e checkin.
- [ ] Adicionar estados de loading (spinner no botão de submit) em checkout e checkin forms.
- [ ] Corrigir layout mobile (375px): overflow, touch targets, espaçamentos.
- [ ] Adicionar `public/manifest.json`, meta tags de PWA e service worker básico de offline fallback.
- [ ] Criar `src/features/checkin/qr-scanner.tsx` com integração MediaDevices API + `jsQR`.
- [ ] Integrar `QrScanner` em `src/features/checkin/checkin-form.tsx` com fallback para input manual.
- [ ] Criar scripts de smoke em `scripts/smoke/purchase-flow.ts`, `checkin-flow.ts`, `admin-flow.ts`.
- [ ] Executar auditoria de portabilidade (GATE-001) e registrar resultado.
- [ ] Atualizar `docs/development/MIGRATION-PLAN.md` com estado pós-sprints 014–016.
- [ ] Criar `docs/development/MIGRATION-GATE.md` com resultado da auditoria.

### Regras obrigatórias
- Não confiar em input do client — validação de QR code permanece no use-case de checkin server-side.
- Toda regra crítica deve estar protegida no backend; `QrScanner` apenas captura e repassa o código.
- Nenhuma implementação sem teste correspondente.
- Manter consistência com a arquitetura atual: UI → handler → use-case → repository.
- Não colocar regra de negócio de check-in em componente de câmera.

### Mudanças previstas
- **Backend:** Nenhuma mudança de lógica; scripts de smoke adicionam chamadas HTTP de teste.
- **API:** Nenhum endpoint novo.
- **Frontend:**
  - Novos componentes: `EventCardSkeleton`, `EventDetailSkeleton`, `TicketCardSkeleton`, `AdminTableSkeleton`, `QrScanner`.
  - Novos arquivos: `src/app/error.tsx`, `src/app/eventos/[slug]/error.tsx`, `src/app/checkout/error.tsx`, `src/app/meus-ingressos/error.tsx`, `src/app/admin/error.tsx`.
  - Modificados: `src/app/layout.tsx` (Toaster), `src/features/checkin/checkin-form.tsx`, checkout form (toast + spinner).
- **Banco/Schema:** Nenhuma mudança.
- **Infra/Config:** `public/manifest.json`, `public/sw.js` (service worker básico), instalação de `jsQR`.
- **Docs:** `docs/development/MIGRATION-PLAN.md` atualizado; `docs/development/MIGRATION-GATE.md` criado.

---

## 10. Etapa 5 — Refatoração

### Objetivo
Melhorar legibilidade, manutenção e coesão dos componentes criados sem alterar comportamento validado.

### Checklist
- [ ] Extrair padrão de skeleton para um helper compartilhado se houver repetição entre `EventCardSkeleton`, `TicketCardSkeleton` e `AdminTableSkeleton`.
- [ ] Garantir que error boundaries são reutilizáveis (componente genérico `<ErrorBoundary>` com props de mensagem).
- [ ] Remover duplicações entre os 3 smoke scripts (extrair helper de `fetch` com autenticação e log).
- [ ] Refinar nomes de callbacks e props do `QrScanner` para consistência com convenções do projeto.
- [ ] Garantir que todos os testes continuem verdes após refatoração.
- [ ] Verificar se loading states de botão seguem padrão único de UX (prop `isLoading` ou `disabled` durante submit).

### Saída esperada
- Código de skeleton reutilizável com padrão único.
- Error boundary genérico e configurável.
- Scripts de smoke com helper compartilhado e sem código duplicado.
- Zero regressão confirmada por `npm run test:unit && npm run test:integration`.

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar suíte unitária completa relevante.
- [ ] Executar testes de integração (smoke scripts contra servidor local).
- [ ] Executar checklist manual de homologação (seção 13).
- [ ] Executar `npm run lint` e `npm run lint:architecture`.
- [ ] Executar `npm run build` sem erros.
- [ ] Validar fluxo ponta a ponta: compra → check-in com câmera → admin cria evento.

### Comandos finais
```bash
npm run test:unit
npm run test:integration
npm run lint
npm run lint:architecture
npm run build
node scripts/smoke/purchase-flow.ts
node scripts/smoke/checkin-flow.ts
node scripts/smoke/admin-flow.ts
```

### Rollout
- **Estratégia de deploy:** Incremental — cada feature de UX é independente e pode ser mergeada separadamente. QR scanner habilitado por padrão com graceful degradation.
- **Uso de feature flag:** Não necessário; QR scanner tem fallback nativo para input manual.
- **Plano de monitoramento pós-release:** Verificar logs de erro de check-in nos primeiros 30 minutos após deploy. Confirmar que `MIGRATION-GATE.md` está aprovado antes de qualquer comunicação de inicio da Sprint 018.
- **Métricas a observar:** Taxa de erros em `/checkin`; ausência de erros de `getUserMedia` não tratados no console.
- **Alertas esperados:** Nenhum alerta novo esperado — QR scanner falha graciosamente.

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** Horário comercial, após smoke scripts passando.
- **Tempo de monitoramento:** 30 minutos pós-deploy.

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: componentes mapeados, `jsQR` confirmado, baseline de arquitetura registrado.
- [ ] Checkpoint 2 — Estratégia de testes aprovada: casos de teste, matriz e contratos definidos.
- [ ] Checkpoint 3 — RED tests concluídos: testes de skeleton, error boundary e `QrScanner` falhando pelos motivos corretos.
- [ ] Checkpoint 4 — GREEN alcançado: todos os testes passando com implementações mínimas.
- [ ] Checkpoint 5 — Refatoração concluída: código limpo, sem duplicação, testes ainda verdes.
- [ ] Checkpoint 6 — Validação final concluída: smoke scripts passando, gate aprovado, `MIGRATION-GATE.md` com `[x] Aprovado`.

### Log resumido dos checkpoints
| Checkpoint | Responsável | Resultado | Observações |
|-----------|-------------|-----------|-------------|
| 1 — Discovery | @jeandias | ⏳ Pendente | |
| 2 — Testes | @jeandias | ⏳ Pendente | |
| 3 — RED | @jeandias | ⏳ Pendente | |
| 4 — GREEN | @jeandias | ⏳ Pendente | |
| 5 — Refactor | @jeandias | ⏳ Pendente | |
| 6 — Validação | @jeandias | ⏳ Pendente | |

---

## 13. Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Acessar `/eventos/[slug]` com conexão lenta | Skeleton aparece antes dos dados; desaparece ao carregar | Captura de tela com skeleton visível | ⬜ |
| Forçar erro em componente filho | Error boundary exibe "Algo deu errado. Tente novamente." com botão funcional | Captura de tela do fallback | ⬜ |
| Criar pedido com sucesso no checkout | Toast de sucesso "Pedido criado com sucesso" aparece | Gravação do fluxo | ⬜ |
| Forçar erro de pagamento | Toast de erro com mensagem amigável aparece | Log de console + captura de tela | ⬜ |
| Acessar `/checkout` em 375px | Sem overflow horizontal; touch targets ≥ 44px | DevTools screenshot 375px | ⬜ |
| Checker usa câmera em `/checkin` | QR code escaneado → check-in realizado sem digitar código | Gravação em dispositivo móvel | ⬜ |
| Câmera negada pelo usuário | Mensagem "Permissão negada. Use o campo de texto abaixo." + input manual funcionando | Captura de tela | ⬜ |
| Check-in via input manual após QR scanner adicionado | Comportamento existente sem regressão | Teste automatizado passando | ⬜ |
| `npm run lint:architecture` | Zero violações de acoplamento nos módulos 014–016 | Output do comando no MIGRATION-GATE.md | ⬜ |
| Smoke script `purchase-flow.ts` | Exit code 0; log de confirmação de compra | Output do script | ⬜ |
| Smoke script `checkin-flow.ts` | Exit code 0; log de check-in realizado | Output do script | ⬜ |
| Smoke script `admin-flow.ts` | Exit code 0; log de evento criado | Output do script | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Falha em fluxo crítico de compra ou check-in em produção após deploy.
- Regressão em `CheckinForm` (input manual parou de funcionar).
- Erro não tratado de `getUserMedia` causando crash em browsers sem suporte.
- Smoke script falhando após deploy indicando indisponibilidade de endpoint.

### Passos
1. Reverter o commit de UX (ou cherry-pick do commit de regressão) para versão estável anterior.
2. Fazer redeploy imediato da versão anterior.
3. Executar smoke scripts contra a versão revertida para confirmar estabilidade.
4. Comunicar incidente e registrar causa provável no repositório.
5. Abrir task de pós-mortem se necessário antes de re-tentar a feature.

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 15 minutos (reverter commit de UX se necessário).

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos foram cobertos por testes.
- [ ] Os testes foram escritos antes da implementação (TDD).
- [ ] A implementação atende ao comportamento esperado definido na seção 7.
- [ ] Não houve regressão nos fluxos de compra, check-in e admin.
- [ ] Validação de check-in permanece no use-case server-side; `QrScanner` é apenas captura.
- [ ] Checklist manual de homologação (seção 13) executado com todos os itens marcados.
- [ ] Rollback definido e testado (RTO: 15 min).
- [ ] `docs/development/MIGRATION-GATE.md` criado e com `[x] Aprovado para Sprint 018`.
- [ ] `docs/development/MIGRATION-PLAN.md` atualizado com estado pós-sprints 014–016.
- [ ] Critérios de sucesso da seção 4 todos marcados.

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Todos os componentes de UX (skeletons, error boundaries, toasts, loading states) entregues e testados.
- [ ] Mobile pass validado em 375px para checkout, "Meus Ingressos" e check-in.
- [ ] QR scanner funcional no `/checkin` com fallback gracioso para input manual.
- [ ] Três smoke scripts passando contra servidor local.
- [ ] Auditoria de portabilidade (`migration-portability.md`) 100% verde para sprints 014–016.
- [ ] `MIGRATION-GATE.md` com checkbox `[x] Aprovado para Sprint 018` marcado.
- [ ] `MIGRATION-PLAN.md` atualizado.
- [ ] Testes unitários e de integração passando.
- [ ] Sem violação arquitetural crítica introduzida.
- [ ] Sem blocker aberto.
- [ ] Documentação atualizada (gate, migration plan, changelog).

---

## 17. Instrução padrão para AGENTS.md

```text
When generating new sprints for this application, always follow the official Sprint Template.

This application is TDD-first and Agent-OS-driven.

Mandatory rules:
- tests come before implementation
- every feature, fix, or refactor must define expected behavior first
- every implementation must have corresponding automated tests
- regression fixes must include regression tests
- backend validation and data integrity must be prioritized
- do not generate implementation-only sprints
- every sprint must include discovery, behavior design, test strategy, test-first execution, implementation, refactor, QA, validation, and rollback
- when useful, split work into parallelizable execution batches
- preserve the current architecture and codebase conventions
- do not generate generic sprint content

Always keep the sprint specific to the current codebase and architecture.
Follow the sprint template exactly.
```
