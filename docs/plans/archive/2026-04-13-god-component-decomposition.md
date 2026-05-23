# God Component Decomposition Plan

**Date:** 2026-04-13
**Status:** Pending approval
**Scope:** Split 5 oversized components into focused, maintainable units

---

## Overview

Five components exceed 500 lines with mixed responsibilities. This plan decomposes each without changing behavior -- pure refactor, no feature changes. Every extraction is a single file move + re-export to keep imports stable.

---

## 1. `components/request/request-flow.tsx` (930 lines)

**Current responsibilities:** Service initialization, step navigation, progress tracking, animated transitions, swipe gestures, auto-save, unsaved changes warning, PostHog analytics, draft restoration, safety pre-checks, error handling, flow completion.

**Problem:** 15+ hooks/effects, 3 callback chains, inline error/hub screens, analytics + safety logic interleaved with navigation.

### Extraction Plan

| Extract To | What Moves | Lines Saved |
|-----------|-----------|-------------|
| `components/request/hooks/use-flow-analytics.ts` | PostHog step tracking, funnel milestone tracking, `trackStepEvent` calls, `trackedFunnelEventsRef`, `stepEnteredAtRef`, the `step_completed` timing logic | ~80 |
| `components/request/hooks/use-flow-navigation.ts` | `goToNextStep`, `goToPreviousStep`, `handleStepComplete`, safety pre-check orchestration, `handleSelectService`, step index/direction management | ~120 |
| `components/request/hooks/use-swipe-navigation.ts` | `dragX` motion value, `handleDragEnd`, swipe threshold constants, pan gesture config | ~40 |
| `components/request/hooks/use-unsaved-changes.ts` | `hasUnsavedChanges` state, `beforeunload` listener, `showExitConfirm` dialog trigger | ~30 |
| `components/request/flow-error-screen.tsx` | The inline "Unknown service" error JSX block (lines 716-738) | ~25 |

**Result:** `request-flow.tsx` drops to ~635 lines. Main component becomes a pure layout shell that composes hooks + renders `StepRouter` with transitions.

**Risk:** Hooks share state via `useRequestStore`. The hooks must accept store references as params or import the store directly. Prefer direct import -- the store is already a singleton.

---

## 2. `components/seo/healthcare-schema.tsx` (857 lines)

**Current responsibilities:** 18 independent JSON-LD schema generators (`MedicalBusinessSchema`, `OrganizationSchema`, `FAQSchema`, `BreadcrumbSchema`, `HowToSchema`, `MedCertHowToSchema`, `PrescriptionHowToSchema`, etc.).

**Problem:** Each schema function is completely independent -- no shared state, no shared hooks. They're in one file purely by convention.

### Extraction Plan

| Extract To | What Moves |
|-----------|-----------|
| `components/seo/schemas/json-ld-script.tsx` | `JsonLdScript` helper component (shared by all) |
| `components/seo/schemas/medical-business.tsx` | `MedicalBusinessSchema` |
| `components/seo/schemas/organization.tsx` | `OrganizationSchema` + `MedicalOrganizationSchema` alias |
| `components/seo/schemas/medical-service.tsx` | `MedicalServiceSchema` |
| `components/seo/schemas/faq.tsx` | `FAQSchema` |
| `components/seo/schemas/breadcrumb.tsx` | `BreadcrumbSchema` |
| `components/seo/schemas/local-business.tsx` | `LocalBusinessSchema` |
| `components/seo/schemas/article.tsx` | `ArticleSchema` + `HealthArticleSchema` |
| `components/seo/schemas/review-aggregate.tsx` | `ReviewAggregateSchema` |
| `components/seo/schemas/how-to.tsx` | `HowToSchema` + `MedCertHowToSchema` + `PrescriptionHowToSchema` |
| `components/seo/schemas/speakable.tsx` | `SpeakableSchema` |
| `components/seo/schemas/website.tsx` | `WebSiteSchema` |
| `components/seo/schemas/medical-condition.tsx` | `MedicalConditionSchema` |
| `components/seo/schemas/service.tsx` | `ServiceSchema` |
| `components/seo/schemas/index.ts` | Barrel re-export of everything |

