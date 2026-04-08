# Integrations

**Analysis Date:** 2025-01-31

## External Services

### Payment — Stripe
- **SDK:** `stripe ^18.5.0`
- **Purpose:** Checkout session creation, payment confirmation, payment failure handling
- **Implementation:** `src/server/payment/stripe.payment-provider.ts`
  - Creates Stripe Checkout sessions in BRL (`currency: "brl"`)
  - Attaches `orderId`, `customerId`, `eventId` to session and payment_intent metadata
  - Validates incoming webhook signatures via `stripe.webhooks.constructEvent`
- **Payment mode toggle:** `PAYMENT_MODE` env var (`demo` = internal simulation, `stripe` = real Stripe API)
- **Demo/simulation flow:** `src/app/checkout/simulate/page.tsx` + `src/app/api/orders/[id]/simulate-payment/route.ts`
- **Auth env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Email — Resend
- **SDK:** `resend ^4.8.0`
- **Purpose:** Transactional emails (order confirmation + 24h event reminders)
- **Implementation:** `src/server/email/resend.email-provider.ts`
  - Sends HTML emails built from internal templates
  - Retry logic: 3 attempts with exponential backoff (1s → 2s → 4s)
  - Graceful degradation: if `RESEND_API_KEY` or `EMAIL_FROM` missing, logs warning and skips sending
- **Email templates:** `src/server/email/templates/`
  - `order-confirmation.template.ts` — sent after successful payment via Stripe webhook
  - `event-reminder.template.ts` — sent 24h before event via hourly cron
- **Auth env vars:** `RESEND_API_KEY`, `EMAIL_FROM`

### Database — Neon PostgreSQL
- **SDK:** `@neondatabase/serverless ^1.0.2`
- **Purpose:** Primary relational data store (events, orders, tickets, lots, coupons, users)
- **Transport modes:**
  - HTTP (`neon()`) — stateless, used for Better Auth and non-transactional reads
  - WebSocket (`Pool`) — persistent, used where `db.transaction()` is required
- **Client factory:** `src/server/infrastructure/db/client.ts`
- **Auth env vars:** `DATABASE_URL`, `TEST_DATABASE_URL` (separate branch for integration tests)

### Authentication — Better Auth
- **SDK:** `better-auth ^1.5.6`
- **Purpose:** Session management, email+password auth, user roles
- **Implementation:** `src/server/infrastructure/auth/auth.config.ts`
- **Auth env vars:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

### Deployment — Cloudflare Workers
- **SDK/Plugin:** `@cloudflare/vite-plugin ^1.30.3`
- **CLI:** `wrangler` (via `wrangler.toml`)
- **Purpose:** Serverless edge deployment, static asset serving, cron scheduling
- **Bindings used in worker:**
  - `ASSETS` — static file serving from `dist/client/`
  - `IMAGES` — Cloudflare Images for image optimization (`/_vinext/image` route)
  - Env vars injected as Worker bindings: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `TEST_DATABASE_URL`
- **Cron:** `0 * * * *` (hourly) — triggers `POST /api/cron/event-reminders`

## APIs & Webhooks

### Webhook — Stripe (`POST /api/webhooks/stripe`)
- **Handler:** `src/app/api/webhooks/stripe/route.ts`
- **Events handled:**
  - `checkout.session.completed` → confirms order payment, generates tickets, sends order confirmation email
  - `payment_intent.payment_failed` → cancels order and restores lot stock
- **Signature verification:** `stripe-signature` header validated via `stripe.webhooks.constructEvent`

### Cron Endpoint (`POST /api/cron/event-reminders`)
- **Handler:** `src/app/api/cron/event-reminders/route.ts`
- **Trigger:** Cloudflare Scheduled Worker (hourly)
- **Auth:** `Authorization: Bearer <CRON_SECRET>` header (env var `CRON_SECRET`)
- **Behavior:** Queries events starting 23–25h from now, sends reminder emails to all ticket holders

### Auth API (`/api/auth/[...all]`)
- **Handler:** `src/app/api/auth/[...all]/route.ts`
- **Backed by:** better-auth catch-all handler
- **Endpoints:** sign-up, sign-in, sign-out, session management (all managed by better-auth)

### REST API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/events` | GET, POST | List events / create event |
| `/api/events/[slug]` | GET | Get single event |
| `/api/events/[slug]/orders` | GET | List event orders (organizer) |
| `/api/events/[slug]/analytics` | GET | Event analytics |
| `/api/events/publish` | POST | Publish event |
| `/api/events/update-status` | POST | Update event status |
| `/api/lots` | POST | Create lot |
| `/api/lots/[id]` | PATCH, DELETE | Update/delete lot |
| `/api/orders` | POST | Create order |
| `/api/orders/mine` | GET | Get current user's orders |
| `/api/orders/[id]/simulate-payment` | POST | Simulate payment (demo mode) |
| `/api/coupons/create` | POST | Create coupon |
| `/api/coupons/update` | POST | Update coupon |
| `/api/checkin` | POST | Validate check-in QR code |

## Third-Party Libraries (Notable)

| Library | Version | Usage |
|---------|---------|-------|
| `zod ^4.3.6` | schema validation | All API input schemas in `src/server/api/schemas/` |
| `qrcode ^1.5.4` | QR generation | Ticket QR codes (`src/features/tickets/qr-client.ts`) |
| `jsqr ^1.4.0` | QR scanning | Check-in scanner (`src/features/checkin/qr-scanner.tsx`) |
| `sonner ^2.0.7` | toast UI | Global toaster in `src/app/layout.tsx` |
| `next/font/google` | web fonts | Geist Sans + Geist Mono loaded server-side |
| `react-server-dom-webpack ^19.2.4` | RSC | React Server Components webpack integration (dev dependency) |

## Environment Variables (Discovered)

All variables discovered via `grep -r "process.env."` in `src/` and confirmed in `.env.example`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (main) |
| `TEST_DATABASE_URL` | Integration tests only | Separate Neon branch for integration test isolation |
| `BETTER_AUTH_SECRET` | Yes | better-auth session signing secret |
| `BETTER_AUTH_URL` | Yes | Base URL for auth cookie domain (server-side) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL (client-side, Stripe redirect URLs) |
| `STRIPE_SECRET_KEY` | When `PAYMENT_MODE=stripe` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | When `PAYMENT_MODE=stripe` | Stripe webhook signing secret |
| `RESEND_API_KEY` | For email sending | Resend API key |
| `EMAIL_FROM` | For email sending | Verified sender address (e.g. `ingressos@77ticket.com`) |
| `CRON_SECRET` | Yes (production) | Bearer token for cron endpoint authorization |
| `PAYMENT_MODE` | No (defaults to `demo`) | `demo` or `stripe` |
| `NODE_ENV` | Standard | Environment detection |

**Secrets storage:** Injected as Cloudflare Worker environment bindings in production; `.env` file locally. Worker syncs bindings to `process.env` in `worker/index.ts` via `syncProcessEnvFromBindings()`.

---

*Integration audit: 2025-01-31*
