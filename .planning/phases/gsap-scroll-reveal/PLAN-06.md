---
phase: gsap-scroll-reveal
plan: 06
type: execute
wave: 2
depends_on:
  - gsap-scroll-reveal-02
  - gsap-scroll-reveal-03
  - gsap-scroll-reveal-04
  - gsap-scroll-reveal-05
files_modified: []
autonomous: false
requirements:
  - ANIM-01
  - ANIM-02
  - ANIM-03
  - ANIM-04
  - ANIM-05
  - ANIM-06
  - ANIM-07

must_haves:
  truths:
    - "bun run build exits 0 with zero TypeScript errors"
    - "All five target pages animate correctly in a real browser"
    - "prefers-reduced-motion: all animations are skipped, content is fully visible"
    - "No GSAP console errors or unhandled promise rejections in browser DevTools"
    - "No visual regressions on pages that were NOT targeted (admin, checkin, checkout/success)"
  artifacts:
    - path: "src/lib/gsap-init.ts"
      provides: "registerGsap singleton"
    - path: "src/hooks/use-scroll-reveal.ts"
      provides: "useScrollReveal hook"
    - path: "src/components/reveal-wrapper.tsx"
      provides: "RevealWrapper component"
  key_links:
    - from: "all animated pages"
      to: "GSAP ScrollTrigger"
      via: "useScrollReveal hook or RevealWrapper"
      pattern: "useScrollReveal|RevealWrapper"
---

<objective>
Final verification sweep for the GSAP Scroll-Reveal Animations phase.

Runs a production build, checks for TypeScript/bundler errors, then prompts a human visual check
across all five target pages. Also verifies that non-animated pages (admin, checkin) are
unaffected.

Purpose: Catch any integration issues (SSR crashes, missing imports, type errors, double-animation
conflicts) before marking the phase complete.
Output: No new files. Phase signed off.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/gsap-scroll-reveal/CONTEXT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Production build + automated regression checks</name>
  <files>[none — verification only, no files modified]</files>
  <action>
Run the full production build and verify all automated checks pass.

```bash
# 1. Production build — must exit 0
bun run build

# 2. Unit + regression tests — must pass (no new failures)
bun run test:unit
bun run test:regression

# 3. Lint — must pass (no new errors)
bun run lint
```

If `bun run build` fails, capture the TypeScript error and fix the root cause before
proceeding. Common failure modes:
- `RevealWrapper` import path wrong → check `@/components/reveal-wrapper` resolves
- `useScrollReveal` type mismatch on `ref` → ensure `useRef<HTMLElement>(null)` is used
- GSAP types missing → run `bun add --dev @types/gsap` if needed (though GSAP 3 ships its own types)
- ESLint `react-hooks/exhaustive-deps` warning on empty `[]` dep array → the eslint-disable
  comment is included in the hook file

Also run a targeted grep to confirm no animated pages have double-wrapping issues:
```bash
# Check for any element that has BOTH ref= and is inside a RevealWrapper (would double-animate)
grep -n "RevealWrapper" src/app/page.tsx src/app/eventos/\[slug\]/page.tsx src/app/meus-ingressos/page.tsx

# Confirm useScrollReveal is used in client components (not server pages)
grep -rn "useScrollReveal" src/app/ src/features/

# Confirm RevealWrapper is used in server pages (not client components that already have the hook)
grep -rn "RevealWrapper" src/features/
```

The last command should return EMPTY — `RevealWrapper` should only appear in server component
pages (`src/app/`), not in `src/features/` client components (which use the hook directly).
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -20 && bun run test:unit 2>&1 | tail -10 && bun run lint 2>&1 | tail -10</automated>
  </verify>
  <done>
    - `bun run build` exits 0 — no TypeScript or bundler errors
    - `bun run test:unit` passes — no pre-existing tests broken
    - `bun run lint` passes — no new lint errors
    - `grep -rn "RevealWrapper" src/features/` returns empty (no double-animation)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
GSAP Scroll-Reveal Animations applied to all five target pages:
- `/` — header + event card grid
- `/eventos/[slug]` — hero section + lots section (LotSelector animated from within)
- `/login` — login form panel
- `/checkout` — checkout form panel
- `/meus-ingressos` — page header + order article cards (stagger)

