---
phase: gsap-scroll-reveal
plan: 04
type: execute
wave: 1
depends_on: [gsap-scroll-reveal-01]
files_modified:
  - src/features/auth/login-form.tsx
  - src/features/checkout/checkout-form.tsx
  - src/features/checkout/lot-selector.tsx
autonomous: true
requirements:
  - ANIM-06

must_haves:
  truths:
    - "LoginForm panel (rounded-xl bg-white/5) reveals with opacity 0→1, y 48→0 on page load"
    - "CheckoutForm panel reveals with the same animation values"
    - "LotSelector panel reveals independently (used on /eventos/[slug])"
    - "All three form panels skip animation when prefers-reduced-motion matches"
  artifacts:
    - path: "src/features/auth/login-form.tsx"
      provides: "LoginForm with useScrollReveal on outer section"
      contains: "useScrollReveal"
    - path: "src/features/checkout/checkout-form.tsx"
      provides: "CheckoutForm with useScrollReveal on outer section"
      contains: "useScrollReveal"
    - path: "src/features/checkout/lot-selector.tsx"
      provides: "LotSelector with useScrollReveal on outer section"
      contains: "useScrollReveal"
  key_links:
    - from: "src/features/auth/login-form.tsx"
      to: "src/hooks/use-scroll-reveal.ts"
      via: "useScrollReveal(sectionRef)"
      pattern: "useScrollReveal"
    - from: "src/features/checkout/checkout-form.tsx"
      to: "src/hooks/use-scroll-reveal.ts"
      via: "useScrollReveal(sectionRef)"
      pattern: "useScrollReveal"
    - from: "src/features/checkout/lot-selector.tsx"
      to: "src/hooks/use-scroll-reveal.ts"
      via: "useScrollReveal(sectionRef)"
      pattern: "useScrollReveal"
---

<objective>
Apply scroll-reveal to the three form panel components:
1. `LoginForm` — the `<section>` panel on `/login`
2. `CheckoutForm` — the `<section>` panel on `/checkout`
3. `LotSelector` — the `<section>` panel on `/eventos/[slug]`

All three are already `"use client"` components, so the hook applies directly via `useRef`.
No `RevealWrapper` needed — these are client components.

Purpose: Form panels are the primary action surfaces. A reveal animation on load draws
attention to the CTA without blocking interaction.
Output: Three modified client component files.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/gsap-scroll-reveal/CONTEXT.md
@src/features/auth/login-form.tsx
@src/features/checkout/checkout-form.tsx
@src/features/checkout/lot-selector.tsx

<interfaces>
<!-- From PLAN-01 artifacts — use these directly -->

From src/hooks/use-scroll-reveal.ts:
```typescript
export function useScrollReveal<T extends Element>(
  ref: RefObject<T | null>,
  options?: ScrollRevealOptions
): void
// Single-element mode (no childSelector): animates the ref element itself
// opacity: 0→1, y: 48→0, duration: 0.9, ease: "power3.out", start: "top 85%"
```

Existing outer elements to attach ref to:
- LoginForm: `<section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">`
- CheckoutForm: `<section className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">`
- LotSelector (available lots): `<section className="rounded-xl border border-white/10 bg-white/5 p-5">`
- LotSelector (no lots): `<section className="rounded-xl border border-white/10 bg-white/5 p-5">` (same wrapper — animate both states)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add useScrollReveal to LoginForm and CheckoutForm</name>
  <files>src/features/auth/login-form.tsx, src/features/checkout/checkout-form.tsx</files>
  <action>
Both files are already `"use client"` — add `useScrollReveal` directly.

## login-form.tsx changes

1. Add `useRef` to the existing React import (currently imports `FormEvent, useState`):
   ```tsx
   import { FormEvent, useRef, useState } from "react";
   ```

2. Add import for the hook:
   ```tsx
   import { useScrollReveal } from "@/hooks/use-scroll-reveal";
   ```

3. Inside `LoginForm` function body, after the router/state declarations, add:
   ```tsx
   const sectionRef = useRef<HTMLElement>(null);
   useScrollReveal(sectionRef);
   ```

4. Attach ref to the outer `<section>`:
   ```tsx
   // BEFORE:
   <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">
   
   // AFTER:
   <section ref={sectionRef} className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">
   ```

No other changes to login-form.tsx.

## checkout-form.tsx changes

1. Add `useRef` to existing React import (currently `type FormEvent, useState`):
   ```tsx
   import { type FormEvent, useRef, useState } from "react";
   ```

2. Add import for the hook:
   ```tsx
   import { useScrollReveal } from "@/hooks/use-scroll-reveal";
   ```

3. Inside `CheckoutForm` function body, after the router/state declarations, add:
   ```tsx
   const sectionRef = useRef<HTMLElement>(null);
   useScrollReveal(sectionRef);
   ```

4. Attach ref to the outer `<section>`:
   ```tsx
   // BEFORE:
   <section className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">
   
   // AFTER:
   <section ref={sectionRef} className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">
   ```

