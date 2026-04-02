---
title: Tasks — Fase 017: UX Polish + Pre-Migration Gate
type: phase-task-board
mode: execution-tracking
status: planned
---

# Tasks — Fase 017: UX Polish + Pre-Migration Gate

**Status:** 🟢 ATIVA
**Última atualização:** 2026-04-01
**Sprint Atual:** Sprint 017
**Modo principal:** mixed (frontend + architecture)
**Status Geral:** ⏳ 0% (0/15 tarefas completas) — FASE ATIVA
**ETA:** 1,5 semanas
**Pré-requisito:** Fase 016 (✅ Concluída)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-017.md`, `docs/development/MIGRATION-PLAN.md`, `docs/development/MIGRATION-GATE.md` (a criar)

---

> **NOTA CRÍTICA:** Sprint 018 (migração NestJS) está **bloqueada** até que `docs/development/MIGRATION-GATE.md` seja criado com o checkbox `[x] Aprovado para Sprint 018` marcado. Nenhum trabalho de migração pode ser iniciado antes da conclusão de GATE-005.

---

## Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| UX Polish | 4 | 0 | 0 | 4 | 0 |
| Mobile Pass | 3 | 0 | 0 | 3 | 0 |
| QR Scanner | 3 | 0 | 0 | 3 | 0 |
| Migration Gate | 5 | 0 | 0 | 5 | 0 |
| **TOTAL** | **15** | **0** | **0** | **15** | **0** |

### Principais Indicadores
- ⏳ Fase recém-planejada — nenhuma tarefa iniciada.
- ⚠️ Gate de migração (GATE-001 a GATE-005) é caminho crítico bloqueante para Sprint 018.
- 🔴 Sprint 018 bloqueada até GATE-005 aprovado.
- 🧪 Testes TDD-first obrigatórios antes de qualquer implementação.

---

## Objetivos da Fase

- Implementar skeleton screens em listagem de eventos, detalhe de evento, "Meus Ingressos" e admin dashboard.
- Introduzir error boundaries com mensagens em português em todos os layouts principais.
- Adicionar toast notifications para ações críticas: pedido criado, erro de pagamento, check-in sucesso/falha.
- Validar e corrigir layout mobile (375px) nos fluxos de checkout, "Meus Ingressos" e check-in.
- Implementar QR scanner via MediaDevices API + `jsQR` no `/checkin` com fallback para input manual.
- Passar auditoria formal de migration readiness (`migration-portability.md`) para sprints 014–016.
- Criar e aprovar `docs/development/MIGRATION-GATE.md` como gate formal para Sprint 018.

---

## Dependências, Batches e Caminho Crítico

### Dependências macro
- Fase 016 concluída e validada.
- Ambiente de desenvolvimento com HTTPS ou `localhost` disponível (requisito da MediaDevices API).
- `jsQR` disponível via npm sem conflito de licença com o projeto.
- Módulos de payment e email das sprints 014–016 disponíveis para auditoria de imports.

### Caminho crítico
1. UX-001 — Skeleton screens (base visual para loading states)
2. UX-002 — Error boundaries (base de tratamento de erros em todos os layouts)
3. UX-003 — Toast notifications (integração nos forms de checkout e checkin)
4. GATE-001 — Auditoria de portabilidade das sprints 014–016
5. GATE-002 — Smoke scripts E2E (3 fluxos)
6. GATE-004 — Criação de `MIGRATION-GATE.md` com evidências
7. GATE-005 — Aprovação formal do gate (checkbox `[x] Aprovado para Sprint 018`)

### Paralelização possível
- Lote A — Mobile Pass: UX-005, UX-006, UX-007 (independentes entre si e do QR scanner)
- Lote B — QR Scanner: UX-008, UX-009, UX-010 (independentes do Mobile Pass)
- Lote C — Docs Gate: GATE-003 pode rodar em paralelo com GATE-002

### Checkpoints
- [ ] Discovery concluído: componentes mapeados, `jsQR` confirmado, baseline de arquitetura registrado
- [ ] Estratégia técnica validada: contratos de `QrScanner`, `SkeletonCard` e error boundary definidos
- [ ] Primeira batch implementada: UX-001, UX-002, UX-003 com testes passando
- [ ] Integração validada: QR scanner + check-in funcionando com graceful degradation
- [ ] Encerramento pronto: gate aprovado, migration plan atualizado, todos os smoke scripts passando

---

## Estrutura de Categorias

---

### UX Polish — Skeleton Screens, Error Boundaries, Toasts e Loading States

#### Objetivo
Elevar a percepção de qualidade da demo ao nível portfolio/produção, eliminando estados de loading ausentes, mensagens de erro genéricas e falta de feedback visual nas ações do usuário. Esta categoria cobre os quatro pilares de polish: skeletons durante carregamento, error boundaries amigáveis, toast notifications contextuais e indicadores de loading em forms.

#### Escopo da categoria
- Skeleton screens nos principais componentes de listagem e detalhe.
- Error boundaries com fallback UI em português em todos os layouts de rota.
- Toast notifications para ações de compra e check-in.
- Loading states (spinner) nos botões de submit de checkout e checkin.

#### Riscos da categoria
- Skeleton posicionado incorretamente pode mascarar dados reais se o estado de loading não for limpo corretamente.
- Error boundary mal configurado pode engolir erros de desenvolvimento sem exibir o trace correto em modo dev.

---

#### UX.1 — Skeleton Screens

- [ ] **UX-001** — Implementar `EventCardSkeleton`, `EventDetailSkeleton`, `TicketCardSkeleton` e `AdminTableSkeleton`

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar quatro componentes de skeleton para substituir os estados de loading ausentes nas principais listas e páginas de detalhe.
  - Os componentes devem respeitar as dimensões reais dos cards/tabelas que substituem durante o carregamento.
  - Usar o padrão `animate-pulse` do Tailwind, consistente com os componentes `Card` do shadcn/ui já presentes no projeto.

  **Contexto mínimo:**
  - Os componentes `EventCard`, `TicketCard` e as tabelas do admin não têm estado de loading hoje.
  - `loading.tsx` do Next.js App Router deve ser criado (ou atualizado) por rota para usar os skeletons correspondentes.
  - Skeleton deve desaparecer automaticamente quando os dados do servidor chegarem (comportamento padrão do App Router com `Suspense`).

  **Implementação sugerida:**
  - Criar `src/features/events/event-card-skeleton.tsx` com um `Card` placeholder de mesma altura do `EventCard`.
  - Criar `src/features/tickets/ticket-card-skeleton.tsx` espelhando o layout do `TicketCard`.
  - Criar `src/features/admin/admin-table-skeleton.tsx` com N linhas de placeholder para tabelas de eventos e pedidos.
  - Criar `src/features/events/event-detail-skeleton.tsx` para a página `/eventos/[slug]`.
  - Criar/atualizar `loading.tsx` nas rotas: `/eventos`, `/eventos/[slug]`, `/meus-ingressos`, `/admin`.

  **Arquivos/áreas afetadas:**
  - `src/features/events/event-card-skeleton.tsx` (novo)
  - `src/features/events/event-detail-skeleton.tsx` (novo)
  - `src/features/tickets/ticket-card-skeleton.tsx` (novo)
  - `src/features/admin/admin-table-skeleton.tsx` (novo)
  - `src/app/eventos/loading.tsx`, `src/app/eventos/[slug]/loading.tsx`, `src/app/meus-ingressos/loading.tsx`, `src/app/admin/loading.tsx`

  **Critérios de aceitação:**
  - [ ] `EventCardSkeleton` renderiza sem props e contém pelo menos um elemento com classe `animate-pulse`.
  - [ ] Skeleton de cada rota aparece durante carregamento de dados e desaparece após dados carregados.
  - [ ] Nenhum skeleton usa dimensões fixas arbitrárias — respeita o layout do componente real.
  - [ ] Sem regressão visual nas rotas afetadas.

  **Estratégia de teste:**
  - [ ] Unitário: renderização de cada skeleton (sem props, sem crash, elemento `animate-pulse` presente)
  - [ ] Integração: rota com Suspense — skeleton aparece enquanto Promise está pendente
  - [ ] Regressão: componentes reais continuam renderizando após skeleton ser introduzido

  **Dependências:** Nenhuma
  **Bloqueia:** UX-002 (visualmente relacionado, mas tecnicamente independente)
  **Pode rodar em paralelo com:** UX-005, UX-006, UX-007, UX-008, UX-009, UX-010

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Quatro componentes de skeleton criados e testados.
  - [ ] `loading.tsx` das rotas afetadas usando os skeletons.
  - [ ] Testes unitários passando.
  - [ ] Sem violação arquitetural (skeleton é componente de UI puro, sem lógica de negócio).

  **Notas adicionais:**
  - Usar `cn()` do shadcn/ui para composição de classes se já presente no projeto.
  - Verificar se `Skeleton` do shadcn/ui já está instalado (`components/ui/skeleton.tsx`); se sim, usá-lo como base em vez de criar do zero.

---

#### UX.2 — Error Boundaries

- [ ] **UX-002** — Implementar error boundaries com fallback UI em português em todos os layouts principais

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar `error.tsx` nas rotas principais para capturar erros de renderização e exibir fallback amigável em português.
  - O fallback deve exibir a mensagem "Algo deu errado. Tente novamente." com um botão "Tentar novamente" (que chama `reset()`) e um link "Voltar para o início" apontando para `/`.
  - O componente deve ser reutilizável via props de mensagem opcional.

  **Contexto mínimo:**
  - Next.js App Router usa `error.tsx` por segmento de rota para error boundaries automaticamente.
  - O componente precisa ser um Client Component (`"use client"`) para acessar a prop `reset`.
  - Erros internos do servidor (500) não devem ser expostos ao usuário — apenas a mensagem amigável.

  **Implementação sugerida:**
  - Criar `src/app/error.tsx` global como Client Component com props `{ error, reset }`.
  - Criar `error.tsx` específico nas rotas: `/eventos/[slug]`, `/checkout`, `/meus-ingressos`, `/admin` se precisarem de mensagem contextualizada.
  - Exibir botão "Tentar novamente" que chama `reset()` e link para `/`.
  - Em modo development, exibir o `error.message` em bloco colapsável para debugging.

  **Arquivos/áreas afetadas:**
  - `src/app/error.tsx` (novo — global)
  - `src/app/eventos/[slug]/error.tsx` (novo)
  - `src/app/checkout/error.tsx` (novo)
  - `src/app/meus-ingressos/error.tsx` (novo)
  - `src/app/admin/error.tsx` (novo)

  **Critérios de aceitação:**
  - [ ] Error boundary captura erro lançado em componente filho e exibe "Algo deu errado. Tente novamente."
  - [ ] Botão "Tentar novamente" chama `reset()` e recarrega o segmento.
  - [ ] Link "Voltar para o início" navega para `/`.
  - [ ] Mensagem não expõe stack trace ou erro interno ao usuário em produção.
  - [ ] Error boundaries cobrem todas as cinco rotas listadas.

  **Estratégia de teste:**
  - [ ] Unitário: montar `ErrorBoundary` com filho que lança erro — confirmar fallback renderiza com texto correto
  - [ ] Regressão: rotas sem erro continuam renderizando normalmente
  - [ ] E2E (manual): forçar erro em componente e confirmar fallback em browser

  **Dependências:** Nenhuma
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-001, UX-003, UX-005, UX-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] `error.tsx` criado em todas as cinco rotas.
  - [ ] Teste unitário de error boundary passando.
  - [ ] Sem regressão em rotas sem erro.
  - [ ] Sem violação arquitetural (error boundary é UI pura, sem lógica de negócio).

---

#### UX.3 — Toast Notifications

- [ ] **UX-003** — Configurar Toaster e implementar toast notifications para pedido criado, erro de pagamento e check-in sucesso/falha

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Configurar `Toaster` (sonner ou shadcn/ui toast) em `src/app/layout.tsx` para disponibilizar toasts em toda a aplicação.
  - Integrar chamadas de toast nos pontos de ação: sucesso e erro do checkout form, sucesso e falha do checkin form.
  - Toasts devem ter mensagens em português, duração adequada e tipo visual correto (sucesso = verde, erro = vermelho).

  **Contexto mínimo:**
  - Checkout form e checkin form já existem; a integração de toast deve ser adicionada nos handlers de `onSubmit`.
  - Não alterar lógica de negócio — apenas adicionar feedback visual após a resposta do servidor.
  - Se `sonner` não estiver instalado, avaliar sonner vs. shadcn/ui toast e escolher o que já estiver presente no projeto.

  **Implementação sugerida:**
  - Verificar se `sonner` ou `@radix-ui/react-toast` já está presente. Se não, instalar `sonner` (mais simples para Server Actions).
  - Adicionar `<Toaster />` em `src/app/layout.tsx` após o `{children}`.
  - No checkout form: chamar `toast.success("Pedido criado com sucesso!")` após pedido criado; `toast.error("Erro ao processar pagamento. Tente novamente.")` em caso de falha.
  - No checkin form: chamar `toast.success("Check-in realizado com sucesso!")` e `toast.error("Falha no check-in: [motivo]")`.

  **Arquivos/áreas afetadas:**
  - `src/app/layout.tsx` (adicionar `<Toaster />`)
  - `src/features/checkout/checkout-form.tsx` (adicionar chamadas de toast)
  - `src/features/checkin/checkin-form.tsx` (adicionar chamadas de toast)

  **Critérios de aceitação:**
  - [ ] Toast de sucesso aparece ao criar pedido no checkout.
  - [ ] Toast de erro aparece ao falhar o checkout.
  - [ ] Toast de sucesso aparece ao realizar check-in com código válido.
  - [ ] Toast de falha aparece ao realizar check-in com código inválido ou já usado.
  - [ ] Toaster presente no layout raiz sem afetar outras páginas.
  - [ ] Mensagens em português.

  **Estratégia de teste:**
  - [ ] Unitário: simular submit de checkout form com mock de server action retornando sucesso/erro — confirmar `toast` chamado com mensagem correta
  - [ ] Regressão: forms de checkout e checkin continuam funcionando sem toast (sem depender do toast para submissão)

  **Dependências:** Nenhuma
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-001, UX-002, UX-004, UX-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Toaster configurado no layout raiz.
  - [ ] Toast integrado em checkout form e checkin form.
  - [ ] Testes unitários passando.
  - [ ] Sem regressão nos forms.

---

#### UX.4 — Loading States em Forms

- [ ] **UX-004** — Adicionar indicador de loading (spinner no botão de submit) durante submissão dos forms de checkout e checkin

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Durante o submit dos forms de checkout e checkin, o botão de envio deve ficar desabilitado e exibir um spinner para indicar que a ação está em andamento.
  - Impede duplo-submit e comunica ao usuário que a requisição está sendo processada.

  **Contexto mínimo:**
  - Os forms já usam `useTransition` ou `useState` para controle de estado; o indicador de loading deve ser integrado nesse controle existente.
  - O spinner deve ser removido após a resposta (sucesso ou erro) do servidor.

  **Implementação sugerida:**
  - Usar `isPending` do `useTransition` (se Server Actions) ou `isSubmitting` do estado local.
  - No botão: `disabled={isPending}` + ícone de spinner (Lucide `Loader2` com `animate-spin`) quando `isPending` for true.
  - Substituir texto "Finalizar pedido" / "Realizar check-in" por "Processando..." durante loading.

  **Arquivos/áreas afetadas:**
  - `src/features/checkout/checkout-form.tsx`
  - `src/features/checkin/checkin-form.tsx`

  **Critérios de aceitação:**
  - [ ] Botão de submit desabilitado durante requisição em andamento.
  - [ ] Spinner visível no botão durante loading.
  - [ ] Botão retorna ao estado normal após resposta (sucesso ou erro).
  - [ ] Sem duplo-submit possível.

  **Estratégia de teste:**
  - [ ] Unitário: simular estado `isPending=true` — confirmar botão `disabled` e spinner visível
  - [ ] Regressão: form submete normalmente quando `isPending=false`

  **Dependências:** Nenhuma
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-001, UX-002, UX-003, UX-005

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Spinner implementado nos dois forms.
  - [ ] Teste unitário de estado de loading passando.
  - [ ] Sem regressão nos forms.

---

### Mobile Pass — Responsividade, PWA e Touch Targets

#### Objetivo
Garantir que os fluxos críticos da demo (checkout, "Meus Ingressos" e check-in) sejam utilizáveis em dispositivos móveis de tamanho iPhone SE (375px de largura), com touch targets adequados, sem overflow horizontal e com suporte básico a PWA para instalação na tela inicial. Esta categoria é independente das demais e pode ser trabalhada em paralelo.

#### Escopo da categoria
- Audit e correção de layout mobile nos fluxos de checkout, lot selector e ticket cards.
- PWA manifest e service worker básico para offline fallback.
- Correções específicas de touch targets e espaçamentos em mobile.

#### Riscos da categoria
- Service worker mal configurado pode causar cache indesejado de dados dinâmicos (eventos, pedidos).
- Alterações de layout mobile podem afetar o layout desktop se não forem feitas com breakpoints corretos.

---

#### UX.5 — Auditoria e Correção Mobile

- [ ] **UX-005** — Auditar e corrigir layout mobile de checkout form, lot selector e ticket cards em viewport 375px

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - Abrir cada fluxo no DevTools em 375px (iPhone SE) e identificar: overflow horizontal, touch targets < 44px, texto < 16px e elementos cortados.
  - Corrigir os problemas encontrados usando classes Tailwind responsivas (`sm:`, `md:`) sem afetar o layout desktop.

  **Contexto mínimo:**
  - Viewport alvo: 375px × 667px (iPhone SE).
  - Touch target mínimo: 44px × 44px (Apple HIG).
  - Tamanho de fonte mínimo: 16px para inputs (evita zoom automático no iOS).
  - Overflow horizontal: nenhum elemento deve causar scroll horizontal na página.

  **Implementação sugerida:**
  - Inspecionar `checkout-form.tsx`, `lot-selector.tsx` e `ticket-card.tsx` no DevTools em 375px.
  - Adicionar `w-full` em campos de input que estejam com largura fixa.
  - Garantir `min-h-[44px]` e `p-3` em botões e áreas clicáveis.
  - Usar `text-base` (16px) em todos os inputs para evitar zoom no iOS.
  - Adicionar `overflow-x-hidden` no container principal se necessário como last resort.

  **Arquivos/áreas afetadas:**
  - `src/features/checkout/checkout-form.tsx`
  - `src/features/checkout/lot-selector.tsx` (ou equivalente)
  - `src/features/tickets/ticket-card.tsx`
  - `src/app/meus-ingressos/page.tsx` (layout container)

  **Critérios de aceitação:**
  - [ ] Checkout form sem overflow horizontal em 375px.
  - [ ] Lot selector sem overflow horizontal em 375px.
  - [ ] Ticket cards sem overflow horizontal em 375px.
  - [ ] Todos os botões e inputs com touch target ≥ 44px.
  - [ ] Inputs com `font-size` ≥ 16px (sem zoom automático no iOS).
  - [ ] Layout desktop não afetado pelas correções.

  **Estratégia de teste:**
  - [ ] Unitário: snapshot de componentes em viewport 375px (se usar jest com `@testing-library/react`)
  - [ ] Manual (DevTools): screenshot em 375px confirmando ausência de overflow
  - [ ] Regressão: componentes renderizam normalmente em 1280px após correções

  **Dependências:** Nenhuma
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-001, UX-002, UX-003, UX-004, UX-006, UX-007, UX-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Auditoria de 375px concluída para os três fluxos.
  - [ ] Correções aplicadas sem regressão em desktop.
  - [ ] Screenshot de evidência salvo em `docs/` ou comentado no PR.

---

#### UX.6 — PWA Manifest e Service Worker

- [ ] **UX-006** — Criar `public/manifest.json`, meta tags de PWA e service worker básico com offline fallback page

  **Modo recomendado:** frontend
  **Tipo:** infra

  **Descrição curta:**
  - Adicionar suporte básico a PWA para permitir "Adicionar à tela inicial" em iOS e Android.
  - O service worker deve servir apenas uma página de fallback offline simples; não deve fazer cache de dados dinâmicos (eventos, pedidos).

  **Contexto mínimo:**
  - `public/manifest.json` é referenciado por `<link rel="manifest">` no `<head>` do layout.
  - Service worker básico: intercepta navegação offline e serve `/offline.html`.
  - Não usar workbox ou biblioteca pesada — service worker simples e explícito.

  **Implementação sugerida:**
  - Criar `public/manifest.json` com: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, ícone placeholder (192px e 512px).
  - Adicionar `<link rel="manifest" href="/manifest.json" />` e `<meta name="theme-color">` em `src/app/layout.tsx`.
  - Criar `public/sw.js` com fetch handler: se offline e requisição de navegação, retornar `/offline.html`.
  - Criar `public/offline.html` com mensagem simples "Você está offline. Verifique sua conexão.".
  - Registrar service worker via script inline em `layout.tsx` (verificação de `'serviceWorker' in navigator`).

  **Arquivos/áreas afetadas:**
  - `public/manifest.json` (novo)
  - `public/sw.js` (novo)
  - `public/offline.html` (novo)
  - `src/app/layout.tsx` (adicionar `<link>` de manifest, meta theme-color e registro do SW)

  **Critérios de aceitação:**
  - [ ] `manifest.json` válido (validar via Chrome DevTools → Application → Manifest).
  - [ ] Opção "Adicionar à tela inicial" disponível no Chrome mobile em HTTPS/localhost.
  - [ ] Service worker registrado sem erro no console.
  - [ ] Acesso offline exibe `/offline.html` em vez de página de erro do browser.
  - [ ] Dados dinâmicos (eventos, pedidos) não são cacheados pelo service worker.

  **Estratégia de teste:**
  - [ ] Manual: verificar via DevTools → Application → Service Workers
  - [ ] Manual: simular offline no DevTools e confirmar fallback page
  - [ ] Regressão: aplicação funciona normalmente online após SW registrado

  **Dependências:** Nenhuma
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-005, UX-007

  **Prioridade:** 🟢 Média
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] `manifest.json`, `sw.js` e `offline.html` criados.
  - [ ] Manifest e SW validados via DevTools.
  - [ ] Sem regressão na aplicação online.

---

#### UX.7 — Touch Targets e Espaçamentos Mobile

- [ ] **UX-007** — Corrigir touch targets e espaçamentos específicos em mobile (botões, inputs, cards clicáveis)

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - Complementar UX-005 com ajustes finos de touch targets em elementos interativos que não pertencem ao checkout ou ticket cards: botões de navegação, links de menu, cards clicáveis de evento na listagem.
  - Garantir espaçamento adequado entre elementos interativos (≥ 8px entre targets) para evitar toques acidentais.

  **Contexto mínimo:**
  - Qualquer elemento clicável deve ter área mínima de 44px × 44px (pode ser padding, não necessariamente tamanho do elemento).
  - Cards de evento na listagem pública (`/eventos`) são links clicáveis e devem ter padding adequado.

  **Implementação sugerida:**
  - Inspecionar header/nav, cards de evento em `/eventos` e botões de ação do admin em 375px.
  - Aplicar `min-h-[44px] min-w-[44px]` ou `p-3` nos elementos deficientes.
  - Verificar espaçamento entre itens de lista e cards com `gap-3` ou `space-y-3` conforme necessário.

  **Arquivos/áreas afetadas:**
  - `src/components/` (navegação, header)
  - `src/features/events/event-card.tsx`
  - `src/app/admin/` (botões de ação nas tabelas)

  **Critérios de aceitação:**
  - [ ] Todos os elementos interativos com touch target ≥ 44px em 375px.
  - [ ] Espaçamento ≥ 8px entre targets adjacentes.
  - [ ] Sem regressão no layout desktop.

  **Estratégia de teste:**
  - [ ] Manual (DevTools): inspeção de elementos em 375px
  - [ ] Regressão: layout desktop intacto após ajustes

  **Dependências:** UX-005 (auditoria base já realizada)
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-006, UX-008

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Ajustes aplicados nos elementos identificados.
  - [ ] Sem regressão no desktop.
  - [ ] Revisão manual em 375px concluída.

---

### QR Scanner — Câmera no Check-in

#### Objetivo
Integrar leitura de QR code via câmera do dispositivo no fluxo de check-in (`/checkin`), eliminando a necessidade de digitar o código manualmente. A integração usa a MediaDevices API do browser e a biblioteca `jsQR` para decodificação, com fallback automático para input manual quando a câmera estiver indisponível ou com permissão negada. A validação do código permanece server-side no use-case de check-in.

#### Escopo da categoria
- Componente `QrScanner` com integração MediaDevices + `jsQR`.
- Integração do `QrScanner` no `CheckinForm` com auto-submit ao detectar QR.
- Tratamento de permissão negada com mensagem amigável e fallback.
- Teste de integração entre `TicketQR` e `QrScanner`.

#### Riscos da categoria
- `navigator.mediaDevices.getUserMedia` só funciona em HTTPS ou `localhost`; em HTTP simples, a API não estará disponível.
- Decodificação de QR em tempo real pode ser lenta em dispositivos de baixo desempenho; limitar a frequência de frames capturados (requestAnimationFrame com throttle).
- Diferentes browsers têm comportamentos distintos para `facingMode: "environment"` (câmera traseira); implementar com fallback para câmera padrão.

---

#### QR.8 — Componente QrScanner

- [ ] **UX-008** — Criar componente `QrScanner` com MediaDevices API + `jsQR` e integrar no `CheckinForm`

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar `src/features/checkin/qr-scanner.tsx` que ativa a câmera via `navigator.mediaDevices.getUserMedia`, renderiza um `<video>` com o feed, captura frames via `<canvas>` e decodifica QR codes usando `jsQR`.
  - Ao detectar um QR code válido, chamar o callback `onScan(code)` e parar o stream de câmera.
  - Integrar o `QrScanner` em `src/features/checkin/checkin-form.tsx` com auto-submit do código detectado.
  - Se câmera indisponível (API ausente, erro de hardware), o componente retorna `null` e o input manual permanece visível.

  **Contexto mínimo:**
  - A validação do código de check-in permanece inteiramente no use-case server-side; `QrScanner` apenas captura e repassa o código via `onScan`.
  - `jsQR` deve ser instalado como dependência do projeto.
  - O stream de câmera deve ser explicitamente parado (`track.stop()`) ao desmontar o componente para liberar o hardware.
  - Usar `facingMode: { ideal: "environment" }` para preferir câmera traseira, com fallback para câmera frontal.

  **Implementação sugerida:**
  - Instalar: `npm install jsqr`.
  - Criar `qr-scanner.tsx` com:
    - `useRef` para `<video>` e `<canvas>`.
    - `useEffect` que chama `getUserMedia` ao montar, configura o stream no `<video>` e inicia loop `requestAnimationFrame`.
    - A cada frame: desenhar no canvas, chamar `jsQR(imageData, width, height)`, se resultado não-nulo chamar `onScan(result.data)` e parar stream.
    - Cleanup: `track.stop()` ao desmontar.
  - Em `checkin-form.tsx`: renderizar `<QrScanner onScan={handleQrScan} onError={handleQrError} />` acima do input manual; `handleQrScan` preenche o campo e submete automaticamente.

  **Arquivos/áreas afetadas:**
  - `src/features/checkin/qr-scanner.tsx` (novo)
  - `src/features/checkin/checkin-form.tsx` (modificado)
  - `package.json` (adicionar `jsqr`)

  **Critérios de aceitação:**
  - [ ] `QrScanner` renderiza elemento `<video>` quando câmera disponível.
  - [ ] `onScan` chamado com o código correto ao detectar QR code válido.
  - [ ] Stream de câmera parado ao desmontar o componente.
  - [ ] Auto-submit do check-in ao detectar QR — sem necessidade de pressionar botão.
  - [ ] Componente retorna `null` quando `navigator.mediaDevices` não está disponível.
  - [ ] Checkin via input manual continua funcionando sem regressão.

  **Estratégia de teste:**
  - [ ] Unitário: mock de `navigator.mediaDevices.getUserMedia` — confirmar `<video>` renderizado e stream iniciado
  - [ ] Unitário: mock retornando stream e frame com QR — confirmar `onScan` chamado com código correto
  - [ ] Integração: QR gerado por `TicketQR` decodificado corretamente pelo `QrScanner` (UX-010)
  - [ ] Regressão: `CheckinForm` com input manual — submissão funciona sem `QrScanner` ativo

  **Dependências:** Nenhuma
  **Bloqueia:** UX-009, UX-010
  **Pode rodar em paralelo com:** UX-001 a UX-007

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] `qr-scanner.tsx` criado e integrado no `CheckinForm`.
  - [ ] `jsQR` instalado e sem conflito.
  - [ ] Testes unitários passando.
  - [ ] Cleanup do stream implementado.
  - [ ] Sem regressão no input manual.

  **Notas adicionais:**
  - `jsQR` aceita `Uint8ClampedArray` de um `ImageData` — usar `canvas.getContext("2d").getImageData(0, 0, w, h)`.
  - Limitar framerate de captura com throttle de ~150ms entre frames para não sobrecarregar CPU em mobile.

---

#### QR.9 — Permissão de Câmera

- [ ] **UX-009** — Implementar tratamento de permissão negada com mensagem "Permissão negada. Use o campo de texto abaixo."

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Quando o usuário negar a permissão de câmera (erro `NotAllowedError`) ou quando a câmera não estiver disponível (`NotFoundError`), exibir a mensagem contextual "Permissão negada. Use o campo de texto abaixo." e garantir que o input manual fique em evidência.
  - O botão "Ativar câmera" (se presente) deve ser ocultado após negação.

  **Contexto mínimo:**
  - `getUserMedia` rejeita com `DOMException` com `name: "NotAllowedError"` quando permissão negada.
  - `name: "NotFoundError"` quando não há câmera disponível.
  - Ambos os casos devem resultar no mesmo comportamento de fallback visível ao usuário.

  **Implementação sugerida:**
  - No catch do `getUserMedia` em `qr-scanner.tsx`, chamar `onError(reason)` com mensagem mapeada por tipo de erro.
  - Em `checkin-form.tsx`, ao receber `onError`, definir estado `cameraErrorMessage` e exibir abaixo do scanner (ou no lugar dele) com estilo de aviso.
  - Scroll suave até o input manual quando mensagem de erro de câmera aparecer.

  **Arquivos/áreas afetadas:**
  - `src/features/checkin/qr-scanner.tsx` (adicionar mapeamento de erros)
  - `src/features/checkin/checkin-form.tsx` (adicionar exibição de `cameraErrorMessage`)

  **Critérios de aceitação:**
  - [ ] Permissão negada (`NotAllowedError`) exibe "Permissão negada. Use o campo de texto abaixo."
  - [ ] Câmera ausente (`NotFoundError`) exibe mensagem equivalente amigável.
  - [ ] Input manual fica visível e focado após erro de câmera.
  - [ ] Sem erro não tratado no console após permissão negada.

  **Estratégia de teste:**
  - [ ] Unitário: mock de `getUserMedia` rejeitando com `NotAllowedError` — confirmar `onError` chamado com mensagem correta
  - [ ] Unitário: mock rejeitando com `NotFoundError` — mesma verificação
  - [ ] Regressão: form funciona normalmente quando câmera disponível e permitida

  **Dependências:** UX-008
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-010

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Mapeamento de erros implementado em `qr-scanner.tsx`.
  - [ ] Mensagem de erro exibida em `checkin-form.tsx`.
  - [ ] Testes unitários passando.

---

#### QR.10 — Teste de Integração QR

- [ ] **UX-010** — Teste: QR code gerado por `TicketQR` é lido corretamente pelo `QrScanner`

  **Modo recomendado:** frontend
  **Tipo:** test

  **Descrição curta:**
  - Criar teste de integração que gera um QR code usando o componente/utilitário `TicketQR` existente, captura o `ImageData` resultante e verifica que `jsQR` decodifica o mesmo código original.
  - Garante que o pipeline completo `TicketQR → imagem → jsQR → código` funciona sem perda de dados.

  **Contexto mínimo:**
  - `TicketQR` gera um QR code para um dado código de ingresso (ex.: UUID).
  - O teste deve usar `jsQR` diretamente (sem browser real) via mock de canvas ou biblioteca de geração QR em Node.
  - Se `TicketQR` depende do browser para renderizar, usar `qrcode` (npm) para gerar o `ImageData` programaticamente no teste.

  **Implementação sugerida:**
  - Instalar `qrcode` como devDependency se necessário para geração de QR no ambiente de teste.
  - Gerar QR code em `Buffer`/`ImageData` para um código fixo (ex.: `"TICKET-UUID-001"`).
  - Chamar `jsQR(imageData.data, imageData.width, imageData.height)`.
  - Confirmar que `result.data === "TICKET-UUID-001"`.
  - Criar em `tests/unit/features/checkin/qr-roundtrip.test.ts`.

  **Arquivos/áreas afetadas:**
  - `tests/unit/features/checkin/qr-roundtrip.test.ts` (novo)

  **Critérios de aceitação:**
  - [ ] Teste gera QR code para código fixo e confirma que `jsQR` retorna o mesmo código.
  - [ ] Teste passa em ambiente Node (sem browser real).
  - [ ] Teste falha se `jsQR` retornar `null` ou código diferente.

  **Estratégia de teste:**
  - [ ] Integração: `qrcode` → `ImageData` → `jsQR` → resultado esperado

  **Dependências:** UX-008
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** UX-009

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Teste criado em `tests/unit/features/checkin/qr-roundtrip.test.ts`.
  - [ ] Teste passando no runner de testes.
  - [ ] Sem dependência de browser real.

---

### Migration Gate — Auditoria de Portabilidade e Aprovação Formal

#### Objetivo
Garantir que as sprints 014–016 não introduziram acoplamentos novos ao Vinext/Cloudflare Workers nos módulos de domínio e aplicação, e formalizar a aprovação de portabilidade antes de iniciar a migração para NestJS (Sprint 018). Esta categoria é o gate bloqueante da fase e deve ser concluída por último — após UX Polish e QR Scanner estarem prontos — para garantir que o resultado da auditoria reflete o estado final da base de código da Sprint 017.

#### Escopo da categoria
- Execução do checklist `migration-portability.md` auditando sprints 014–016.
- Criação de 3 smoke scripts E2E cobrindo os fluxos críticos.
- Atualização de `MIGRATION-PLAN.md` com estado pós-features.
- Criação de `MIGRATION-GATE.md` com evidências e aprovação formal.
- Aprovação formal (checkbox `[x] Aprovado para Sprint 018`).

#### Riscos da categoria
- Auditoria pode revelar acoplamento introduzido nas sprints 014–016, exigindo refactor antes da aprovação — o que pode atrasar o gate e, por consequência, a Sprint 018.
- Smoke scripts dependem do servidor local em execução e de dados de seed corretos; falhas de ambiente não devem ser confundidas com falhas de negócio.

---

#### GATE.1 — Auditoria de Portabilidade

- [ ] **GATE-001** — Executar checklist `migration-portability.md` auditando módulos introduzidos nas sprints 014–016

  **Modo recomendado:** architecture
  **Tipo:** docs

  **Descrição curta:**
  - Executar o checklist completo de `.agents-os/SKILLS/migration-portability.md` focado nos módulos criados ou modificados nas sprints 014–016: payment, email, novos use-cases e handlers.
  - Verificar que zero dependências de Vinext/Cloudflare Workers vazaram para `src/server/payment/`, `src/server/email/` ou novos use-cases.
  - Registrar o resultado (aprovado / pendência + módulo) para usar em GATE-004.

  **Contexto mínimo:**
  - `npm run lint:architecture` deve retornar zero violações.
  - Inspeção manual de imports é necessária além do lint automatizado, pois alguns acoplamentos podem estar em configurações ou variáveis de ambiente.
  - Módulos alvo: `src/server/payment/`, `src/server/email/`, use-cases criados nas sprints 014–016.

  **Implementação sugerida:**
  - Executar `npm run lint:architecture` e registrar output.
  - Inspecionar manualmente todos os `import` em `src/server/payment/` e `src/server/email/` procurando por: `@cloudflare/workers-types`, `hono`, variáveis `env.` de Workers, `ExecutionContext`.
  - Verificar use-cases novos em `src/server/application/` da mesma forma.
  - Se encontrar acoplamento: criar sub-task de refactor e não aprovar o gate até resolvido.
  - Documentar resultado em tabela no `MIGRATION-GATE.md` (criado em GATE-004).

  **Arquivos/áreas afetadas:**
  - Leitura: `src/server/payment/`, `src/server/email/`, `src/server/application/` (sprints 014–016)
  - Escrita: evidências serão usadas em `docs/development/MIGRATION-GATE.md`

  **Critérios de aceitação:**
  - [ ] `npm run lint:architecture` retorna zero violações.
  - [ ] Inspeção manual de imports em `src/server/payment/` e `src/server/email/` concluída.
  - [ ] Zero acoplamentos ao Vinext/Cloudflare Workers encontrados nos módulos auditados (ou pendências documentadas e resolvidas).
  - [ ] Resultado da auditoria registrado (aprovado ou lista de pendências).

  **Estratégia de teste:**
  - [ ] Arquitetural: `npm run lint:architecture`
  - [ ] Manual: inspeção de imports nos módulos alvo

  **Dependências:** Nenhuma (pode iniciar após discovery)
  **Bloqueia:** GATE-004, GATE-005
  **Pode rodar em paralelo com:** UX-005, UX-006, UX-007 (lote mobile pass)

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Lint arquitetural executado sem violações.
  - [ ] Inspeção manual concluída.
  - [ ] Resultado documentado e pronto para inclusão no MIGRATION-GATE.md.

---

#### GATE.2 — Smoke Scripts E2E

- [ ] **GATE-002** — Criar 3 smoke scripts cobrindo compra completa, check-in e criação de evento no admin

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Criar três scripts TypeScript em `scripts/smoke/` que fazem chamadas HTTP ao servidor local e validam os fluxos críticos ponta a ponta.
  - Cada script deve: (1) executar o fluxo completo via chamadas HTTP, (2) verificar respostas esperadas, (3) retornar exit code 0 em sucesso e exit code 1 com mensagem descritiva em falha.
  - Os scripts cobrem: `purchase-flow.ts` (compra com pagamento simulado), `checkin-flow.ts` (check-in de ingresso), `admin-flow.ts` (criação de evento pelo admin).

  **Contexto mínimo:**
  - Scripts rodam via `tsx scripts/smoke/purchase-flow.ts` com servidor local em execução (`npm run dev`).
  - Autenticação nos fluxos protegidos deve ser feita com credenciais de seed/teste.
  - Não usar browser — apenas chamadas HTTP (`fetch` ou `node-fetch`).
  - Pagamento simulado: usar endpoint de simulação existente ou mock de Stripe webhook.

  **Implementação sugerida:**
  - Criar `scripts/smoke/helpers/http.ts` com função `apiCall(method, path, body?, token?)` reutilizável.
  - `purchase-flow.ts`:
    1. Buscar evento publicado disponível (`GET /api/events`).
    2. Criar pedido (`POST /api/orders`).
    3. Simular pagamento (`POST /api/payments/simulate` ou equivalente).
    4. Verificar que ingresso foi gerado (`GET /api/tickets`).
  - `checkin-flow.ts`:
    1. Buscar ingresso válido criado no purchase-flow.
    2. Realizar check-in (`POST /api/checkin`).
    3. Verificar status atualizado para `used`.
    4. Tentar check-in duplo — esperar erro 422.
  - `admin-flow.ts`:
    1. Autenticar como admin.
    2. Criar evento (`POST /api/admin/events`).
    3. Publicar evento (`PATCH /api/admin/events/:id/publish`).
    4. Verificar evento disponível na listagem pública.

  **Arquivos/áreas afetadas:**
  - `scripts/smoke/purchase-flow.ts` (novo)
  - `scripts/smoke/checkin-flow.ts` (novo)
  - `scripts/smoke/admin-flow.ts` (novo)
  - `scripts/smoke/helpers/http.ts` (novo)

  **Critérios de aceitação:**
  - [ ] `purchase-flow.ts` retorna exit code 0 com servidor local rodando e dados de seed presentes.
  - [ ] `checkin-flow.ts` realiza check-in e confirma bloqueio de check-in duplo.
  - [ ] `admin-flow.ts` cria e publica evento e confirma visibilidade na listagem pública.
  - [ ] Todos os scripts retornam exit code 1 com mensagem descritiva quando o servidor não está disponível.
  - [ ] Nenhum script usa browser ou Playwright — apenas HTTP.

  **Estratégia de teste:**
  - [ ] Smoke: executar scripts contra servidor local
  - [ ] Regressão: scripts devem passar após qualquer deploy

  **Dependências:** Nenhuma (independente das tasks de UX)
  **Bloqueia:** GATE-004
  **Pode rodar em paralelo com:** GATE-003, UX-005, UX-006, UX-007

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Três scripts criados com helper compartilhado.
  - [ ] Scripts passando contra servidor local com dados de seed.
  - [ ] Falha descritiva em exit code 1 testada.

  **Notas adicionais:**
  - Adicionar `"smoke": "tsx scripts/smoke/purchase-flow.ts && tsx scripts/smoke/checkin-flow.ts && tsx scripts/smoke/admin-flow.ts"` ao `package.json` scripts.

---

#### GATE.3 — Atualizar MIGRATION-PLAN.md

- [ ] **GATE-003** — Atualizar `docs/development/MIGRATION-PLAN.md` com seção "Estado atual pós-features" cobrindo módulos 014–016

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - Adicionar seção "Estado atual pós-sprints 014–016" ao `MIGRATION-PLAN.md` descrevendo os novos módulos (payment, email) e sua portabilidade confirmada para NestJS.
  - A seção deve mapear cada módulo novo para a camada de destino na arquitetura NestJS futura.

  **Contexto mínimo:**
  - `MIGRATION-PLAN.md` já existe com estado anterior às sprints 014–016.
  - A atualização não deve remover informação existente — apenas adicionar a nova seção.
  - As informações de portabilidade devem ser baseadas nos resultados de GATE-001.

  **Implementação sugerida:**
  - Adicionar seção "## Estado atual pós-sprints 014–016" ao final do arquivo (antes de qualquer seção de conclusão existente).
  - Para cada módulo novo: nome do módulo, localização atual (`src/server/payment/`), dependências externas, status de portabilidade (confirmado/pendente), destino na arquitetura NestJS (ex.: `PaymentModule` em `src/modules/payment/`).
  - Incluir tabela de mapeamento: Módulo atual → Módulo NestJS destino.

  **Arquivos/áreas afetadas:**
  - `docs/development/MIGRATION-PLAN.md` (atualizado)

  **Critérios de aceitação:**
  - [ ] Seção adicionada descrevendo módulos de payment e email das sprints 014–016.
  - [ ] Tabela de mapeamento para arquitetura NestJS incluída.
  - [ ] Status de portabilidade baseado em GATE-001.
  - [ ] Documento existente não modificado (apenas adições).

  **Estratégia de teste:**
  - [ ] Revisão: documento legível e sem contradições com seções anteriores

  **Dependências:** GATE-001 (portabilidade confirmada)
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** GATE-002

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Seção adicionada ao `MIGRATION-PLAN.md`.
  - [ ] Tabela de mapeamento presente.
  - [ ] Revisão de consistência concluída.

---

#### GATE.4 — Criar MIGRATION-GATE.md

- [ ] **GATE-004** — Criar `docs/development/MIGRATION-GATE.md` com resultado da auditoria, evidências e decisões

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - Criar o documento `docs/development/MIGRATION-GATE.md` contendo o resultado formal da auditoria de portabilidade, evidências coletadas (output do lint, resultado dos smoke scripts), decisões tomadas e o checkbox de aprovação para Sprint 018.
  - Este documento é o artefato oficial de gate — sem ele criado e aprovado, Sprint 018 não pode ser iniciada.

  **Contexto mínimo:**
  - O documento deve ser autocontido: alguém que leia apenas o `MIGRATION-GATE.md` deve entender o que foi auditado, o que foi encontrado e qual a decisão.
  - O checkbox de aprovação (`[ ] Aprovado para Sprint 018`) é marcado em GATE-005, após revisão final.

  **Implementação sugerida:**
  - Estrutura do documento:
    - `## Contexto`: o que é este gate e por que existe.
    - `## Módulos auditados`: tabela com módulo, localização, dependências externas, status de portabilidade.
    - `## Evidências`: output do `npm run lint:architecture`, resultado dos smoke scripts (exit codes).
    - `## Decisões`: decisões de design ou refactor tomadas durante a auditoria.
    - `## Aprovação formal`: checkbox `[ ] Aprovado para Sprint 018` com data e responsável.
  - Preencher todas as seções com base nos resultados de GATE-001 e GATE-002.

  **Arquivos/áreas afetadas:**
  - `docs/development/MIGRATION-GATE.md` (novo)

  **Critérios de aceitação:**
  - [ ] Documento criado com todas as seções preenchidas (sem placeholders).
  - [ ] Tabela de módulos auditados completa.
  - [ ] Evidências de lint e smoke scripts incluídas.
  - [ ] Checkbox `[ ] Aprovado para Sprint 018` presente (será marcado em GATE-005).

  **Estratégia de teste:**
  - [ ] Revisão: documento sem campos vazios ou genéricos
  - [ ] Revisão: checkbox presente e formatado corretamente para marcar em GATE-005

  **Dependências:** GATE-001, GATE-002
  **Bloqueia:** GATE-005
  **Pode rodar em paralelo com:** Nenhuma (requer evidências de GATE-001 e GATE-002)

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] `MIGRATION-GATE.md` criado com todas as seções preenchidas.
  - [ ] Evidências de auditoria incluídas.
  - [ ] Pronto para aprovação formal em GATE-005.

