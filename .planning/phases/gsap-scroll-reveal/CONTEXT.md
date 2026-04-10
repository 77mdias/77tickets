# Phase Context: GSAP Scroll-Reveal Animations

## Goal
Add GSAP scroll-reveal animations to the TicketFlow app, aligning with Motion §03
in `parallax-geometry/design-system.html`.

## Canonical Refs
- `parallax-geometry/design-system.html` — §03 Motion Principles (source of truth for animation values)
- `src/app/globals.css` — DS color tokens and font variables
- `.planning/codebase/ARCHITECTURE.md` — component/page structure
- `.planning/codebase/STACK.md` — Vinext/Bun/Tailwind stack constraints

---

## Decisions

### 1. Scope — public pages only
Animations apply to these pages and their child components:
- `/` — home, event list, filters
- `/eventos/[slug]` — event detail
- `/login` — login form
- `/checkout` — checkout form, lot selector
- `/meus-ingressos` — ticket list, QR viewer

**Excluded:** `/admin`, `/checkin`, `/checkout/success`, `/checkout/cancel`
Rationale: admin/checkin are functional tools, not experience pages.

### 2. Element targets — cards + headings + form panels
Anything that is a discrete content block gets the reveal treatment:
- Section headings (h1, h2)
- Event cards (`EventCard`, `EventCardSkeleton`)
- Ticket cards
- Form panels (`rounded-xl border border-white/10 bg-white/5`)
- Filter/search bars
- Event detail sections (metadata rows, lot selector, description)

Inline text (paragraphs, labels, small badges) does NOT animate independently — only their container card/panel does.

### 3. Stagger — list/grid items cascade
When multiple sibling elements appear in the same viewport section (event card grid, ticket list), they stagger with `stagger: 0.1` (100ms between each child).

Standalone elements (headings, single form panels) animate independently with no stagger.

### 4. Reduced motion — respected
If `window.matchMedia("(prefers-reduced-motion: reduce)").matches` is true, animations are skipped (elements rendered at full opacity/position instantly, no GSAP transition).

Implement as a guard in the hook before registering ScrollTrigger/gsap.to calls.

---

## Animation Values (from DS §03)
```
Initial state:  opacity: 0, y: 48
Final state:    opacity: 1, y: 0
Duration:       0.9s
Ease:           "power3.out"
Stagger:        0.1s (for list/grid groups)
Trigger:        "top 85%" (element top hits 85% down the viewport)
```

---

## Implementation Approach
- Install `gsap` package (free tier — ScrollTrigger is included in free GSAP 3)
- Create a reusable React hook `useScrollReveal(ref, options?)` in `src/hooks/use-scroll-reveal.ts`
- Create a utility `src/lib/gsap-init.ts` that registers ScrollTrigger once
- Apply hook in components via `useRef` + `useScrollReveal(ref)` pattern
- For list/grid stagger: hook variant accepts `childSelector` string (e.g. `"> article"`)
- NO `@gsap/react` dependency needed — plain `useEffect` with `gsap.context()` cleanup is sufficient

---

## Out of Scope (deferred)
- Parallax background (Three.js wireframe) — separate initiative
- Page transition animations (route-level)
- Hover micro-interactions
- Admin / checkin page animations
