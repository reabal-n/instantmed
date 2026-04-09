# Motion System Optimization — Design Doc

**Date:** 2026-04-07
**Status:** Approved, executing
**Owner:** Rey

## Problem

The motion system causes scroll jank on long marketing pages and ships unnecessary
runtime/bundle weight across the app. The `LazyMotion` provider exists but is
defeated by the import pattern (every component uses `motion` instead of `m`,
which silently falls back to the full Framer Motion bundle).

## Audit Summary

| Surface | Files | Motion calls | Issue |
|---|---|---|---|
| Marketing sections | 45 | 125 `whileInView` | Heavy section-wrapper fades, deeply nested |
| Request/intake | 10 | 80 | Mostly justified |
| Patient portal | 9 | ~20 | Portal Rule violations in 7 files |
| Doctor portal | 1 | small | Clean (modal only) |
| Admin portal | 0 | 0 | Clean |
| `globals.css` | — | 50+ keyframes, 30+ infinite | Massive bloat, duplicates |

### Critical findings
1. **`MotionProvider` LazyMotion is dead** — `strict={false}` + `motion` imports = full bundle ships
2. **`next.config.mjs`** has no `optimizePackageImports` for framer-motion or lucide-react
3. **13 `*-guide-section.tsx` files** are near-identical copies of the same 3-fade pattern
4. **`med-cert-intent-page.tsx`** has 6 inline `whileInView` with no reduced-motion guard (WCAG)
5. **`globals.css`** has 50+ keyframes including duplicates ("removed" comments still present)
6. **`MorningSkyBackground`** runs 4 infinite blur animations site-wide
7. **Patient portal** violates Portal Rule in 7 files
8. **`BlurFade`** is defined but never imported (dead code)
9. **`lib/motion.ts`** token system is theatre — 5 durations all = 0.2s, 4 springs all = easeOut tween

## Plan — 5 phases

### Phase 1 — Infrastructure (0.5h, near-zero risk)
1.1 `next.config.mjs`: add `experimental.optimizePackageImports: ['framer-motion', 'lucide-react']`
1.2 `MotionProvider`: switch to `LazyMotion features={domMax} strict={true}`. Codemod `import { motion } from "framer-motion"` → `import { m as motion } from "framer-motion"` across all 138 files.
1.3 Delete `components/ui/blur-fade.tsx`
1.4 Trim `lib/motion.ts`: collapse fake duration variants, drop duplicate spring presets

### Phase 2 — Marketing section sweep (2-3h)
2.1 Strip section-wrapper `whileInView` from 13 `*-guide-section.tsx` files
2.2 Consolidate into one shared `<GuideSection>` component
2.3 Fix `med-cert-intent-page.tsx` reduced-motion violations
2.4 Pricing/HowItWorks/Trust: keep one motion at section header
2.5 Replace `FloatingCard` `whileInView` with single shared IntersectionObserver

### Phase 3 — Background/ambient cleanup (1h)
3.1 `MorningSkyBackground`: remove 4 cloud-drift animations (sub-perceptual)
3.2 `blur-3xl` decorative blobs: isolate compositor layers or remove
3.3 `globals.css` keyframe purge — grep usage, delete dead, ~25 of 50 expected
3.4 Resolve duplicate keyframes

### Phase 4 — Portal compliance (1h)
4.1 Strip `AnimatePresence` page transitions from `patient-shell.tsx`
4.2 Remove framer-motion from 6 `components/patient/*` files; CSS or none
4.3 `onboarding-flow.tsx` step transition: opacity-only

### Phase 5 — Optional polish (0.5h)
5.1 Add `content-visibility: auto` to long marketing pages
5.2 Reconsider `@number-flow/react` (decision: keep — used for 'Australians helped' counter, brand value > 15kb cost)

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | All 5 phases approved | Owner direction |
| 2 | Consolidate guide sections | Owner approved |
| 3 | Strip patient-shell page transitions | Owner approved, Portal Rule compliance |
| 4 | Keep `@number-flow/react` | Brand value of "Australians helped" counter > 15kb |
| 5 | Scripted codemod for `motion` → `m` | Owner approved, run typecheck after |

## Expected Outcome

- **Bundle:** ~60% Framer Motion runtime reduction + tree-shaken icons
- **Scroll jank:** ~75% fewer concurrent IntersectionObservers on guide pages
- **Code:** 13 guide sections → 1 shared component, 50 keyframes → ~25
- **Portals:** Compliant with INTERACTIONS.md Portal Rule
- **Accessibility:** All `whileInView` honors `useReducedMotion`

## Verification

Per phase:
- `pnpm typecheck` must pass
- `pnpm lint` must pass
- `pnpm build` must succeed
- Spot-check 3 marketing pages + 1 portal page in dev for visual regressions
- Verify no console errors from LazyMotion strict mode