No other changes to checkout-form.tsx.
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - login-form.tsx: useRef imported, sectionRef declared, useScrollReveal called, ref on section
    - checkout-form.tsx: useRef imported, sectionRef declared, useScrollReveal called, ref on section
    - All existing logic (form state, submission, router.push, error display) unchanged
    - Build passes with no TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Add useScrollReveal to LotSelector</name>
  <files>src/features/checkout/lot-selector.tsx</files>
  <action>
`LotSelector` has two render paths that both return `<section>` elements:
- Path A (no available lots): `<section className="rounded-xl border border-white/10 bg-white/5 p-5">` — early return
- Path B (available lots): `<section className="rounded-xl border border-white/10 bg-white/5 p-5">` — main return

Since both paths return the same outer element type, use a single `sectionRef` and a shared
`useScrollReveal` call. The hook runs once on mount — whichever section renders gets the ref.

Changes:

1. Add `useRef` to existing React import (currently `useMemo, useState`):
   ```tsx
   import { useMemo, useRef, useState } from "react";
   ```

2. Add hook import:
   ```tsx
   import { useScrollReveal } from "@/hooks/use-scroll-reveal";
   ```

3. Inside `LotSelector` function body, before the early return, add:
   ```tsx
   const sectionRef = useRef<HTMLElement>(null);
   useScrollReveal(sectionRef);
   ```
   
   Important: declare the ref and call the hook BEFORE the early return for `availableLots.length === 0`.
   React hooks must be called unconditionally — not after conditional returns.

4. Attach `ref={sectionRef}` to BOTH `<section>` elements:
   ```tsx
   // Early return section (no available lots):
   <section ref={sectionRef} className="rounded-xl border border-white/10 bg-white/5 p-5">
   
   // Main return section (available lots):
   <section ref={sectionRef} className="rounded-xl border border-white/10 bg-white/5 p-5">
   ```

Full updated LotSelector function signature section (hook calls only — do not change other logic):
```tsx
export function LotSelector({ eventId, lots }: LotSelectorProps) {
  const availableLots = useMemo(() => lots.filter((lot) => lot.available > 0), [lots]);
  const [selectedLotId, setSelectedLotId] = useState(availableLots[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  // --- ADD THESE TWO LINES: ---
  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef);
  // ----------------------------

  const selectedLot = useMemo(...);
  // ... rest of existing logic ...

  if (availableLots.length === 0) {
    return (
      <section ref={sectionRef} className="rounded-xl border border-white/10 bg-white/5 p-5">
        {/* existing content unchanged */}
      </section>
    );
  }

  // ... existing checkoutParams logic ...

  return (
    <section ref={sectionRef} className="rounded-xl border border-white/10 bg-white/5 p-5">
      {/* existing content unchanged */}
    </section>
  );
}
```
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - lot-selector.tsx: useRef imported, sectionRef declared before any early return
    - useScrollReveal(sectionRef) called unconditionally (not inside a conditional)
    - ref={sectionRef} attached to BOTH section elements (early return + main return)
    - All existing lot logic (availableLots, selectedLot, maxQuantity, checkoutParams) unchanged
    - Build passes with no TypeScript errors
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GSAP→DOM | Inline opacity/transform applied to form panel sections |
| user input→form | Form state (email, password, eventId, etc.) unchanged by animation layer |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-anim-08 | Denial of Service | useScrollReveal on form panels | accept | One ScrollTrigger per panel. Fixed count. `once: true` + `ctx.revert()` on unmount. |
| T-anim-09 | Tampering | GSAP opacity on form section | accept | GSAP only writes `opacity` and `transform` CSS properties. Form inputs, values, and submission logic are unaffected. |
| T-anim-10 | Spoofing | Animation hiding form temporarily | accept | GSAP sets opacity:0 → animates to 1. The form is hidden for ~0.9s on first load (normal animation duration). If JS fails, form stays hidden — this is acceptable for non-critical animation (not auth gate). |
</threat_model>

<verification>
1. `bun run build` exits 0
2. `grep -n "useScrollReveal\|sectionRef" src/features/auth/login-form.tsx` returns 3 lines (import, declaration, hook call) + ref usage
3. `grep -n "useScrollReveal\|sectionRef" src/features/checkout/checkout-form.tsx` returns 3 lines + ref usage
4. `grep -n "useScrollReveal\|sectionRef" src/features/checkout/lot-selector.tsx` returns hook call before early return
5. Manual check:
   - `/login` → form panel fades/slides in on load
   - `/checkout?eventId=X&lotId=Y` → checkout form reveals on load
   - `/eventos/[slug]` → LotSelector panel reveals as it enters viewport
   - prefers-reduced-motion emulation → all panels appear instantly
</verification>

<success_criteria>
- Three client component form panels each have useScrollReveal applied to their outer section
- Hook calls are unconditional (before any early returns) — React hooks rules respected
- ref attached to section elements in all render paths
- All form logic (state, submission, validation) is unchanged
- Build passes with no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/phases/gsap-scroll-reveal/gsap-scroll-reveal-04-SUMMARY.md`
</output>
