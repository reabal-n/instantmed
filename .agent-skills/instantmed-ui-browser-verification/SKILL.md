---
name: instantmed-ui-browser-verification
description: InstantMed UI polish and browser verification workflow. Use when a task in /Users/rey/Developer/instantmed touches UI, UX, layout, animation, motion, Tailwind classes, shadcn components, marketing pages, patient flows, staff cockpit pages, visual polish, screenshots, Browser checks, Playwright checks, desktop/mobile rendering, dark mode, reduced motion, app or components directories, DESIGN.md, PRODUCT.md, or docs/AI_ONBOARDING.md.
---

# InstantMed UI Browser Verification

Use this for UI changes and visual QA. The goal is to keep InstantMed's interface disciplined, calm, accessible, and verified in a real browser.

## Load Order

For UI work, read:

1. `AGENTS.md`, then `wiki/index.md`
2. `docs/AI_ONBOARDING.md`
3. `DESIGN.md`
4. `PRODUCT.md`
5. For public copy or claims: `docs/BRAND.md`, `docs/VOICE.md`, and `docs/ADVERTISING_COMPLIANCE.md`
6. Relevant component README such as `components/operator/README.md`, `components/request/README.md`, or `components/uix/README.md`

Respect the repo's Impeccable/Emil routing. If the task clearly asks for shape, audit, layout, polish, clarify, animation, or motion feel, use the matching design skill too.

## Build Rules

- Use existing primitives before inventing a new component pattern.
- Use `@/` imports, Tailwind tokens, `cn()`, shadcn/Radix form controls, lucide icons, and existing service/catalog constants.
- Keep staff pages bounded and scannable; avoid whole-page scrolling for dense operator surfaces.
- Respect reduced motion for any Framer Motion change.
- Do not upgrade the pinned stack, add Turbopack, rename middleware, or change stack pins.
- Do not add decorative motion to staff/admin/doctor time-pressure surfaces.

## Browser Verification

Use `http://localhost:3060`.

Pick the right proof:

- Quick render check: in-app Browser/preview tools.
- Rich interactive QA: approved `agent-browser` path when a dev server is already running.
- Durable release gate: Playwright specs.

For public or patient-facing UI, check at least:

- Desktop and mobile viewport.
- Light and dark mode when the surface supports both.
- Reduced motion when motion changed.
- No text overflow, overlapping UI, broken focus states, or console errors.

## Verification Ladder

- For TS/TSX changes, run the narrowest useful focused tests plus `pnpm lint` and `pnpm typecheck` when the change is more than copy/classes.
- For public UI, verify the rendered route in browser after implementation.
- For staff cockpit or patient-flow changes, exercise the actual interaction path, not just page load.
- For final sign-off, state exactly which viewport, mode, route, and interaction were checked.

## Output Shape

Report:

- What changed visually or behaviorally.
- Which design docs/primitives governed it.
- Screens or browser paths checked.
- Any remaining visual risk or unverified breakpoint/state.
