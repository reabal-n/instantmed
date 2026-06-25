# Patient portal post-rebuild audit

> **Date:** 2026-05-11
> **Scope:** `app/patient/`, `components/patient/`, `components/dashboard/`. Compares the post-rebuild patient portal (DESIGN_SYSTEM_VERSION 2.0.2) against the marketing surface quality bar from the platform audit.
> **Predecessor:** the 2026-04-29 audit scored the patient portal 4.5/10 and triggered the v2.0.0 portal rebuild plus the v2.0.1 / v2.0.2 cleanup sweeps.

---

## Headline

**Score: 8.0/10** (was 4.5/10).

The rebuild closed the gap with the marketing surfaces. The "two parallel design systems" risk I flagged in the platform audit is gone: `app/dashboard-styles.css` is removed, the `glass-card` / `dashboard-card` / `glow-badge` / `dashboard-spotlight` shims are deleted, and a CI smoke check (`scripts/check-portal-no-legacy-classes.sh`) prevents regression. The IA was reshaped from a flat 11-section list into a Hero / Activity / Manage three-zone composition. Canonical primitives (`DashboardPageHeader`, `DashboardCard`, `DashboardSection`, `<Heading>`) are used consistently across the portal, with 42+ live references in the patient tree.

The remaining gap to a 9.0+ is execution detail, not architecture: the settings page is dense and could distill, intake state-tracking copy could be more honest about cold-traffic edge cases, and the portal still lacks visual regression coverage equivalent to the marketing surfaces shipped today.

---

## What landed since the 4.5/10 audit

Verified in [`docs/DESIGN_SYSTEM_CHANGELOG.md`](../DESIGN_SYSTEM_CHANGELOG.md) and on disk:

| Change | Status | Evidence |
|---|---|---|
| Patient portal off "21st.dev glass-forward" CSS layer | Done (v2.0.0) | `app/dashboard-styles.css` removed; `lib/__tests__/design-system-retired-shims.test.ts` lines 33-40 enforce its absence |
| `<DashboardCard>` primitive replaces `glass-card` / `dashboard-card` | Done (v2.0.0) | 42 references in `app/patient/`; zero legacy class hits in CI smoke |
| `<DashboardSection>` replaces hand-rolled `flex items-center justify-between mb-5 + h2` | Done (v2.0.0) | `panel-dashboard.tsx` uses it for "Recent Requests", "Active Prescriptions", "Documents Ready" |
| `<DashboardPageHeader>` replaces hand-rolled `text-2xl font-semibold tracking-tight` h1s | Done (v2.0.0) | Visible in `intakes-client.tsx`, `settings-client.tsx`, `messages-client.tsx`, etc. Retired routes now stay out of the active visual contract. |
| Patient dashboard IA: 11 flat sections → Hero / Activity / Manage | Done (v2.0.0) | `panel-dashboard.tsx` lines 34-47 doc the three-zone IA; `<DashboardHero>` resolves the single most important next action |
| `<DashboardHero>` adaptive next-action resolver | Done | Resolves download / answer-doctor / track-review / complete-payment / renew priorities, replaces multiple competing CTAs |
| `intake-status-tracker` migrated off `height: 0 → "auto"` (banned by §12) | Done (v2.0.0) | Now `opacity` + `y` only; respects `useReducedMotion()` |
| "Escalated" status palette normalized to §10 severity step 3 | Done | `bg-orange-100 text-orange-700 border-orange-200` etc, both light + dark |
| Hand-rolled `bg-linear-to-br` / `bg-gradient-to-br` on content surfaces | Done | Migrated to solid `bg-primary/[0.04]` tints in `panel-dashboard`, `referral-card`, `service-selector`, `what-happens-next`, `intake-card`, `profile-todo-card` |
| Deterministic-hash `getEstimatedWaitTime(intakeId)` | Done (pre-rebuild P0 hotfix) | Replaced with honest static range copy |
| Legacy aliases (`GlassStatCard`, `GlowBadge`, `DashboardHeader`, `GlassRadioGroup`) | Done (v2.0.1 + v2.0.2) | All deleted; barrel export tests assert non-presence |

---

## Code health (post-rebuild)

The patient portal source is at the same code-health bar as the rest of the codebase:

