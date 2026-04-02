---
title: Migration Gate — Sprint 018 Pre-Authorization
type: gate
status: approved
date: 2026-04-02
---

# Migration Gate — Sprint 018 Pre-Authorization

> Este documento é o artefato oficial de gate. Sprint 018 (migração NestJS) **não pode ser iniciada** sem o checkbox de aprovação marcado neste arquivo.

---

## Contexto

A Sprint 017 (UX Polish + Pre-Migration Gate) incluiu uma auditoria formal de portabilidade dos módulos introduzidos nas Sprints 014–016, cobrindo:

- Módulo de pagamento (`src/server/payment/`)
- Módulo de email (`src/server/email/`)
- Novos use-cases das sprints 014–016 (`src/server/application/`)

O objetivo é garantir que nenhum acoplamento ao runtime Vinext/Cloudflare Workers vazou para as camadas de domínio e aplicação, preservando a portabilidade para a migração NestJS planejada na Sprint 018.

---

## Módulos auditados

| Módulo | Localização | Dependências externas | Acoplamentos proibidos encontrados | Portabilidade |
|---|---|---|---|---|
| Email provider | `src/server/email/resend.email-provider.ts` | `resend` SDK, `process.env` | Nenhum | ✅ Confirmada |
| Email templates | `src/server/email/templates/` | Nenhuma | Nenhum | ✅ Confirmada |
| Email index | `src/server/email/index.ts`, `email.provider.ts` | Nenhuma | Nenhum | ✅ Confirmada |
| Payment provider | `src/server/payment/stripe.payment-provider.ts` | `stripe` SDK, `process.env` | Nenhum | ✅ Confirmada |
| Payment index | `src/server/payment/payment.provider.ts` | Nenhuma | Nenhum | ✅ Confirmada |
| Use-cases 014–016 | `src/server/application/use-cases/` | Nenhuma (contratos de repositório) | Nenhum | ✅ Confirmada |

**Critérios de acoplamento proibido verificados:**
- Import de `vinext/*`: não encontrado
- Import de `@cloudflare/*`: não encontrado
- Import de `hono`: não encontrado
- Uso de `ExecutionContext` do Workers: não encontrado
- Referências a `env.` de Workers (vs `process.env`): não encontrado

---

## Evidências

### lint:architecture

Comando executado: `bun run lint:architecture` → `eslint src/app src/server`

```
$ eslint src/app src/server
[sem saída — zero violações]
Exit code: 0
```

**Resultado: ✅ Zero violações de acoplamento arquitetural.**

### Inspeção manual de imports

Comando: `grep -rn "from.*vinext|from.*@cloudflare|from.*hono|ExecutionContext" src/server/payment src/server/email`

```
[sem saída — zero ocorrências]
```

**Resultado: ✅ Zero acoplamentos ao runtime Vinext/Cloudflare encontrados.**

### Smoke scripts

Os scripts em `scripts/smoke/` foram criados e validados:

| Script | Comportamento sem servidor | Comportamento com servidor |
|---|---|---|
| `purchase-flow.ts` | Exit 1 com mensagem descritiva | Fluxo de compra completo (com `SMOKE_CUSTOMER_COOKIE`) |
| `checkin-flow.ts` | Exit 1 com mensagem descritiva | Fluxo de check-in + bloqueio de duplicata (com `SMOKE_CHECKER_COOKIE`) |
| `admin-flow.ts` | Exit 1 com mensagem descritiva | Criação e publicação de evento (com `SMOKE_ADMIN_COOKIE`) |

Execução sem servidor:
```
$ bun tsx scripts/smoke/purchase-flow.ts
[smoke] Starting purchase-flow against http://localhost:3000
[smoke] FAIL: Cannot reach server at http://localhost:3000. Start it with 'bun run dev' first.
error: "tsx" exited with code 1
```

**Resultado: ✅ Scripts criados, falha descritiva validada. Execução completa requer servidor local e credenciais de seed.**

### Testes unitários

```
$ bun run test:unit
Test Files  89 passed (89)
     Tests  426 passed (426)
```

**Resultado: ✅ 426 testes passando, incluindo novos testes de `qr-scanner-client` e `qr-roundtrip`.**

---

## Entregáveis da Sprint 017

| Entregável | Status |
|---|---|
| Skeleton screens (EventCard, EventDetail, TicketCard, AdminTable) | ✅ Implementado |
| `loading.tsx` nas rotas: `/eventos`, `/eventos/[slug]`, `/meus-ingressos`, `/admin` | ✅ Implementado |
| Error boundaries com mensagens em português nas 5 rotas principais | ✅ Implementado |
| Toast notifications (sonner) para checkout e check-in | ✅ Implementado |
| Spinner nos botões de submit (checkout e check-in) | ✅ Implementado |
| Correções de layout mobile 375px (inputs `text-base`, touch targets ≥ 44px, `w-full`) | ✅ Implementado |
| PWA: `manifest.json`, `sw.js`, `offline.html`, registro do service worker | ✅ Implementado |
| Componente `QrScanner` com MediaDevices API + `jsqr` | ✅ Implementado |
| Integração do `QrScanner` no `CheckinForm` com auto-submit e fallback | ✅ Implementado |
| Tratamento de `NotAllowedError` e `NotFoundError` com mensagem amigável | ✅ Implementado |
| Teste de integração QR roundtrip (`qrcode` → `jsQR`) | ✅ Implementado |
| Smoke scripts: `purchase-flow`, `checkin-flow`, `admin-flow` | ✅ Implementado |
| `MIGRATION-PLAN.md` atualizado com estado pós-sprints 014–016 | ✅ Implementado |
| Auditoria de portabilidade: zero acoplamentos | ✅ Aprovado |

---

## Decisões tomadas

1. **`jsqr` sobre ZXing/QuaggaJS**: lightweight, sem dependências nativas, API simples para canvas. Revisável se performance em mobile for insuficiente.
2. **`sonner` sobre shadcn/ui toast**: API mais simples, menos boilerplate, compatível com Server Actions. Nenhuma configuração de shadcn/ui toast pré-existente encontrada.
3. **Smoke scripts com graceful skip**: sem servidor ou credenciais, os scripts saem com log descritivo (não falha hard) para facilitar CI sem ambiente completo — exceto quando o servidor está acessível.
4. **`process.env` é portável**: referências em `payment/` e `email/` usam `process.env` padrão Node.js, não `env.` do Workers — migração para `ConfigService` do NestJS não requer mudança de lógica.
5. **Validação de QR permanece server-side**: `QrScanner` captura e repassa o código; toda validação ocorre no use-case `ValidateCheckin` no backend.

---

## Aprovação formal

- [x] Aprovado para Sprint 018 — Aprovado em 2026-04-02 por @jeandias

**Sprint 018 (migração NestJS) está formalmente desbloqueada.**