**Result:** `healthcare-schema.tsx` becomes a barrel import. Each schema is ~40-80 lines. Existing imports like `import { FAQSchema } from "@/components/seo/healthcare-schema"` continue to work via the barrel.

**Risk:** Near zero. Pure file split with barrel re-export.

---

## 3. `components/email/base-email.tsx` (900 lines)

**Current responsibilities:** 16 exported primitives (BaseEmail layout, Heading, Text, Button, Box, StatusBanner, VerificationCode, List, Divider, DetailRow, HeroBlock, ReviewHero, GoogleReviewCTA, ReferralCTA) + color/font constants.

**Assessment after reading:** This is actually a well-designed primitive library -- similar pattern to `trust-badge.tsx`. The size comes from having many small, focused exports, not from tangled logic. Each primitive is 20-40 lines.

### Extraction Plan (lighter touch)

| Extract To | What Moves | Why |
|-----------|-----------|-----|
| `components/email/email-primitives.ts` | `colors`, `fontFamily` constants + types | Constants are imported by other email templates |
| `components/email/review-cta.tsx` | `ReviewHero` + `GoogleReviewCTA` + `ReferralCTA` (~160 lines) | These are feature-specific, not layout primitives |
| `components/email/verification-code.tsx` | `VerificationCode` (~40 lines) | Standalone auth-specific component |

**Result:** `base-email.tsx` drops to ~700 lines of layout primitives. The review/referral CTAs are domain-specific and belong in their own files.

**Risk:** Low. Email templates import these by name -- barrel re-export keeps compatibility.

---

## 4. `components/doctor/intake-review-panel.tsx` (615 lines)

**Current responsibilities:** Single monolithic function with data loading, lock management (acquire/extend/release), audit logging, AI prefill, clinical notes, approval/decline workflows, certificate preview trigger.

### Extraction Plan

| Extract To | What Moves | Lines Saved |
|-----------|-----------|-------------|
| `components/doctor/hooks/use-intake-lock.ts` | `acquireIntakeLockAction`, `releaseIntakeLockAction`, `extendIntakeLockAction` calls, lock warning state, lock interval management | ~60 |
| `components/doctor/hooks/use-audit-trail.ts` | `logViewedIntakeAnswersAction`, `logViewedSafetyFlagsAction` calls, audit event triggers on data load | ~30 |
| `components/doctor/review-actions.tsx` | Approve/Decline button group + confirmation dialogs + the action dispatch logic | ~100 |

**Result:** `intake-review-panel.tsx` drops to ~425 lines. Main component focuses on data display + layout. Business logic lives in hooks and action components.

**Risk:** Lock management uses intervals that must clean up on unmount. The hook must own the full lifecycle -- test with the existing E2E suite after extraction.

---

## 5. `components/patient/panel-dashboard.tsx` (562 lines)

**Current responsibilities:** PanelDashboard (main, 350 lines) + IntakeCard (75 lines at line 429) + IntakeDetailDrawer (58 lines at line 504). Contains drawer state, status filtering, analytics tracking, 10+ section renders.

### Extraction Plan

| Extract To | What Moves | Lines Saved |
|-----------|-----------|-------------|
| `components/patient/intake-card.tsx` | `IntakeCard` component (lines 429-503) | ~75 |
| `components/patient/intake-detail-drawer.tsx` | `IntakeDetailDrawer` component (lines 504-562) | ~58 |

**Result:** `panel-dashboard.tsx` drops to ~429 lines. `IntakeCard` and `IntakeDetailDrawer` become independently testable.

**Risk:** Near zero. These are already self-contained functions, just co-located.

---

## Execution Order

1. **panel-dashboard.tsx** -- simplest, lowest risk, builds confidence
2. **healthcare-schema.tsx** -- mechanical file split, no logic changes
3. **base-email.tsx** -- light extraction of CTAs
4. **intake-review-panel.tsx** -- hook extraction, needs E2E verification
5. **request-flow.tsx** -- most complex, highest state sharing

## Verification

- `pnpm typecheck` after each extraction
- `pnpm build` after each extraction
- `pnpm test` for any files that have unit tests
- Spot-check the intake flow UI for request-flow changes
