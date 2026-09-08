---
name: instantmed-ui-browser-verification
description: Verify InstantMed patient and staff UI flows using its approved browser tooling, data policy and visual evidence requirements before sign-off.
metadata:
  owner: Rey / instantmed
  scope: project:instantmed
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

Use `web-design` modes for shape, audit, layout, polish, clarify, and component animation, including its interaction-motion reference for motion feel. Add `cinematic-web` only for substantial scene motion or scroll choreography, following the project design documents.

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

## Staff fixture privacy boundary

- Validate the route and authenticated role before navigation or capture. Masking after a page loads does not prevent exposure.
- Against shared Supabase, use `/dashboard?showTestData=1&onlyTestData=1` only as an admin with `PLAYWRIGHT=1`. Both seed-only flags are admin-only; an ordinary doctor ignores them and can receive unrelated queue/history data.
- Test an ordinary doctor through an exact owned synthetic full-record or API route. Never use an unfiltered doctor queue or Ledger to reach a test row. Ledger search after initial rendering is not an isolation boundary; its browser proof requires isolated data.
- Use exact owned synthetic IDs and clean up transient records in `finally` or test teardown. Do not attach a real-session Realtime client to shared patient data. Keep screenshots, traces and logs free of real patient content.
- Isolate external provider actions before the browser reaches them. For local prescribing UI QA, use a loopback discard provider URL, blank provider secrets and disabled email/error-reporting credentials with the existing E2E email seam. State separately whether durable synthetic evidence, actual provider delivery, physical-device input or production behavior was verified.

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

## Scope and ownership

This workflow applies only to instantmed and its verified checkouts/worktrees. Confirm the project from its operating docs and Git root before applying it. Project doctrine owns product, brand, privacy and release requirements; shared skills supply techniques only. Resolve commands and project paths from the active checkout, not a fixed machine path.
