# Task 11 Report: Specialty Public-Page and No-Friction Browser Proof

## Status

PASS for the scoped product behavior on the current branch.

The committed Playwright runner could not execute test bodies because the local Playwright cache does not contain the exact Chromium headless-shell revision it requests. This is a harness limitation, not a product failure; the same cases were exercised interactively in fresh real-browser sessions and the affected specs parse and enumerate correctly.

Series base supplied for this task: `03f706d5f`

Final implementation HEAD exercised: `15bc733ed`

Proof roots, both outside tracked source:

- landing, reflow, cohort, and unavailable-state evidence: `/tmp/instantmed-task11.KPkyGd/`
- privacy-minimised intake-flow evidence: `/tmp/instantmed-task11-flow-8mMBwH/`

## Outcome Matrix

| Case | Result | Evidence |
|---|---|---|
| Hair landing, 1440px and 390px, light and dark | PASS | Exact canonical, one exact H1, practical facts adjacent to hero, readable contrast, no horizontal overflow or semantic clipping, no browser/page errors, and a fixed 48px mobile CTA after scroll |
| ED landing, 1440px and 390px, light and dark | PASS | Same checks as Hair; intentional quiet `See how it works` link remains secondary to one primary CTA |
| 200% zoom proxy, reduced motion, keyboard, and reflow | PASS after scoped repair | 195 CSS px proxy has document width 195/195, whole-word H1 wrapping, no header overlap, logical visible focus, operable 48px menu, and no active motion |
| Hero/sticky CTA subtype and cohort routing | PASS after scoped repair | Hair claims only `spx_h1_20260828`; ED claims only `spx_e1_20260828`; untagged and invalid/cross-service tokens remain null; arbitrary landing query parameters do not propagate |
| Safe guest Hair intake | PASS | Exactly six screens through Review/Pay, $49.95 action enabled, payment not clicked |
| Safe guest ED intake | PASS | Exactly five screens through Review/Pay, $49.95 action enabled, payment not clicked |
| Hair reproductive terminal and correction | PASS | Terminal block appeared; correction returned to Health, cleared the contraindicating answer, and preserved unrelated safety work |
| ED nitrate terminal and correction | PASS | Terminal block appeared; correction returned to Health with the nitrate answer corrected |
| IHI-only identity and structured address | PASS | No Medicare inputs were required; incomplete structured address was blocked with field/address validation; a complete synthetic structured address permitted Review/Pay |
| Unavailable Hair and ED | PASS after scoped repair | Notice is visibly below the navbar at 390 and 195 CSS px, `/contact` is the only acquisition destination, no `/request` link or cohort/draft is started, and the notice scrolls with content |
| Committed Playwright execution | HARNESS BLOCKED | Exact expected headless-shell build 1223 is absent locally; cached builds are 1217 and 1228. Failure occurred at browser launch before test bodies. Dependency versions were not changed and no browser build was fetched. |

## Landing-Page Proof

Both money pages were inspected at 1440x900 and 390x844 in light and dark themes.

### Hair

- route: `/hair-loss`
- canonical: `https://instantmed.com.au/hair-loss`
- exact single H1: `Private hair loss assessment, from home.`
- practical block immediately after the hero: `pricing`
- visible fact labels: Eligibility, Review fee, Assessment, If approved
- exact active CTA destination: `/request?service=consult&subtype=hair_loss&growth_experience_version=spx_h1_20260828`

### ED

- route: `/erectile-dysfunction`
- canonical: `https://instantmed.com.au/erectile-dysfunction`
- exact single H1: `Private ED assessment, from home.`
- practical block immediately after the hero: `how-it-works`
- visible fact labels: Eligibility, Review fee, Assessment, If approved
- exact active CTA destination: `/request?service=consult&subtype=ed&growth_experience_version=spx_e1_20260828`

Heading order was one H1 followed by ordered H2 content on both pages. At 390px the document and viewport widths both measured 390px. After scrolling, each mobile sticky region remained fixed at `bottom: 0`, filled the 390px viewport without overflow, and exposed a 48px primary CTA.

Representative screenshots:

- `/tmp/instantmed-task11.KPkyGd/hair-desktop-1440-light.png`
- `/tmp/instantmed-task11.KPkyGd/hair-desktop-1440-dark.png`
- `/tmp/instantmed-task11.KPkyGd/hair-mobile-390-dark-sticky.png`
- `/tmp/instantmed-task11.KPkyGd/ed-desktop-1440-light.png`
- `/tmp/instantmed-task11.KPkyGd/ed-desktop-1440-dark.png`
- `/tmp/instantmed-task11.KPkyGd/ed-mobile-390-dark-sticky.png`

Sampled foreground/background contrast ratios were at least 5.17:1 in light mode and 6.92:1 in dark mode across the H1, body copy, labels, values, and primary CTA samples. No console errors, page errors, or HTTP 4xx/5xx responses were observed; console output was limited to local-development notices and the intentionally failed-open local feature-flag lookup.

## Reflow, Reduced Motion, and Keyboard Proof

The 200% zoom proxy used a 195x422 CSS-pixel viewport with device scale factor 2 and reduced motion enabled.

The initial inspection found a real WCAG reflow defect on both pages: the visible wordmark overlapped the 48px menu target by 29px. ED also broke `assessment` mid-word. The pre-fix receipts are:

- `/tmp/instantmed-task11.KPkyGd/hair-zoom200-reduced-light.png`
- `/tmp/instantmed-task11.KPkyGd/ed-zoom200-reduced-light.png`

Commit `579f4254c` applies the narrowest responsive correction: at no more than 240px the wordmark text hides while the brand icon and `InstantMed home` accessible name remain, and the exact H1 uses a 28px size with whole-word wrapping. Ordinary 390px rendering continues to show the complete wordmark and 36px H1.

After repair:

- document width equals viewport width at both 195 and 390 CSS px;
- header/menu overlap is zero;
- the menu target remains 48px and opens by keyboard;
- focus order is Skip to main -> InstantMed home -> Open menu -> hero CTA;
- focus indication is visible, Escape closes the drawer, and focus returns to the menu;
- both pages retain exactly one H1 with unchanged text;
- reduced-motion inspection found no active animations or transitions.

After screenshots:

- `/tmp/instantmed-task11.KPkyGd/hair-zoom200-reduced-light-after.png`
- `/tmp/instantmed-task11.KPkyGd/ed-zoom200-reduced-light-after.png`
- `/tmp/instantmed-task11.KPkyGd/hair-mobile-390-light-after-fix.png`
- `/tmp/instantmed-task11.KPkyGd/ed-mobile-390-light-after-fix.png`

## CTA and Cohort Ownership Proof

Hero and sticky CTAs carried only `service`, `subtype`, and the allowlisted opaque cohort. Test landing URLs containing arbitrary `foo`, `utm_source`, or invalid cohort values did not propagate those parameters into either CTA.

The first fresh-session browser run exposed an attribution race: a valid tagged entry could reach the correct service/subtype but persist a null cohort. Commit `99147e26c` repaired the immediate fresh-entry claim. Independent review then identified a higher-priority ownership edge: a fallback or expired unrelated draft could permanently suppress a genuine fresh claim. Commit `69d3855e3` makes the ownership decision after authoritative hydration, selects the requested service's scoped state before URL seeding, treats only unexpired same-request-service patient work as authoritative, preserves active Review/Pay work, keeps explicit draft recovery ineligible, and waits for the matching subtype before claiming.

Six brand-new current-bundle browser contexts were then allowed to settle for 6000ms each:

| Entry state | URL invitation | Persisted result |
|---|---|---|
| recent unrelated med-cert work | tagged Hair | H1, `hair_loss`, `hair-loss-goals` |
| expired consult work | tagged ED | E1, `ed`, `ed-goals` |
| active same-consult Review/Pay with null cohort | tagged same specialty | null remains authoritative |
| active same-consult Review/Pay with stored E1 | later Hair H1 invitation | E1/ED/Review remains authoritative |
| Hair route carrying the ED token | wrong-service token | null |
| direct untagged Hair start | none | null |

This also verifies that an untagged direct start remains untagged and that an invalid or cross-service token cannot be claimed.

## No-Friction Intake Proof

A separate fresh browser process (`task11-marker-8mMBwH`) walked safe synthetic guest flows without submitting payment.

Hair remained exactly six screens:

1. `hair-loss-goals` — Goals
2. `hair-loss-assessment` — Pattern
3. `hair-loss-health` — Health
4. `hair-loss-preferences` — Preferences
5. `details` — Details
6. `review` — Pay