---

#### GATE.5 — Aprovação Formal do Gate

- [ ] **GATE-005** — Aprovação formal: marcar `[x] Aprovado para Sprint 018` no `MIGRATION-GATE.md`

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - Revisar o `MIGRATION-GATE.md` completo, confirmar que todos os critérios de auditoria foram atendidos, todos os smoke scripts passam e nenhuma pendência está aberta.
  - Marcar o checkbox `[x] Aprovado para Sprint 018` com data de aprovação e nome do responsável.
  - Este é o ato final que desbloqueia a Sprint 018.

  **Contexto mínimo:**
  - Todos os itens de GATE-001 a GATE-004 devem estar concluídos antes desta task.
  - Todos os critérios de sucesso da Sprint 017 (seção 4 do SPRINT-017.md) devem estar atendidos.
  - A aprovação é um ato consciente — não apenas um checkbox técnico, mas uma confirmação de que a base está pronta para migração.

  **Implementação sugerida:**
  - Revisar `MIGRATION-GATE.md` linha a linha.
  - Confirmar: zero acoplamentos, smoke scripts passando, `MIGRATION-PLAN.md` atualizado.
  - Alterar `[ ] Aprovado para Sprint 018` para `[x] Aprovado para Sprint 018 — Aprovado em 2026-04-01 por @jeandias`.
  - Commit com mensagem: `docs: approve migration gate for Sprint 018`.

  **Arquivos/áreas afetadas:**
  - `docs/development/MIGRATION-GATE.md` (checkbox marcado)

  **Critérios de aceitação:**
  - [ ] GATE-001 a GATE-004 concluídos.
  - [ ] Todos os smoke scripts passando (exit code 0).
  - [ ] `npm run lint:architecture` sem violações.
  - [ ] Checkbox `[x] Aprovado para Sprint 018` marcado com data e responsável.
  - [ ] Sprint 018 formalmente desbloqueada.

  **Estratégia de teste:**
  - [ ] Revisão final: todos os critérios de sucesso do SPRINT-017.md atendidos

  **Dependências:** GATE-001, GATE-002, GATE-003, GATE-004
  **Bloqueia:** Sprint 018 (gate bloqueante)
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 30min
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Checkbox `[x] Aprovado para Sprint 018` marcado.
  - [ ] Commit de aprovação criado.
  - [ ] Sprint 018 pode ser iniciada.