Foundation layer:
- `src/lib/gsap-init.ts` — ScrollTrigger singleton registration
- `src/hooks/use-scroll-reveal.ts` — reusable hook with reduced-motion guard
- `src/components/reveal-wrapper.tsx` — thin client wrapper for server pages
- `src/app/globals.css` — `.gsap-reveal` CSS class
  </what-built>
  <how-to-verify>
Start the dev server: `bun run dev`

**Check 1 — Home page (`http://localhost:3000/`)**
1. Hard-refresh (Ctrl+Shift+R). The header block (h1 "Eventos Abertos" + subtitle + nav links)
   should fade/slide upward into view over ~0.9s.
2. Event cards in the grid should stagger-reveal (first card appears, then ~100ms later next,
   then next, etc.) — visible if there are 3+ events.

**Check 2 — Event detail (`http://localhost:3000/eventos/[any-slug]`)**
1. Hard-refresh. The hero section (image + title + description + date/location) should fade/slide in.
2. Scroll down — the "Lotes" section should reveal as it enters the viewport.
3. The LotSelector ("Selecionar Lote") panel should also reveal independently.

**Check 3 — Login page (`http://localhost:3000/login`)**
1. Hard-refresh. The login form panel (white/5 rounded card with "Entrar" heading) should
   fade/slide up into view on load.

**Check 4 — Checkout page (`http://localhost:3000/checkout?eventId=test&lotId=test`)**
1. Hard-refresh. The checkout form panel should reveal on load. Note: the warning banner
   (amber, "Selecione um evento") appears instantly (not wrapped) — this is correct.

**Check 5 — Meus Ingressos (`http://localhost:3000/meus-ingressos`)**
If authenticated with orders:
1. Hard-refresh. The page header should reveal on load.
2. Order article cards should stagger-reveal as they scroll into view.
If not authenticated: you'll be redirected to `/login` — check that redirect still works.

**Check 6 — Reduced Motion**
In Chrome DevTools: open DevTools → Rendering tab → check "Emulate CSS media feature
prefers-reduced-motion: reduce". Hard-refresh each page.
- All elements should appear INSTANTLY at full opacity — no animation whatsoever.
- No layout shifts or invisible content.

**Check 7 — No regressions on excluded pages**
- `/admin` — visit any admin page. Verify NO animations play (animations are excluded).
- Browser console: verify no GSAP errors or "ScrollTrigger" warnings.

**Expected animation values to observe:**
- Opacity: 0 → 1
- Y movement: elements slide ~48px upward into final position
- Duration: ~0.9 seconds
- Easing: decelerating (starts fast, ends slow — power3.out)
  </how-to-verify>
  <resume-signal>Type "approved" if animations look correct across all pages, or describe any issues found (e.g., "header not animating on home", "build error in checkout-form.tsx")</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser→DOM | Final verification — no new code introduced in this plan |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-anim-13 | Denial of Service | GSAP ScrollTrigger global registry | mitigate | Verify in DevTools that ScrollTrigger instances are cleaned up on navigation. Navigate between pages and check that the GSAP registry doesn't grow unboundedly. |
| T-anim-14 | Information Disclosure | Client bundle size increase | accept | gsap (~130KB minified) is added to the client bundle. This is acceptable for a public-facing animation library. No sensitive data exposed. |
</threat_model>

<verification>
Automated:
1. `bun run build` → exit 0
2. `bun run test:unit` → no new failures
3. `bun run lint` → no new lint errors
4. `grep -rn "RevealWrapper" src/features/` → empty (confirms no double-animation in client components)

Manual (checkpoint):
5. All five pages animate correctly in browser
6. Animations respect prefers-reduced-motion
7. No GSAP console errors
8. Admin/checkin pages have no animations (scope respected)
</verification>

<success_criteria>
- Production build passes (exit 0)
- All five target pages have working scroll-reveal animations
- prefers-reduced-motion: no animations, all content visible
- Excluded pages (/admin, /checkin) are unaffected
- Browser console is clean (no GSAP errors)
- Phase COMPLETE — all ANIM-01 through ANIM-07 requirements fulfilled
</success_criteria>

<output>
After completion, create `.planning/phases/gsap-scroll-reveal/gsap-scroll-reveal-06-SUMMARY.md`
</output>
