---
phase: gsap-scroll-reveal
plan: 05
type: execute
wave: 1
depends_on: [gsap-scroll-reveal-01]
files_modified:
  - src/app/meus-ingressos/page.tsx
autonomous: true
requirements:
  - ANIM-07

must_haves:
  truths:
    - "Meus Ingressos page header (h1 + subtitle + link) reveals as a single unit on load"
    - "Order article cards stagger-reveal with 0.1s gap as user views the list"
    - "Empty state section reveals as a single unit"
    - "Reduced motion: header and cards appear instantly"
  artifacts:
    - path: "src/app/meus-ingressos/page.tsx"
      provides: "My tickets page with RevealWrapper on header + stagger wrapper on order list"
      contains: "RevealWrapper"
  key_links:
    - from: "src/app/meus-ingressos/page.tsx"
      to: "src/components/reveal-wrapper.tsx"
      via: "<RevealWrapper as=\"header\"> and <RevealWrapper as=\"section\" childSelector=\"> article\">"
      pattern: "RevealWrapper"
---

<objective>
Apply scroll-reveal animations to the Meus Ingressos page (`/meus-ingressos`):
1. Page header (h1 "Meus Ingressos" + subtitle + "Ver eventos" link) reveals as one unit.
2. Order article list staggers each `<article>` (order card) with 0.1s gap.
3. Empty state section (dashed border panel) reveals as a single unit.

Purpose: The ticket list is a high-value page for returning users. Animated entry reinforces
the brand polish while keeping the experience lightweight.
Output: One modified server component file.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/gsap-scroll-reveal/CONTEXT.md
@src/app/meus-ingressos/page.tsx

<interfaces>
<!-- From PLAN-01 artifacts — use these directly -->

From src/components/reveal-wrapper.tsx:
```typescript
interface RevealWrapperProps extends ScrollRevealOptions {
  children: ReactNode;
  as?: ElementType;   // default: "div"
  className?: string;
  childSelector?: string;  // triggers stagger mode when provided
  stagger?: number;        // default: 0.1
}
export function RevealWrapper(props: RevealWrapperProps): JSX.Element
```

Current page structure (src/app/meus-ingressos/page.tsx):
```tsx
<main className="flex w-full max-w-6xl flex-col">
  <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-3xl font-semibold text-white">Meus Ingressos</h1>
      <p className="mt-1 text-sm text-zinc-400">...</p>
    </div>
    <Link href="/">Ver eventos</Link>
  </header>

  {orders.length === 0 ? (
    <section className="rounded-xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
      {/* empty state */}
    </section>
  ) : (
    <section className="grid gap-5">
      {orders.map((order) => (
        <article key={order.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
          {/* order card content */}
        </article>
      ))}
    </section>
  )}
</main>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wrap header and order list sections in RevealWrapper</name>
  <files>src/app/meus-ingressos/page.tsx</files>
  <action>
In `src/app/meus-ingressos/page.tsx`, import `RevealWrapper` and apply it to three elements:
1. The page `<header>` — single element reveal
2. The orders `<section className="grid gap-5">` — stagger on `> article` children
3. The empty state `<section>` — single element reveal

Add import at the top (after existing imports):
```tsx
import { RevealWrapper } from "@/components/reveal-wrapper";
```

Apply the wrappers as follows:

**Header** — replace raw `<header>` with RevealWrapper:
```tsx
<RevealWrapper
  as="header"
  className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
>
  <div>
    <h1 className="text-3xl font-semibold text-white">Meus Ingressos</h1>
    <p className="mt-1 text-sm text-zinc-400">
      Acompanhe seus pedidos e apresente o QR code no check-in.
    </p>
  </div>
  <Link
    className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
    href="/"
  >
    Ver eventos
  </Link>
</RevealWrapper>
```

**Empty state** — replace raw `<section>` with RevealWrapper:
```tsx
<RevealWrapper
  as="section"
  className="rounded-xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center"
>
  <h2 className="text-lg font-semibold text-white">Você ainda não possui ingressos</h2>
  <p className="mt-2 text-sm text-zinc-400">
    Escolha um evento publicado e conclua seu checkout para gerar tickets com QR code.
  </p>
