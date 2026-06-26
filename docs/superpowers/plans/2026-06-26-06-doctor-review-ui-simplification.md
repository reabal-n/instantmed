# Doctor Review UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make prescription review screens show one clear request packet, exact blockers, identity/Parchment readiness, and next actions without repeated medication/dose noise.

**Architecture:** This is a UI composition pass after the prescribing packet and Parchment state plans. Review surfaces consume shared domain outputs and render them in predictable density variants.

**Tech Stack:** React 18.3, Next.js App Router, Tailwind v4, shadcn/Radix, lucide-react, Vitest source/contract tests, Playwright/browser verification on port 3060.

## Global Constraints

- Do not create a new dashboard.
- Do not use decorative redesign, nested cards, or marketing-style layout.
- Staff pages must remain bounded and scannable.
- Draft note is collapsed by default.
- Medication/dose/frequency/indication render through `PrescribingPacket` components only.
- Parchment error UI must use exact blockers or durable rejection state.

---

## File Structure

- Modify `components/doctor/review/intake-review-cockpit.tsx`: overall layout and hierarchy.
- Modify `components/doctor/review/request-info-card.tsx`: remove duplicated raw facts, consume packet.
- Modify `components/doctor/review/prescription-recommendation-card.tsx`: fold into packet or remove duplicate medication line.
- Modify `components/doctor/clinical-case-review.tsx`: collapse draft note, avoid repeated handoff context.
- Modify `components/doctor/review/intake-action-buttons.tsx`: action names and blockers.
- Modify `app/doctor/intakes/[id]/intake-detail-header.tsx`: full-page action names and blockers.
- Modify `components/doctor/patient-timeline.tsx`: compact prescribed/requested display.
- Update `lib/__tests__/doctor-review-ui-contract.test.ts`.

## Task 1: Lock UI Contract Before Styling

**Files:**
- Modify `lib/__tests__/doctor-review-ui-contract.test.ts`

**Interfaces:**
- Consumes outputs from previous plans:
  - `PrescribingPacket`
  - Parchment derived status
  - prescribing identity blockers

- [ ] **Step 1: Add source/behavior contract tests**

Assert:

- Draft note is collapsed by default.
- Request review uses `PrescribingPacketCard`.
- Generic prescription `Approve` is not shown.
- `Complete request` appears only for prescription completion.
- Identity blockers appear before Parchment actions.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test -- lib/__tests__/doctor-review-ui-contract.test.ts`

Expected: FAIL before UI changes.

- [ ] **Step 3: Commit failing contract only if team workflow allows**

If not committing failing tests alone, keep this step within the next commit.

## Task 2: Restructure Review Main Content

**Files:**
- Modify `components/doctor/review/intake-review-cockpit.tsx`
- Modify `components/doctor/review/request-info-card.tsx`
- Modify `components/doctor/review/prescription-recommendation-card.tsx`

**Interfaces:**
- Main order:
  1. Patient/header context
  2. Blockers
  3. Prescribing packet
  4. Identity/Parchment readiness
  5. Actions
  6. Collapsed draft note / full intake secondary detail

- [ ] **Step 1: Replace raw medication facts**

Use `PrescribingPacketCard variant="full"` for prescribing cases.

- [ ] **Step 2: Demote optional context**

Last prescribed, allergies, and history appear once under secondary context, not in multiple cards.

- [ ] **Step 3: Remove duplicate recommendation line**

If `PrescriptionRecommendationCard` only repeats packet content, remove it or convert it into a compact Parchment handoff status block.

- [ ] **Step 4: Run UI contract tests**

Run: `pnpm test -- lib/__tests__/doctor-review-ui-contract.test.ts`

Expected: PASS or only remaining action-label failures.

- [ ] **Step 5: Commit**

```bash
git add components/doctor/review lib/__tests__/doctor-review-ui-contract.test.ts
git commit -m "refactor: simplify prescribing review hierarchy"
```

## Task 3: Collapse Draft Note By Default

**Files:**
- Modify `components/doctor/clinical-case-review.tsx`
- Modify `components/doctor/review/intake-review-cockpit.tsx`
- Update tests

**Interfaces:**
- Draft note is available but not primary reading path.

- [ ] **Step 1: Add contract test**

Assert initial render contains collapsed trigger text and not the full generated paragraph.

- [ ] **Step 2: Implement collapse**

Use existing disclosure/collapsible primitives if present. The trigger label should be `Draft note` with status text such as `Ready` or `Needs edit`.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- lib/__tests__/doctor-review-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/doctor/clinical-case-review.tsx components/doctor/review/intake-review-cockpit.tsx lib/__tests__/doctor-review-ui-contract.test.ts
git commit -m "refactor: collapse draft note in review"
```

## Task 4: Align Action Bar Copy With Lifecycle

**Files:**
- Modify `components/doctor/review/intake-action-buttons.tsx`
- Modify `app/doctor/intakes/[id]/intake-detail-header.tsx`
- Modify `components/doctor/review-actions.tsx`
- Modify `app/doctor/intakes/[id]/use-intake-actions.tsx`

**Interfaces:**
- `Prescribe`: opens/syncs Parchment only.
- `Complete request`: final prescription completion.
- `Sent outside Parchment`: manual fulfilment proof only.

- [ ] **Step 1: Update labels**

Remove generic `Approve` for prescription requests. Use `Complete request` after fulfilment proof exists.

- [ ] **Step 2: Update disabled reasons**

Blocker copy should name exact missing fields or sync state.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- lib/__tests__/doctor-review-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/doctor app/doctor/intakes lib/__tests__/doctor-review-ui-contract.test.ts
git commit -m "refactor: clarify prescription review actions"
```

## Task 5: Browser Verification And Polish

**Files:**
- No planned source files unless browser verification finds layout issues.
- Save screenshots under the existing docs review convention only if this repo normally stores them for such work.

**Interfaces:**
- Verifies desktop and mobile staff views.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

Expected: server on `http://localhost:3060`.

- [ ] **Step 2: Verify request review desktop**

Open a repeat-script review. Confirm:

- one medication packet
- draft note collapsed
- no duplicated medication lines
- action labels match lifecycle

- [ ] **Step 3: Verify patient profile**

Confirm identity/Parchment/address statuses are visible and not contradictory.

- [ ] **Step 4: Verify mobile width**

Confirm text does not overlap and action bar remains usable.

- [ ] **Step 5: Commit fixes**

```bash
git add components app lib
git commit -m "polish: verify prescribing review layout"
```

## Verification

- Run `pnpm typecheck`.
- Run `pnpm test -- lib/__tests__/doctor-review-ui-contract.test.ts`.
- Run `pnpm lint`.
- Browser verify desktop and mobile on `http://localhost:3060`.
