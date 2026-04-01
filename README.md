# TicketFlow

TicketFlow is a ticketing platform demo with production-oriented architecture boundaries.

## Stack

- Runtime: Vinext
- Deployment target (demo): Cloudflare Workers
- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Validation: Zod
- UI: Tailwind CSS + shadcn/ui
- Testing: Vitest (unit, regression, integration)

## Architecture

Core flow:

`UI -> handler/route adapter -> use-case -> repository -> database`

Design goal: keep domain/application logic portable for future migration to `Next.js + NestJS`.

## Agent OS Guidance

Rules are layered:

1. user instruction
2. root `AGENTS.md`
3. local `AGENTS.md` files in scoped directories
4. repo skills in `.agents-os/SKILLS`
5. superpowers/process helpers

Start here:
- [`AGENTS.md`](./AGENTS.md)
- [`src/server/AGENTS.md`](./src/server/AGENTS.md)
- [`src/app/AGENTS.md`](./src/app/AGENTS.md)
- [`tests/AGENTS.md`](./tests/AGENTS.md)
- [`docs/development/agent-os-migration-summary.md`](./docs/development/agent-os-migration-summary.md)

## Getting Started

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build and run:

```bash
npm run build
npm run start
```

## Quality Commands

```bash
npm run lint
npm run lint:architecture
npm run test
npm run test:unit
npm run test:regression
npm run test:integration
npm run ci:quality
npm run security:audit
```

## CI/CD

- GitHub workflows are versioned under `.github/workflows/`:
  - `ci.yml` (quality + integration)
  - `security.yml` (CodeQL + secret scan + dependency audit)
  - `cd-workers.yml` (Cloudflare Workers preview/production with smoke test)
- Cloudflare first deploy runbook:
  - [`docs/infrastructure/runbooks/cloudflare-first-deploy.md`](./docs/infrastructure/runbooks/cloudflare-first-deploy.md)

## Database Commands

```bash
npm run db:generate
npm run db:migrate
```

> For integration tests, configure `TEST_DATABASE_URL` (recommended: dedicated Neon branch/database).
