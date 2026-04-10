# Changelog

## Sprint 019 — Vinext → NestJS API Integration (2026-04-10)

### Added
- `src/lib/api-client.ts` — `apiFetch` HTTP client with structured error handling (`ApiError` with codes: `unauthorized`, `forbidden`, `not-found`, `conflict`, `server-error`, `network-error`)
- `.dev.vars` — local development environment variables with `API_BASE_URL=http://localhost:3001`
- `tests/integration/api/cors.test.ts` — CORS configuration tests
- `packages/backend/src/common/cors.config.ts` — shared CORS configuration module
- `scripts/smoke/` updated for integrated stack (NestJS on port 3001)

### Changed
- **CORS**: NestJS now supports multiple origins via comma-separated `FRONTEND_URL` env var with exact-match security (no prefix vulnerabilities)
- **Session cookies**: Better Auth configured with `SameSite=None; Secure` in production for cross-origin compatibility
- **All frontend API calls** migrated from internal handlers to `apiFetch`:
  - Events: `event-list.tsx`, `eventos/[slug]/page.tsx`
  - Orders: `checkout-form.tsx`, `meus-ingressos/page.tsx`, `checkout/simulate/page.tsx`
  - Checkin: `checkin-form.tsx`
  - Admin: `management-form.tsx`, `analytics-panel.tsx`, `management-client.ts`
- Integration tests now target NestJS exclusively (23 files, 141 tests passing)

### Removed
- 14 internal API route handlers from `src/app/api/` (checkin, coupons, events, lots, orders)
- Direct `fetch("/api/...")` calls replaced by `apiFetch` throughout the frontend

### Infrastructure
- `wrangler.toml` configured with `[vars] API_BASE_URL` for dev, preview, and production environments
- Auth endpoints (`/api/auth/*`) remain in Vinext — session cookie shared cross-origin with NestJS
- Health, webhooks, and cron routes preserved in Vinext

### Architecture
```
Browser → Cloudflare Workers (Vinext) → apiFetch → NestJS (Render) → Neon PostgreSQL
                                            ↑
                                    Better Auth cookies
                                    (SameSite=None; Secure)
```

### Test Results
- Unit tests: 12 new `apiFetch` tests passing
- Integration tests: 23 files, 141 tests passing
- Smoke tests: configured for integrated stack (requires NestJS on port 3001)
