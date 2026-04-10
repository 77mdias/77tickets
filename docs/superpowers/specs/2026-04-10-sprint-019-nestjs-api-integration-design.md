---
title: Design — Vinext → NestJS API Integration (Sprint 019)
type: design-spec
status: draft
date: 2026-04-10
---

# Design: Vinext → NestJS API Integration

## 1. Contexto

O Vinext atualmente roda frontend e backend no mesmo processo Cloudflare Workers. Após a Sprint 018, existe um backend NestJS deployado no Render com todos os endpoints replicados. Esta sprint conecta os dois: o Vinext passa a ser exclusivamente runtime de apresentação, e todas as chamadas de API vão para o NestJS via HTTP.

### Estado atual
- **Frontend:** Vinext/Cloudflare Workers (Next.js app router) — frontend faz `fetch("/api/...")` para handlers internos
- **Backend interno:** `src/server/api/` (handlers), `src/server/application/` (use-cases), `src/server/repositories/` (Drizzle) → Neon DB
- **Backend externo:** `packages/backend/` (NestJS) — rodando no Render com CORS configurado para `FRONTEND_URL` com `credentials: true`
- **Auth:** Better Auth com cookie de sessão, `trustedOrigins` apontando para `BETTER_AUTH_URL`
- **Testes:** 514 integration tests + 126 unit test files + regression tests

### Problema
- Todas as 17 chamadas de API no frontend são same-origin — chamam handlers internos do Vinext
- Não existe `apiFetch`, `API_BASE_URL`, ou qualquer abstração HTTP para backend externo
- Cookies de sessão não funcionam cross-origin sem `SameSite=None; Secure`
- CORS precisa aceitar o domínio do Cloudflare Workers

### Objetivo
- Criar `apiFetch` como único ponto de saída HTTP para o NestJS
- Migrar todas as 17 chamadas de API para `apiFetch`
- Validar sessão cross-origin (cookie `__session` com `SameSite=None; Secure`)
- Remover handlers internos do Vinext após validação
- Configurar `API_BASE_URL` no `wrangler.toml` e `.dev.vars`

## 2. Arquitetura Proposta

### Fluxo pós-migração

```
Browser
  |
  | fetch("/api/auth/*") — Better Auth (ainda no Vinext para auth flows)
  | fetch via apiFetch("/api/events") — NestJS Render
  v
Cloudflare Worker (Vinext)
  |
  | apiFetch(path, options)
  |   → fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ... })
  |
  v
NestJS (Render)
  |
  | Controller → Use Case → Repository → Neon DB
  |
  v
Response JSON → apiFetch → Componente UI
```

### Auth flows
Better Auth endpoints (`/api/auth/sign-in/email`, `/api/auth/sign-up/email`, `/api/auth/get-session`) **permanecem no Vinext** durante esta sprint. O cookie de sessão gerado pelo Better Auth no Vinext precisa ser aceito pelo NestJS. Isso requer:
1. NestJS compartilhar a mesma configuração de cookies (mesmo `BETTER_AUTH_SECRET`)
2. Cookie `SameSite=None; Secure` para funcionar cross-origin
3. `trustedOrigins` no Better Auth incluindo domínio Cloudflare Workers

**Decisão:** Better Auth continua no Vinext como auth provider. NestJS valida sessões via Better Auth client SDK compartilhado (mesmo secret, mesma DB). Cookie cross-origin requer `SameSite=None; Secure` + HTTPS.

### API Client Design

```typescript
// src/lib/api-client.ts

interface ApiError extends Error {
  code: 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'server-error' | 'network-error';
  statusCode: number;
  details?: unknown;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseURL = process.env.API_BASE_URL;
  if (!baseURL) throw new Error('API_BASE_URL not configured');

  const url = `${baseURL}${path}`;
  
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await parseApiError(res);
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}
```

## 3. Abordagens Consideradas

### Abordagem A: apiFetch centralizado (Recomendada)
- **Prós:** Único ponto de controle, fácil de testar, fácil de fazer rollback, error handling consistente
- **Contras:** Requer refatorar 17+ chamadas de fetch distribuídas
- **Risco:** Baixo

### Abordagem B: Proxy/rewrite no Worker
- Criar um middleware no Worker que reescreve `fetch("/api/...")` para o NestJS automaticamente
- **Prós:** Não requer mudar chamadas existentes no frontend
- **Contras:** Mais complexo, difícil de debugar, acoplamento ao runtime do Worker, difícil de testar
- **Risco:** Médio

### Abordagem C: Híbrido — auth no Vinext, resto no NestJS
- Manter endpoints de auth + alguns endpoints críticos no Vinext, migrar o resto gradualmente
- **Prós:** Menor risco incremental
- **Contras:** Dupla manutenção temporária, inconsistência
- **Risco:** Médio

**Recomendação:** Abordagem A. `apiFetch` centralizado é mais simples, mais testável e segue o padrão do sprint doc.