- **Zero `console.log / warn / error`** in `app/patient/` (no ESLint-bypass cases).
- **Zero `: any` type usages** in `app/patient/` or `components/patient/` (matches grep also pulls no `@ts-ignore` / `@ts-expect-error`).
- **Reduced motion respected** in `patient-shell.tsx`, `panel-dashboard.tsx`, `intake-status-tracker.tsx`. Asymmetric timing rule from DESIGN.md §12 honoured (enter 0.25s, exit 0.12s).
- **Realtime + RLS handled correctly.** `intakes-client.tsx` lines 60-72 specifically calls out that the browser Supabase client has no auth session and routes refresh via `router.refresh()` (server-side re-render with service role) instead of a direct query that RLS would correctly block.
- **Memo discipline** is applied where it matters: `useMemo(() => createClient(), [])` to avoid the realtime channel resubscription leak.

---

## Findings (what would move it from 8.0 to 9.0+)

Severity scale: P0 (blocks ship), P1 (should fix before launch), P2 (post-launch polish), P3 (nice to have).

### P1 (3 items)

**P1-1: Settings page is dense and could distill.** `app/patient/settings/settings-client.tsx` has six `DashboardCard tier="elevated" padding="none" className="p-6 sm:p-8 space-y-6"` blocks stacked under a tab system. The visual rhythm is correct but the cognitive load is high: a patient looking for "where do I update my Medicare?" has to scan three layers (page → tab → card → section). Run `/distill` and `/clarify` on this page; the same content can be delivered with fewer cards and tighter labels. Priority because patients who can't find the field they need either churn or call support, both of which cost more than 30 minutes of design polish.

**P1-2: Visual regression coverage missing for the patient portal.** Today's commit added `e2e/marketing.visual.spec.ts` with 42 chromium baselines covering 9 marketing surfaces × desktop + mobile × light + dark, plus 6 intake first-step baselines. The patient portal still relies on `dashboard-audit.spec.ts` which only mobile-screenshots a single dashboard per role. The portal was just rebuilt; this is exactly the moment to lock the post-rebuild state so accidental drift fires a CI diff. Add `e2e/patient-portal.visual.spec.ts` covering only current navigable portal surfaces at desktop + mobile, light + dark. Reuse the stabilization helper from the marketing spec.

**P1-3: Intake status tracker copy assumes warm conditions.** `components/patient/intake-status-tracker.tsx` STATUS_STEPS describe "Doctor reviewing" and "Approved" with high confidence ("A doctor is looking at your request"). On a slow day, when the patient submitted an hour ago and the status is still `paid`, "in the queue" needs to read calmly rather than ambiguously. The `pending_info` and `escalated` special cases are well-handled. The risk is the gap between submit and `in_review`: if the patient refreshes during a slow window, the UI says "in the queue" with a clock icon but doesn't surface the live wait counter that the marketing pages show. Bring the same `<WaitCounter />` graceful-degradation rules into the tracker so a logged-in patient sees the same honest wait signal that the public hero shows.

### P2 (4 items)

**P2-1: `data-testid` attributes are absent across `app/patient/`.** All patient-portal E2E tests rely on text matchers (`getByRole`, `getByText`). This is fine until the day a copy sweep changes "Continue" to "Next" and 30 tests fail in unexpected places. Add `data-testid` on the dashboard hero CTA, the intake card, the prescriptions list item, and the settings tab triggers. Cheap, durable, future-proofs the tests against copy iteration.

**P2-2: Dashboard hero does not show priority-review state.** When a patient paid for the priority fee ($9.95 / `is_priority`), the patient-facing dashboard does not surface that on the intake card. They paid for visibility into their priority status; show it.

**P2-3: Onboarding completion ribbon could anchor more aggressively.** The "X/N ready" badge in settings is correct but quiet. On a fresh account where Medicare and address are both missing, the dashboard hero already prompts for them via `<ProfileTodoCard>`. The ribbon could become a sticky bar at the top of the dashboard instead of living inside settings, until completion = 100%. Pair with `/clarify` to nail the copy.