ED remained exactly five screens:

1. `ed-goals` — About
2. `ed-health` — Health
3. `ed-preferences` — Treatment
4. `details` — Details
5. `review` — Pay

Both reached `One last check`; consent could be checked and the $49.95 Pay action became ready. It was never clicked. H1/E1 introduced no new field, required answer, screen, or progressive reveal.

The same process verified both clinical terminal/correction paths and the IHI/address gate described in the outcome matrix. Browser errors were empty. Its 213 observed requests were localhost-only; POSTs were limited to the locally stubbed `/api/draft` and Next development endpoints. There was no checkout, Stripe, vendor, analytics, Supabase, database, or payment request.

The full-flow receipt was captured at `95df20840`. The later `69d3855e3` change is limited to entry-time hydration/cohort ownership and was re-proven at the first subtype screen in six fresh current-HEAD contexts; the later unavailable-banner change does not touch intake. The screen-count receipt therefore remains valid while the version boundary is stated explicitly.

Privacy handling: screenshots that contained filled synthetic identity fields, selected clinical answers, or terminal outcomes derived from them, and the HAR containing request bodies, were removed from the temporary proof set and are not referenced in this report. The retained flow screenshots show only unfilled first screens:

- `/tmp/instantmed-task11-flow-8mMBwH/hair-01-goals.png`
- `/tmp/instantmed-task11-flow-8mMBwH/ed-01-about.png`

No real patient data was used or accessed.

## Unavailable-State Proof

`/api/availability` was locally stubbed with consults unavailable for both money pages.

The first browser inspection found that the notice existed in the accessibility tree and had a layout box, but its center was visually covered by the fixed navbar. The page already sent CTAs to `/contact` and did not start a cohort, so the repair stayed confined to visibility and occlusion.

Commit `15bc733ed` moves the shared unavailable banner into normal flow below the fixed navigation with safe-area-aware spacing and adds a durable center-point `elementFromPoint` assertion to both money-page E2E cases.

Current proof:

- at 390px the banner begins at y=80 after the navbar ends at y=74;
- at 195 CSS px the notice reflows without horizontal overflow and leaves the H1 and CTA unobscured;
- its center point resolves to the notice, not the navbar;
- the notice is `position: relative`, scrolls away with the document, and adds no sticky friction;
- the 48px `/contact` CTA remains operable;
- there are no `/request` links in the unavailable acquisition surface;
- clicking `/contact` creates neither a specialty cohort nor a draft;
- dark-mode notice text measured 9.49:1 after compositing the translucent warning surface.

Before/after receipts:

- before: `/tmp/instantmed-task11.KPkyGd/hair-mobile-390-unavailable-light.png`
- before: `/tmp/instantmed-task11.KPkyGd/ed-mobile-390-unavailable-light.png`
- after: `/tmp/instantmed-task11.KPkyGd/hair-mobile-390-unavailable-light-after.png`
- after: `/tmp/instantmed-task11.KPkyGd/ed-mobile-390-unavailable-dark-after-final.png`
- after at 195 CSS px: `/tmp/instantmed-task11.KPkyGd/hair-zoom200-unavailable-light-after-final.png`

## Focused Regression Evidence

### Reflow and CTA contract

- The new narrow-header/H1 contract failed before `579f4254c` and passed after it.
- The complete marketing request reflow contract passed: 1 file, 15 tests.
- A stale ED assertion was reproduced: it expected two full-weight CTA classes even though E1 intentionally has one primary CTA plus the quiet `See how it works` link. Commit `95df20840` parameterises the truthful counts: ED 1; UTI 2; pill 2. No duplicate CTA or class was added.

### Cohort ownership

The final directly affected suite passed: 10 files, 128 tests:

- `draft-storage.test.ts`
- `request-draft-restore.test.ts`
- `specialty-experience-attribution-contract.test.ts`
- `specialty-experience-registry.test.ts`
- `specialty-landing-analytics-contract.test.ts`
- `specialty-experience-invariants.test.ts`
- `posthog-personless-analytics.test.ts`
- `request-initial-url-seeding.test.ts`
- `request-store-hydration.test.ts`
- `intake-draft-lifecycle.test.ts`