## 4. Session Cross-Origin Strategy

### Problema
Cookies `SameSite=Lax` (padrão) não são enviados em requisições cross-origin. Precisa de `SameSite=None; Secure`.

### Solução
1. **No NestJS:** Better Auth config deve incluir `cookieOptions: { sameSite: 'none', secure: true }`
2. **No browser:** `credentials: 'include'` em todas as requisições `apiFetch`
3. **HTTPS obrigatório:** `SameSite=None` só funciona em HTTPS — em dev local, usar `cloudflared` ou `ngrok` para tunnel HTTPS, ou manter `SameSite=Lax` apenas em dev

### Configuração do Better Auth (compartilhada Vinext ↔ NestJS)
Ambos usam a mesma DB Neon e o mesmo `BETTER_AUTH_SECRET`. O cookie gerado pelo Vinext é válido no NestJS porque usam a mesma tabela de sessões.

## 5. Endpoints a Migrar

| Endpoint | Método | Origem (arquivo) | Auth? |
|----------|--------|-------------------|-------|
| `/api/events` | GET | `features/events/event-list.tsx` | Não |
| `/api/events/${slug}` | GET | `app/eventos/[slug]/page.tsx` | Não |
| `/api/orders/mine` | GET | `app/meus-ingressos/page.tsx` | Sim |
| `/api/orders` | POST | `features/checkout/checkout-form.tsx` | Sim |
| `/api/orders/${id}/simulate-payment` | POST | `app/checkout/simulate/page.tsx` | Sim |
| `/api/checkin` | POST | `features/checkin/checkin-form.tsx` | Sim |
| `/api/events` | POST | `features/admin/management-form.tsx` | Sim |
| `/api/lots` | POST | `features/admin/management-form.tsx` | Sim |
| `/api/lots/${id}` | PUT | `features/admin/management-form.tsx` | Sim |
| `/api/events/${eventId}/orders` | GET | `features/admin/management-form.tsx` | Sim |
| `/api/events/publish` | POST | `features/admin/management-form.tsx` | Sim |
| `/api/events/update-status` | POST | `features/admin/management-form.tsx` | Sim |
| `/api/coupons/create` | POST | `features/admin/management-form.tsx` | Sim |
| `/api/coupons/update` | POST | `features/admin/management-form.tsx` | Sim |
| `/api/events/${slug}/analytics` | GET | `features/admin/analytics-panel.tsx` | Sim |
| `/api/auth/sign-in/email` | POST | `features/auth/login-form.tsx` | Não (auth) |
| `/api/auth/sign-up/email` | POST | `features/auth/login-form.tsx` | Não (auth) |

**Decisão:** Auth endpoints (`/api/auth/*`) **NÃO** são migrados nesta sprint — permanecem no Vinext. O cookie de sessão gerado será usado pelo NestJS via `credentials: 'include'`.

## 6. Error Handling

```typescript
// Error shapes consistentes
interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Mapeamento de status → code
const errorMap: Record<number, ApiError['code']> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  500: 'server-error',
};
```

## 7. Test Strategy

| Tipo | O que testa | Como |
|------|------------|------|
| Unitário | `apiFetch` URL composition, credentials, error handling | Mock de `fetch` |
| Integração | CORS, session cookie, endpoints reais | NestJS local + Vitest |
| E2E Smoke | Fluxos ponta a ponta | `scripts/smoke/*.ts` |
| Regressão | Rotas públicas sem auth, auth flows | Testes existentes adaptados |

## 8. Arquivos a Criar/Modificar

### Criar
- `src/lib/api-client.ts` — `apiFetch` + error types
- `src/lib/api-client.test.ts` — testes unitários
- `.dev.vars` — `API_BASE_URL=http://localhost:3001`

### Modificar
- `wrangler.toml` — adicionar `[vars]` com `API_BASE_URL`
- `packages/backend/src/main.ts` — CORS para domínio Cloudflare Workers
- `packages/backend/src/auth/auth.config.ts` — `cookieOptions` para cross-origin (se existir; se não, criar)
- 17 arquivos de frontend que fazem `fetch("/api/...")` → substituir por `apiFetch`
- Integration tests — adaptar para chamar NestJS local em vez de handlers internos

### Remover (após validação)
- `src/app/api/` route files (exceto `/api/auth/*` e `/api/health`)
- `src/server/api/` handlers (exceto auth infrastructure)

## 9. Riscos e Mitigação

| Risco | Mitigação |
|-------|-----------|
| CORS bloqueando requests | Configurar antes de migrar chamadas; testar com browser real |
| Cookie de sessão não enviado cross-origin | `SameSite=None; Secure` + HTTPS obrigatório; fallback em dev com tunnel |
| NestJS indisponível causa falha no frontend | Error boundary no `apiFetch` com mensagem amigável |
| Handlers internos conflitando com NestJS | Remover handlers internos após validação de paridade |
| Integration tests quebrando | Adaptar tests para HTTP antes de remover handlers |