**P2-4: Followup tracker has no graceful empty state for "no follow-ups due".** Patients with one paid med-cert and no follow-up cadence see a `FollowupTrackerCard` shell unless every followup is filtered out, which happens silently. Add a one-line "we'll email you when there's a follow-up to do" state instead of hiding the card; right-sizing what the card means matters more than density on the dashboard.

### P3 (2 items)

**P3-1: `IntakeDetailDrawer` could share more with the operator review panel.** Today, the patient drawer and the operator review panel are different components. They render largely the same fields (reason, dates, status, doctor note). Not urgent, but the drift will compound; consider a shared `<IntakeSummary>` primitive accepting `audience: "patient" | "operator"`.

**P3-2: Skeleton in `app/patient/page.tsx` (`DashboardSkeleton`) is correct but does not match the real layout exactly.** It renders 3 request cards + 2 prescription rows. The real dashboard shows a hero, activity, and manage zones. Tighten to match so the layout-shift on first render is minimal.

---

## What's NOT a finding

A few things I checked and found were already correct so the user does not waste time re-litigating:

- **PHI on the dashboard.** The patient sees their own intake category, dates, and status. The doctor name on documents follows the AHPRA/Medical Director identity rule. No leaks.
- **Realtime subscription.** Channel cleanup is correct; the `useEffect` returns the channel-removal closure.
- **Reduced motion.** Honoured everywhere I checked.
- **`useEffect` dependencies.** The intake-status-tracker subscription does what the comment says.
- **Mobile layout.** `pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8` reserves correct bottom space for the mobile nav + iOS safe area. Tap targets meet the 48px floor.

---

## Comparison to the marketing surfaces (the original concern)

The platform audit flagged that "marketing pages I just inspected are top-decile; if the post-checkout patient experience doesn't match, you'll lose retention/referral the moment a real cohort starts using it." Post-rebuild, that concern is largely resolved.

| Dimension | Marketing | Patient portal (post-rebuild) | Gap |
|---|---|---|---|
| Solid-depth surfaces, sky-toned shadows | Yes | Yes | None |
| `<Heading>` and canonical primitives | Yes | Yes (`DashboardPageHeader`, `DashboardCard`, `DashboardSection`) | None |
| 16px+ body, 48px tap targets | Yes | Yes | None |
| Reduced-motion respected | Yes | Yes | None |
| Live wait counter signal | Yes (hero) | Partial (intake card status only) | P1-3 |
| Visual regression coverage | Yes (today's commit) | No | P1-2 |
| Voice / banned-phrase enforcement | Yes (CI-enforced) | Same constants | None |
| Dark mode parity | Yes | Yes | None |

---

## Recommended next actions (post-this-session)

1. **Ship the P1 items first.** Visual regression baselines for the patient portal (P1-2) is the cheapest of the three and unlocks safe future iteration. `/distill` on settings (P1-1) is roughly half a day. Surfacing the live wait signal inside the intake tracker (P1-3) is a small frontend change that pulls from the existing `lib/brand/wait-counter.ts`.
2. **Run the same audit on the doctor + admin portals.** Per the v2.0.2 changelog, the admin and doctor compatibility-stylesheet imports were removed but the broader IA / primitive sweep noted in v2.0.0 was patient-only. The doctor portal audit was running in parallel per the 2026-04-29 memory; verify it actually shipped.
3. **Don't re-audit until P1s land.** The 4.5 → 8.0 jump came from the rebuild. The next jump will come from concrete user feedback once a real cohort is on the platform. Don't keep paying for synthetic audits when patient session recordings will tell you more.

---

**Cross-references:**

- [`docs/DESIGN_SYSTEM_CHANGELOG.md`](../DESIGN_SYSTEM_CHANGELOG.md) v2.0.0 / v2.0.1 / v2.0.2 entries
- [`scripts/check-portal-no-legacy-classes.sh`](../../scripts/check-portal-no-legacy-classes.sh), CI smoke that enforces the cleanup
- [`lib/__tests__/design-system-retired-shims.test.ts`](../../lib/__tests__/design-system-retired-shims.test.ts), unit-test asserting the shim files do not return
- [`components/dashboard/`](../../components/dashboard/), canonical primitives the patient portal now uses
- [`e2e/marketing.visual.spec.ts`](../../e2e/marketing.visual.spec.ts), the visual regression spec the patient portal should mirror