RED evidence covered unrelated med-cert work, expired consult work, active same-consult Review/Pay work, explicit recovery, direct untagged entry, wrong-service/subtype tokens, subtype readiness, and legacy allowlist migration before the final implementation passed.

### Static and browser-spec checks

- scoped ESLint over every changed TypeScript/TSX file: passed
- `corepack pnpm typecheck`: passed
- `git diff --check`: passed
- unavailable-state Playwright collection: exactly two matching tests listed and parsed
- targeted Playwright launch: five selected cases failed at 0ms before test code because Chromium headless shell revision 1223 was missing; HTML report is `/tmp/instantmed-task11.KPkyGd/playwright-report/index.html` and runner receipt is `/tmp/instantmed-task11.KPkyGd/playwright-results/.last-run.json`

No dependency version, lockfile, browser cache, or stack pin was changed.

## Defects Found and Scoped Repairs

| Defect | Before | Repair | Commit |
|---|---|---|---|
| 200% reflow header overlap and ED mid-word H1 break | 29px brand/menu overlap; `assessment` split | Hide only wordmark text at <=240px; retain icon/name/48px menu; narrow H1 with whole-word wrapping | `579f4254c` |
| Fresh tagged entry could lose its cohort | correct route/subtype, persisted cohort null | claim the allowlisted invitation for genuinely fresh entry | `99147e26c` |
| fallback/expired unrelated work could suppress a genuine claim | draft fallback was treated as authoritative before hydration | decide ownership from hydrated, unexpired, same-request-service work; preserve active target work and recovery authority | `69d3855e3` |
| ED reflow test contradicted the approved E1 hierarchy | expected two equal-weight CTA classes | parameterise ED=1 while preserving UTI/pill=2 | `95df20840` |
| unavailable notice visually covered by fixed nav | accessibility-visible box, occluded center | place notice below nav in normal flow and assert center-point visibility | `15bc733ed` |

## Skill Gates and Their Influence

- `audit` required semantic heading, canonical, contrast, keyboard, visible-focus, target-size, occlusion, and error/network checks. Its occlusion gate converted two superficially visible states into real scoped defects.
- `adapt` required explicit 1440, 390, and 195 CSS-pixel breakpoint proof. It drove the narrow header/H1 correction while preserving ordinary 390px behavior.
- `polish` required light/dark parity, sticky-region geometry, safe-area spacing, and final before/after screenshots. It kept the unavailable notice calm, non-sticky, and separated from both navbar and hero.
- `instantmed-ui-browser-verification` kept evidence on the sanctioned local browser path, separated interactive receipts from the committed E2E harness, and required console/network review.
- `agent-browser` supplied the interactive accessibility tree, keyboard, geometry, storage, and screenshot workflow; its full core instructions were loaded before browser work.
- TDD gates required a witnessed failing contract before each repair, then focused GREEN, regression, lint, typecheck, and browser reproof.

## Authority and Safety

- Synthetic data only; no production or real-patient data was accessed.
- No payment was submitted.
- No deployment, live API, Ads account, database, analytics vendor, Stripe, Supabase, or external mutation occurred.
- The local server used deliberately non-routable local stub endpoints for external integrations.
- User-owned untracked `output/` was untouched.
- No intake friction, medicine-name copy, price, clinical eligibility rule, or external campaign state changed.

## Residual Risks

1. The committed Playwright test bodies still need execution when the exact pinned Chromium headless-shell revision is available. Installing or changing that browser build was intentionally deferred; the runner failure is preserved as evidence rather than hidden by a dependency change.
2. The full safe flow traversal was recorded at `95df20840`, while current HEAD includes the later entry-time cohort-ownership repair. Fresh current-HEAD first-screen and ownership-matrix browser proof plus 128 focused unit regressions cover that delta, but a same-build end-to-end rerun remains the strongest release-gate receipt once the browser harness is restored.
3. Browser proof is local development evidence, not production deployment proof. No deployment was in scope.

## Commits

- `579f4254c` — `fix(marketing): preserve specialty reflow at 200% zoom`
- `99147e26c` — `fix(growth): claim specialty cohorts on fresh intake entry`
- `95df20840` — `test(marketing): align ED reflow CTA contract`
- `69d3855e3` — `fix(growth): preserve specialty cohort ownership on hydration`
- `15bc733ed` — `fix(marketing): keep unavailable notice below navigation`