---

## Testes e Validações

- **Suites necessárias:** Jest/Vitest (unitários), integração (smoke scripts HTTP), inspeção manual de lint arquitetural
- **Cobertura alvo:** 100% dos componentes novos (skeleton, error boundary, QrScanner) com testes unitários; 3 fluxos críticos cobertos por smoke scripts
- **Comandos de verificação:**
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run lint`
  - `npm run lint:architecture`
  - `npm run build`
  - `tsx scripts/smoke/purchase-flow.ts`
  - `tsx scripts/smoke/checkin-flow.ts`
  - `tsx scripts/smoke/admin-flow.ts`
- **Estado atual:** ⏳ Parcial — fase não iniciada
- **Fluxos críticos a validar manualmente:**
  - Skeleton aparece e desaparece corretamente em `/eventos/[slug]` com conexão lenta
  - Error boundary exibe fallback amigável ao forçar erro em componente filho
  - QR scanner no `/checkin` via câmera do celular em HTTPS/localhost
  - Checkout e "Meus Ingressos" sem overflow horizontal em 375px
  - Smoke scripts passando com saída de log descritiva

---

## Riscos, Bloqueios e Decisões

### Bloqueios atuais
- Sprint 018 bloqueada até GATE-005 concluído — nenhum trabalho de migração pode ser iniciado antes.
- `jsQR` não instalado ainda — instalar antes de iniciar UX-008.

### Riscos em aberto
- MediaDevices API requer HTTPS ou `localhost`; em ambiente HTTP simples, `getUserMedia` não está disponível — QR scanner retornará `null` silenciosamente (comportamento esperado de fallback).
- Auditoria de portabilidade (GATE-001) pode revelar acoplamentos introduzidos nas sprints 014–016, exigindo refactor antes da aprovação do gate e potencialmente atrasando o início da Sprint 018.
- Service worker de PWA (UX-006) pode causar cache indesejado se não for configurado com exclusões explícitas para rotas de API dinâmicas.
- Smoke scripts dependem de dados de seed corretos; ambiente local sem seed não constituirá falha de negócio — documentar pré-condição nos scripts.

### Decisões importantes
- `jsQR` escolhido sobre outras alternativas (ZXing, QuaggaJS) por ser lightweight, sem dependências nativas e com API simples para uso com canvas — decisão revisável se performance for insuficiente em mobile.
- Sonner preferido sobre shadcn/ui toast por API mais simples para Server Actions e menor boilerplate; se já houver shadcn/ui toast configurado, usar o existente.
- Gate de migração (GATE-005) é o único artefato que pode desbloquear Sprint 018 — nenhuma exceção. Qualquer pendência de portabilidade deve ser resolvida dentro da Sprint 017 ou formalmente documentada como dívida técnica aceita com plano de resolução em Sprint 018.
- Skeleton screens usam o componente `Skeleton` do shadcn/ui se disponível, para consistência visual com o design system existente.

---

## Documentação e Comunicação

- [ ] Atualizar `docs/development/TASKS.md` com referência a esta fase.
- [ ] Atualizar `docs/development/CHANGELOG.md` ao concluir cada categoria de tasks.
- [ ] Atualizar `docs/development/MIGRATION-PLAN.md` (GATE-003).
- [ ] Criar `docs/development/MIGRATION-GATE.md` (GATE-004).
- [ ] Registrar resultado da auditoria de portabilidade no MIGRATION-GATE.md.
- [ ] Registrar decisão de escolha de `jsQR` e `sonner` como dívida de docs se necessário.

---

## Checklist de Encerramento da Fase

- [ ] Todas as 15 tarefas concluídas ou formalmente replanejadas.
- [ ] Skeleton screens implementados e testados nas quatro rotas alvo.
- [ ] Error boundaries com mensagens em português nos cinco layouts principais.
- [ ] Toast notifications funcionando para checkout e check-in.
- [ ] Loading states (spinner) nos botões de submit de checkout e checkin.
- [ ] Checkout, "Meus Ingressos" e Check-in validados em 375px sem overflow.
- [ ] `public/manifest.json` e service worker básico presentes.
- [ ] QR scanner funcional com fallback para input manual.
- [ ] Tratamento de permissão negada com mensagem amigável.
- [ ] Teste de integração QR roundtrip passando.
- [ ] `npm run lint:architecture` sem violações.
- [ ] Três smoke scripts passando (`purchase-flow`, `checkin-flow`, `admin-flow`).
- [ ] `docs/development/MIGRATION-PLAN.md` atualizado com estado pós-sprints 014–016.
- [ ] `docs/development/MIGRATION-GATE.md` criado com todas as seções preenchidas.
- [ ] **`[x] Aprovado para Sprint 018` marcado no `MIGRATION-GATE.md` — gate obrigatório.**
- [ ] Testes unitários e de integração passando (`npm run test:unit && npm run test:integration`).
- [ ] `npm run build` sem erros.
- [ ] Revisão de arquitetura realizada: sem nova violação de camada introduzida.
- [ ] Changelog atualizado.
- [ ] GOV closure criado.
