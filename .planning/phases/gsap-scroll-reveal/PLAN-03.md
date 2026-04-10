---
phase: gsap-scroll-reveal
plan: 03
type: execute
wave: 1
depends_on: [gsap-scroll-reveal-01]
files_modified:
  - src/app/eventos/[slug]/page.tsx
autonomous: true
requirements:
  - ANIM-05

must_haves:
  truths:
    - "Event hero section (image + title + description + metadata) reveals as one block"
    - "Lots section (heading + lot rows list) reveals as user scrolls to it"
    - "LotSelector checkout panel reveals independently below the lots list"
    - "All three sections animate with opacity 0→1, y 48→0, 0.9s, power3.out"
    - "Reduced motion: all three sections appear instantly without animation"
  artifacts:
    - path: "src/app/eventos/[slug]/page.tsx"
      provides: "Event detail page with three RevealWrapper sections"
      contains: "RevealWrapper"
  key_links:
    - from: "src/app/eventos/[slug]/page.tsx"
      to: "src/components/reveal-wrapper.tsx"
      via: "three <RevealWrapper as=\"section\"> wrappers"
      pattern: "RevealWrapper"
---

<objective>
Apply scroll-reveal animations to the event detail page (`/eventos/[slug]`).
Three distinct sections each get an independent reveal:
1. Hero section — event image, h1, description, date/location metadata
2. Lots section — "Lotes" heading + lot rows grid
3. LotSelector panel — the checkout selector component

Purpose: Event detail is a key conversion page. Staggered section reveals create visual
hierarchy and guide the user's attention downward toward the purchase CTA.
Output: One modified server component file. No new files.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/gsap-scroll-reveal/CONTEXT.md
@src/app/eventos/[slug]/page.tsx

<interfaces>
<!-- From PLAN-01 artifacts — use these directly, no codebase exploration needed -->

From src/components/reveal-wrapper.tsx:
```typescript
interface RevealWrapperProps extends ScrollRevealOptions {
  children: ReactNode;
  as?: ElementType;   // default: "div"
  className?: string;
  // all ScrollRevealOptions props are passed through to useScrollReveal
}
export function RevealWrapper(props: RevealWrapperProps): JSX.Element
```

Existing page structure (src/app/eventos/[slug]/page.tsx):
```tsx
<main className="flex w-full max-w-5xl flex-col gap-6">
  {/* Section 1: Hero — rounded-xl border border-white/10 bg-white/5 */}
  <section className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
    {/* image, h1, description, metadata grid */}
  </section>

  {/* Section 2: Lots — rounded-xl border border-white/10 bg-white/5 p-5 */}
  <section className="rounded-xl border border-white/10 bg-white/5 p-5">
    <h2>Lotes</h2>
    {/* lot rows */}
  </section>

  {/* Section 3: LotSelector — already a "use client" component */}
  <LotSelector eventId={...} lots={...} />
</main>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wrap three event detail sections in RevealWrapper</name>
  <files>src/app/eventos/[slug]/page.tsx</files>
  <action>
In `src/app/eventos/[slug]/page.tsx`, import `RevealWrapper` and wrap each of the three
content sections. This is a server component — wrapping in RevealWrapper (a client component)
is the correct App Router composition pattern: server children are serialized and passed
as props to the client wrapper.

Add import at the top of the file:
```tsx
import { RevealWrapper } from "@/components/reveal-wrapper";
```

Wrap Section 1 (hero) — replace `<section className="overflow-hidden rounded-xl ...">` with:
```tsx
<RevealWrapper
  as="section"
  className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
>
  {/* all existing children unchanged: image or placeholder div, then div.p-6 */}
</RevealWrapper>
```

Wrap Section 2 (lots) — replace `<section className="rounded-xl border border-white/10 bg-white/5 p-5">` with:
```tsx
<RevealWrapper
  as="section"
  className="rounded-xl border border-white/10 bg-white/5 p-5"
>
  {/* all existing children unchanged: h2, ul with lot rows */}
</RevealWrapper>
```

Wrap Section 3 (LotSelector) — LotSelector is already a "use client" component so it can be
animated from within itself (handled in PLAN-04). For the event detail page, wrap the LotSelector
in a RevealWrapper div so the outer container gets the reveal:
```tsx
<RevealWrapper>
  <LotSelector
    eventId={data.event.id}
    lots={data.lots.map((lot) => ({ ... }))}
  />
</RevealWrapper>
```

Note: Since LotSelector will also have its own internal `useScrollReveal` applied in PLAN-04
(on its inner `<section>`), avoid double-animating. In PLAN-04, the `LotSelector` component's
inner section will animate. Therefore, do NOT wrap LotSelector in RevealWrapper here — let
PLAN-04 handle LotSelector's own animation from within the component.

Revised: Only wrap the hero section and lots section in RevealWrapper. Leave `<LotSelector>`
as-is (its internal animation will be added by PLAN-04).

Final structure:
```tsx
import { notFound } from "next/navigation";
import { LotSelector } from "@/features/checkout/lot-selector";
import { getServerBaseUrl } from "@/lib/server-api";
import { RevealWrapper } from "@/components/reveal-wrapper";