</RevealWrapper>
```

**Order list** — replace raw `<section className="grid gap-5">` with stagger RevealWrapper:
```tsx
<RevealWrapper as="section" className="grid gap-5" childSelector="> article">
  {orders.map((order) => (
    <article key={order.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
      {/* all existing order card content unchanged */}
      <div className="mb-4 grid gap-1 text-sm text-zinc-300 sm:grid-cols-2">
        <p><strong className="text-white">Pedido:</strong> {order.id}</p>
        <p><strong className="text-white">Evento:</strong> {order.eventId}</p>
        <p><strong className="text-white">Status:</strong> {order.status}</p>
        <p><strong className="text-white">Total:</strong> {formatCurrency(order.totalInCents)}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {order.tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-lg border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Token</p>
            <p className="mt-1 break-all text-sm font-medium text-white">{ticket.token}</p>
            <p className="mt-1 text-sm text-zinc-300">
              Status: <strong className="text-white">{statusLabel[ticket.status]}</strong>
            </p>
            <div className="mt-3">
              <TicketQr token={ticket.token} />
            </div>
          </div>
        ))}
      </div>
    </article>
  ))}
</RevealWrapper>
```

The `childSelector="> article"` targets the direct `<article>` children of the section, staggering
them with 0.1s default. Since orders are server-rendered (not loaded async), the stagger fires once
when the section enters the viewport — no data-loading complications.

The conditional structure (empty vs. non-empty) is preserved:
```tsx
{orders.length === 0 ? (
  <RevealWrapper as="section" className="rounded-xl border border-dashed ...">
    {/* empty state content */}
  </RevealWrapper>
) : (
  <RevealWrapper as="section" className="grid gap-5" childSelector="> article">
    {orders.map(...)}
  </RevealWrapper>
)}
```

All other code in the file (interfaces, `formatCurrency`, `statusLabel`, `loadCustomerOrders`) 
remains unchanged.
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - src/app/meus-ingressos/page.tsx imports RevealWrapper
    - Page header wrapped in `<RevealWrapper as="header" className="mb-6 ...">`
    - Empty state section wrapped in `<RevealWrapper as="section" className="rounded-xl ...">`
    - Order list section wrapped in `<RevealWrapper as="section" childSelector="> article">`
    - All existing order card content and TicketQr usage unchanged inside articles
    - formatCurrency, statusLabel, loadCustomerOrders untouched
    - Build passes with no TypeScript errors
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GSAP→DOM | Inline opacity/transform applied to article elements (order cards) |
| server→client | Server-fetched order data passed as RSC children to RevealWrapper |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-anim-11 | Tampering | RevealWrapper wrapping ticket data | accept | RevealWrapper only controls CSS opacity/transform. Order data (token, status, QR) is rendered inside children — untouched by animation layer. |
| T-anim-12 | Denial of Service | stagger on order articles | accept | Orders list is bounded (server-fetched at render time). ScrollTrigger fires once per section (once: true). ctx.revert() on unmount. |
</threat_model>

<verification>
1. `bun run build` exits 0
2. `grep -n "RevealWrapper" src/app/meus-ingressos/page.tsx` returns import + 3 usages (header, empty state, order list)
3. `grep -n "childSelector" src/app/meus-ingressos/page.tsx` returns `"> article"` on order list wrapper
4. Manual check at `http://localhost:3000/meus-ingressos` (authenticated):
   - Page header reveals on load
   - If orders exist: article cards stagger-reveal as they scroll into view
   - If no orders: empty state panel reveals
   - prefers-reduced-motion: everything appears instantly
</verification>

<success_criteria>
- Page header animates in as single unit
- Order article cards stagger with 0.1s gap (childSelector "> article")
- Empty state panel animates as single unit
- All ticket data (token, QR code, status) renders inside animated articles — content unaffected
- Build passes with no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/phases/gsap-scroll-reveal/gsap-scroll-reveal-05-SUMMARY.md`
</output>