// ... (interfaces and helper functions unchanged) ...

export default async function EventDetailPage({ params }) {
  const { slug } = await params;
  const data = await loadEventDetail(slug);

  return (
    <div className="flex flex-1 justify-center bg-zinc-950 px-6 py-10">
      <main className="flex w-full max-w-5xl flex-col gap-6">

        {/* Hero section — reveals as one block */}
        <RevealWrapper
          as="section"
          className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          {data.event.imageUrl ? (
            <img
              alt={data.event.title}
              className="h-56 w-full object-cover"
              src={data.event.imageUrl}
            />
          ) : (
            <div className="h-56 w-full bg-white/10" />
          )}
          <div className="p-6">
            <h1 className="text-3xl font-semibold text-white">{data.event.title}</h1>
            <p className="mt-2 text-sm text-zinc-400">{data.event.description ?? "Sem descrição."}</p>
            <div className="mt-4 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
              <p>
                <strong className="text-white">Data:</strong> {formatDateTime(data.event.startsAt)}
              </p>
              <p>
                <strong className="text-white">Local:</strong> {data.event.location ?? "A definir"}
              </p>
            </div>
          </div>
        </RevealWrapper>

        {/* Lots section — reveals as user scrolls */}
        <RevealWrapper
          as="section"
          className="rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <h2 className="text-lg font-semibold text-white">Lotes</h2>
          <ul className="mt-4 grid gap-3">
            {data.lots.map((lot) => (
              <li
                key={lot.id}
                className="grid gap-1 rounded-md border border-white/10 px-4 py-3 text-sm sm:grid-cols-4 sm:items-center"
              >
                <span className="font-medium text-white">{lot.title}</span>
                <span className="text-zinc-300">{formatCurrency(lot.priceInCents)}</span>
                <span className="text-zinc-300">Disponíveis: {lot.available}</span>
                <span className="text-zinc-500">Máx/pedido: {lot.maxPerOrder}</span>
              </li>
            ))}
          </ul>
        </RevealWrapper>

        {/* LotSelector — animated from within the component (PLAN-04) */}
        <LotSelector
          eventId={data.event.id}
          lots={data.lots.map((lot) => ({
            id: lot.id,
            title: lot.title,
            priceInCents: lot.priceInCents,
            available: lot.available,
            maxPerOrder: lot.maxPerOrder,
          }))}
        />

      </main>
    </div>
  );
}
```

All `formatDateTime`, `formatCurrency`, `loadEventDetail`, and type definitions remain unchanged.
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - src/app/eventos/[slug]/page.tsx imports RevealWrapper
    - Hero section wrapped in `<RevealWrapper as="section" className="overflow-hidden ...">`
    - Lots section wrapped in `<RevealWrapper as="section" className="rounded-xl ...">`
    - LotSelector is NOT double-wrapped (its animation comes from PLAN-04)
    - All existing children (image, h1, lot rows, etc.) are unchanged inside wrappers
    - TypeScript interfaces, helper functions, and loadEventDetail remain untouched
    - Build passes with no errors
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GSAP→DOM | Inline opacity/transform applied to section elements |
| server→client | Server-rendered children passed as RSC payload to RevealWrapper |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-anim-06 | Tampering | RevealWrapper RSC composition | accept | Children are server-rendered and serialized as RSC payload — client component only controls visibility (opacity/transform), not content. No XSS surface. |
| T-anim-07 | Denial of Service | ScrollTrigger on sections | accept | Three independent ScrollTrigger instances per page. Small fixed count — no unbounded growth. `once: true` prevents re-fire. Cleanup via `ctx.revert()`. |
</threat_model>

<verification>
1. `bun run build` exits 0
2. `grep -n "RevealWrapper" src/app/eventos/\[slug\]/page.tsx` returns import + 2 usages
3. `grep -c "RevealWrapper" src/app/eventos/\[slug\]/page.tsx` returns 3 (import + 2 JSX usages)
4. Manual check at `http://localhost:3000/eventos/[any-slug]`:
   - Hero section fades/slides in on load
   - Lots section reveals as page scrolls (if below fold) or immediately on load
   - LotSelector panel reveals (from its own hook added in PLAN-04)
   - prefers-reduced-motion emulation: all sections appear instantly
</verification>

<success_criteria>
- Hero section and lots section each have independent RevealWrapper animations
- LotSelector is left for its internal hook (PLAN-04) — no double wrapping
- Build passes with no TypeScript errors
- Semantic HTML structure preserved (RevealWrapper renders as `<section>` elements)
</success_criteria>

<output>
After completion, create `.planning/phases/gsap-scroll-reveal/gsap-scroll-reveal-03-SUMMARY.md`
</output>
