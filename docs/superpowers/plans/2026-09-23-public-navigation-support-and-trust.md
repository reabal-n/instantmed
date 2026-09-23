# InstantMed Public Navigation, Support and Trust Implementation Plan

> **Status: DRAFT FOR FABLE REVIEW. Do not implement.** Rey requested a comprehensive plan on 2026-09-23, with Fable review before implementation. Review does not itself authorise deployment.
>
> **For agentic workers:** After review and Rey's implementation approval, use `superpowers:executing-plans` task by task. Check the actual checkout before starting; do not repeat completed work or assume this draft is approved.

**Goal:** Make it easy to choose a service, understand the evidence, find support and navigate on a phone, with less repetition and no loss of clinical, privacy or legal information.

**Architecture:** Refine the existing shared Navbar, Footer, Hero and contact page. Separate operational status, independent reviews, certifications and practical reassurance into distinct components and locations. Use existing auth, service-availability, analytics and design primitives.

**Tech stack:** Next.js 15.5.24, React 18.3.1, TypeScript, Tailwind 4.2.2, Framer Motion 11.18.2; Node 24 and pnpm 10.23.0. No dependency or stack upgrades.

**Spec:** The supplied requirements and proposed design are captured in sections 1–4 below. This combined review document is intentionally not an approved specification. Fable should resolve the decisions in section 10 before execution.

## 1. Scope, authority and current baseline

Sources: this conversation; AGENTS.md; DESIGN.md; PRODUCT.md; docs/BRAND.md; docs/VOICE.md; docs/PRIMITIVES.md; docs/ADVERTISING_COMPLIANCE.md; docs/SEO_CONTENT_POLICY.md; docs/ROADMAP.md; implementation files listed below.

The roadmap prioritises women's-health growth and diagnosis of mobile certificate checkout abandonment. This work supports public usability and support access; it does not replace that queue, establish a checkout-abandonment cause, authorise advertising changes or promise revenue uplift.

### Already implemented locally in this conversation

| Commit | Delivered | Evidence boundary |
|---|---|---|
| `d3c01c6ad` | Desktop Services / How it works / Pricing / Contact us / account / Get started; expandable mobile Services; footer directory reduced to six links; trust badges retained; signature and apple tagline removed; certificate guidance disclosure; site-map links retained | Earlier local browser checks, lint, typecheck and 99 focused tests. No deployment established in this conversation. |
| `8df290876` | ProductReview logo and five stars replace Google review stars; links to the listing; dated rating configuration; relevant docs/contracts updated | Listing observed at 5.0/5 on 2026-09-23; earlier local rendering checks, lint, typecheck and 56 tests. Rating is a manual snapshot, not a live feed. |

Recheck branch, working tree, commits and any intervening changes before execution. These commits are the starting point, not items to rebuild. Full build, full E2E, CI and production verification were not established by those local results. Local browser checks reported PostHog fetch failures; do not call analytics delivery verified.

### Settled user decisions

- Keep the trust badges, but organise their placement and spacing.
- Keep the new direct Contact us navigation and simpler footer.
- Use ProductReview's logo plus five stars instead of Google review stars. The earlier recommendation to remove review stars entirely is superseded.
- Keep Google certification distinct from review ratings and clinical credentials.
- Remove redundant AHPRA/service-label text from the large top announcement treatment.
- Fable reviews this plan before implementation.

### Non-goals

No new services, intake redesign, checkout/payment changes, clinical-policy changes, support automation, provider replacement, review solicitation, new review excerpts, rating schema, advertising spend, public release, or dependency upgrades. Do not change public URLs, the identity model or request fulfilment. Optional enhancements below are not prerequisites to the core cleanup.

## 2. Proposed experience

### Navigation

Desktop: `Logo | Services ▾ | How it works | Pricing | Contact us | Log in/account | Get started`.

Use 14px minimum navigation text, moving toward 16px where space permits. Aim for a roughly 56–64px header, but do not force a fixed height when text enlarges. Switch to the mobile layout before items collide, including with the wider signed-in Dashboard label. Preserve the existing role-aware account handoff.

Mobile: simple, consistently styled text rows for Services, How it works, Pricing and Contact us. Services expands to six service links. Avoid coloured icon tiles for some rows and plain text for others. Keep Get started and account access easy to reach, but allow scrolling when short viewports or enlarged text make a fixed action area obstructive.

### Hero and trust hierarchy

1. **Above the headline:** a quiet service-specific operational status line, with no white capsule, stars, AHPRA label, service slogan or dangling separators.
2. **Headline and explanatory copy:** explain the service and essential clinical boundaries. This is where the patient's task gets priority.
3. **Primary action:** one relevant reassurance immediately adjacent, normally the approved refund promise. Do not remove clinically necessary prescribing/call qualifications to meet a visual quota.
4. **Independent reviews:** one compact linked ProductReview logo-and-stars row below the CTA/reassurance group. It is visually separate from the wait status and from certification. Default proposal: only the marketing landing pages that currently inherit the review badge, not support/legal pages, guides, intake or staff surfaces.
5. **Footer:** one organised certification/payment group and one quieter factual reassurance group. Google and LegitScript move out of the default hero. Trust & Safety explains what each mark does and does not mean.

This placement reconciles the user's ProductReview decision with the earlier 'wait information only above the headline' recommendation. Do not silently remove ProductReview or keep it inside a renamed multi-purpose pill.

### Footer

Brand/support details, then **Help** before **About**, followed by certification/payment marks, factual reassurance, emergency wording and legal/entity information.

- Help: Contact us, FAQs, Verify a certificate.
- About: About InstantMed, Health Guides, What we won't do.
- Phone: show '24/7 voice message support'; this does not imply a live staffed telephone line or immediate reply.
- Retain Stripe, LegitScript, Google certification and the existing footer reassurance information, subject to factual review.
- Keep Privacy, Terms, Refund, Complaints, Trust & Safety, Site map and ABN accessible. Do not put emergency or legal information behind a collapsed accordion.
- No new promotional slogan, signature or directory column.

### Contact page

Compact heading and one sentence, followed immediately by practical actions and the form. 'View my request' is available without making login a requirement for contacting support. Desktop can retain a two-column layout; on mobile use a short support-action group followed by the form, with detailed company/complaints information below.

Remove the repeated 'real humans' promotional section, empty response-stats wrapper and unrelated credibility/live clinical wait sections. Remove the large acquisition banner from the support flow; retain the standard navigation action. Keep email, accurately labelled voice-message support, FAQs and formal complaints access.

## 3. Requirements coverage

| Conversation recommendation | Planned treatment | Task |
|---|---|---|
| Larger nav text | 14–16px with collision-driven breakpoint | 1 |
| Consistent mobile navigation | Plain text rows and consistent disclosure styling | 1 |
| Larger tap targets | Target 44×44 CSS px or equivalent full-row hit area; legal links wrap rather than crowd | 1, 2 |
| Clear support phone label | Explicit voice-message wording | 2, 4 |
| Help before About | Visual and DOM order agree | 2 |
| Simpler Contact | Remove repeated marketing blocks; support/form first | 4 |
| Existing-request shortcut | Reuse guarded auth return flow; retain guest access to contact | 4 |
| Remove Popular pages duplication | Remove redundant homepage strip after link audit | 5 |
| Reduce repeated trust sections | Route inventory and explicit ownership of each signal | 3 |
| Plain certificate guidance labels | Dedicated navigation labels, preserving page titles and meaning | 5 |
| Short-screen sticky checks | Viewport, keyboard, zoom and safe-area matrix | 6 |
| Measure support discoverability | Small allowlisted event set and honest comparison | 7 |
| Remove AHPRA / Routine short absences from top pill | Remove label from operational status composition | 3 |
| Preserve wait evidence/timeframe | One wrapping text container; unchanged metric semantics | 3 |
| Replace Google review stars | Already done; retain ProductReview and define its separate placement | 3 |
| Move hero certifications into footer | Default Hero no longer injects them; deliberate trust-page exception | 2, 3 |
| Balance marks and spacing | Equal visual treatment, intrinsic proportions, responsive grouping | 2 |
| Separate certifications from reassurance | Two distinct groups with descriptive semantics | 2 |
| Explain Google qualification | Accessible visible explanation on Trust & Safety; never imply endorsement | 2, 3 |

## 4. Additional recommendations worth including

These address concrete adjacent weaknesses without expanding into a site redesign.

1. **Repair wait-time wrapping at the source.** `WaitCounter` currently places text fragments and a strong element directly inside an inline-flex container. Wrap the entire sentence in one text element beside the dot so '~24 min' and the timeframe do not form separate columns on mobile.
2. **Distinguish historical performance from current availability.** A retrospective median is not a promised turnaround or proof a doctor is currently online. Keep the service name, observation window and existing stale/hidden-state rules intact.
3. **Audit fallback truthfulness.** The shared hero has an 'Open now' fallback; WaitCounter also defines queued/standby states. Establish which are reachable on public routes before changing display. Do not expose legacy 'next session' hours copy on a 24/7 service, or show a personalised queue position on an anonymous page. Escalate any actual policy mismatch separately rather than silently changing clinical operations.
4. **Make review provenance maintainable.** Keep the listing URL, actual rating and verification date together. Specify who rechecks the manual snapshot; do not claim live synchronisation. If the score changes, represent it accurately rather than rounding up to five full stars. Verify logo-use conditions and do not distort the logo.
5. **Fix semantic link mismatches.** Contact's current 'See how it works' CTA points to `/faq`. Removing that banner resolves this instance; check retained help labels against destinations.
6. **Separate attempted from successful contact submission.** The current `contact_form_submitted` capture occurs before the server result. Do not use it as a delivered-message metric. Preserve or migrate event meaning explicitly; never silently reinterpret historical charts.
7. **Keep support form failures recoverable.** Preserve entered text when delivery fails, prevent duplicate submits while pending, keep validation accessible, and show success only after the action confirms success. Verify existing behaviour before changing it.
8. **Check actual focus, contrast and reduced motion.** Subtle grey links and small legal text need measured checks, not aesthetic judgement alone. Do not add ornamental animation to compensate for removed content.

Optional later work: improve service-dropdown descriptions from observed user confusion; revisit the contact reason categories after seeing anonymised usage; run a separate service-page first-screen audit. These are not authorised implementation tasks in this draft and must not displace current roadmap work.

## 5. Implementation sequence and file ownership

Each task should be independently reviewable and committed separately after its checks. Add behavioural tests for changed interactions; do not add brittle source-string tests merely to pin class names. Existing source contracts must be revised to express the approved final behaviour, not weakened to make failures disappear.

### Task 1 — Navigation readability and interaction

**Files:** `components/shared/navbar.tsx`, `components/shared/navbar/animated-nav-link.tsx`, `components/shared/navbar/user-menu.tsx`, `components/shared/navbar/services-dropdown.tsx`, `components/shared/navbar/mobile-menu-content.tsx`, `components/shared/navbar/mobile-drawer.tsx`, `components/ui/animated-mobile-menu.tsx`.

- [ ] Reproduce current text sizes, target dimensions and keyboard paths on logged-out and synthetic signed-in states.
- [ ] Increase text/targets; use a content-fit breakpoint and consistent mobile rows. Keep Services disclosure and disabled-service behaviour.
- [ ] Verify open/close, Enter/Space activation, Tab/Shift+Tab containment, Escape, focus return, navigation after drawer close and account handoff.
- [ ] Verify the menu remains usable after reopening, resizing and toggling reduced motion; preserve existing motion contracts.
- [ ] Update relevant cases in `e2e/money-pages-foundations.spec.ts` and `e2e/marketing-dashboard-nav.spec.ts`; run focused routing and reduced-motion contracts; commit.

**Acceptance:** Contact is visible in the collapsed-services mobile menu without scrolling at 390×844; all items remain reachable on shorter screens. No header collisions, clipped focus rings, horizontal overflow or hidden last action. Keyboard order matches the visual order.

### Task 2 — Footer organisation and certification presentation

**Files:** `components/shared/footer.tsx`, `lib/marketing/homepage.ts`, `components/marketing/google-ads-cert.tsx`, `components/marketing/legitscript-seal.tsx`, `components/checkout/trust-badges.tsx`, `components/shared/trust-badge.tsx`, `app/trust/trust-client.tsx`.

- [ ] Inventory all usages before modifying badge primitives; preserve checkout-specific behaviour and content.
- [ ] Move Help before About, add the phone label and improve link hit areas/text legibility.
- [ ] Prefer one compact shared certification-row composition where reuse is real; do not build a general badge framework.
- [ ] Use a deliberate mobile grid or stack. Remove the visually dominant Google card treatment, or give the entire group a common restrained presentation. Retain intrinsic logo proportions and readable LegitScript artwork.
- [ ] Preserve the LegitScript verification link, correct Google advertising qualification and truthful Stripe description. Avoid a group heading such as 'Accredited by' that would misrepresent these different relationships.
- [ ] Keep the factual reassurance row separate. Make relevant existing links usable without adding repetitive cards or unsupported certification claims.
- [ ] Check footer variants, all logos loading, light/dark contrast, wrapping and keyboard focus; update applicable tests and commit.

**Acceptance:** All requested badges remain; none is clipped or disproportionately dominant. At 320px, 390px and desktop widths, marks form intentional rows with consistent gaps. Emergency and legal content remains visible and the ABN does not fragment unnecessarily.

### Task 3 — Hero status, ProductReview and trust repetition

**Files:** `components/marketing/hero.tsx`, `components/marketing/wait-counter.tsx`, `components/marketing/product-review-badge.tsx`, `lib/social-proof/index.ts`; inspect `lib/brand/wait-counter.ts` and `lib/brand/wait-counter-types.ts` without changing metric logic; all shared Hero callers, including `components/marketing/med-cert-landing.tsx` and `app/(marketing)/page.tsx`.

- [ ] Build a route matrix of status, review, reassurance and certification slots. Distinguish shared defaults, custom slots, paid variants and informational pages before editing defaults.
- [ ] Remove redundant pill labels, capsule styling and separators from the top status treatment. Keep service-availability gating.
- [ ] Wrap the full wait sentence as text beside the indicator. Preserve observation window, approximate value, service label and metric computation; avoid an empty reserved badge when hidden.
- [ ] Exercise live, missing-data, hidden, queued and standby fixtures. Verify reachability and approved public fallback before retiring or replacing legacy wording.
- [ ] Place ProductReview below the CTA/reassurance group as a separate linked element on the approved route set. Keep stars directly associated with the logo and accurate accessible label. No review text, counts or aggregate-rating schema.
- [ ] Remove default hero Google/LegitScript injection; retain footer marks and deliberate explanatory usage on Trust & Safety. Inspect explicit overrides so duplicates do not survive accidentally.
- [ ] Keep one refund reassurance adjacent to the action; remove redundant nearby repetition only after preserving necessary clinical qualifications.
- [ ] Update `landing-hero-contract`, `marketing-copy-contract`, `social-proof-banned-metrics`, relevant wait-state and paid-route guards, `DESIGN.md`, `docs/BRAND.md`, `docs/PRIMITIVES.md` and design changelog as appropriate; commit.

**Acceptance:** Top status contains operational information only. ProductReview is present once on the approved landing surfaces and links to the correct listing. The wait sentence reads naturally at narrow widths and 200% text size. No future turnaround guarantee, fabricated live activity, misleading credential or duplicated hero certification row.

**Review note:** The earlier operator-approved ProductReview exception in `docs/ADVERTISING_COMPLIANCE.md` records requested display scope, not independent legal clearance. Fable should assess the consistency of the proposed placement with the public-claims policy; do not treat passing tests or other sites' badges as legal proof. Preserve Rey's requested design while identifying any concrete release blocker.

### Task 4 — Contact as a support task

**Files:** `app/contact/contact-client.tsx`, `app/contact/page.tsx`; inspect `app/actions/contact-form.ts`, `lib/navigation/auth-handoff.ts`, `lib/auth/redirects.ts` and existing sign-in flow. Preserve server delivery, validation and abuse controls.

- [ ] Reduce the heading area and delete the repeated promotional/empty blocks described in section 2.
- [ ] Present request access, email and voice-message support concisely; keep the form close to the top and accessible without login.
- [ ] Add 'View my request' using the existing safe post-sign-in redirect machinery and verified patient destination. Do not link everyone directly to the staff `/dashboard`.
- [ ] Verify signed-out return, signed-in patient, expired session, staff visiting the public page and users whose original request was made as a guest. Do not invent a guest lookup endpoint or auto-create an account; retain the support route when request access is unavailable.
- [ ] Preserve complaints timing from approved claims. Do not convert clinical queue wait times into support response promises.
- [ ] Test empty/invalid input, keyboard validation, pending submit, failure/retry with text preserved and confirmed success through isolated delivery stubs. No live support email during browser QA.
- [ ] Remove or replace raw error strings in contact analytics with fixed error categories as part of Task 7, without changing user-visible error handling unintentionally.
- [ ] Commit with local visual and interaction evidence.

**Acceptance:** At 390×844, users see the contact purpose, useful support actions and the beginning of the form without passing a marketing section. Desktop presents methods and form together. Login is optional for contacting support. Success requires a successful server-action result; production delivery remains a separate verification layer.

### Task 5 — Remove redundant link blocks without losing discovery

**Files:** `app/(marketing)/page.tsx`, `components/marketing/home-service-links.tsx`, `components/marketing/med-cert-reason-links.tsx`, `lib/marketing/med-cert-intent-config.ts`, `app/sitemap-html/page.tsx`, related SEO indexing contracts.

- [ ] Confirm all destinations from HomeServiceLinks remain available through navigation, page content or site map. Remove the homepage's duplicate Popular pages strip; retire the component only if no consumers remain.
- [ ] Keep the certificate-guidance disclosure server-rendered, keyboard accessible and collapsed by default.
- [ ] Add navigation-specific labels instead of changing `explainerTitle` globally. Proposed examples: 'Certificates for work', 'Certificates for study', 'Carer’s leave certificates', 'Employer acceptance'. Review all 15 labels against their destinations; avoid promises of acceptance or special consideration.
- [ ] Retain all existing guidance URLs, canonical metadata, child links, source meaning and footer site-map path.
- [ ] Test disclosure with keyboard and without JavaScript, broken links and crawlable HTML; update existing SEO contracts and commit.

**Acceptance:** No deleted public route or newly orphaned supporting page. The homepage loses a redundant strip; the certificate page retains a short disclosure, with recognisable labels when opened. Do not claim SEO improvement from this visual cleanup.

### Task 6 — Cross-route responsive and accessibility verification

**Files:** existing `e2e/money-pages-foundations.spec.ts`, `e2e/landing-pages.spec.ts`, related public accessibility tests; targeted component fixes only when defects are reproduced.

- [ ] Cover homepage, six service landing pages, Pricing, How it works, Contact, FAQ, Trust & Safety and site map. Include one guide and any separate paid landing shell as regression samples.
- [ ] Test 320×568, 390×844, 768×900, 1440×900 and 844×390 landscape; light/dark, keyboard, reduced motion and 200% text/zoom. These are test sizes, not new CSS breakpoints.
- [ ] Test menu plus sticky CTA, cookie/consent UI if present, returning-patient/resume notices and focused contact inputs with the software keyboard. Use owned synthetic state for personalised UI.
- [ ] Confirm no sticky overlay obscures a form field, error, legal link or primary action. On small screens, prefer natural scrolling over multiple pinned layers.
- [ ] Check normal text contrast against WCAG AA thresholds, visible focus and descriptive labels. The 44px target is this plan's design target, not a claim of a universal WCAG minimum.
- [ ] Recheck hero CTA visibility and existing layout-shift/page-length budgets after moving ProductReview. Do not hide content or loosen guard thresholds merely to pass.
- [ ] Record actual routes, viewport, theme, browser and interactions checked. Chromium emulation is not physical iPhone/Safari proof; include WebKit coverage and owner physical-device review before calling that layer complete.

**Acceptance:** No critical navigation/support regression, unreadable trust marks, overlapping sticky elements or broken focus behaviour. Distinguish automated checks, browser observations and owner visual acceptance.

### Task 7 — Minimal privacy-safe measurement

**Files:** `lib/analytics/capture.ts`, applicable existing analytics event registry/privacy tests, navigation/footer/contact call sites. Inspect current conventions before choosing exact event names.

- [ ] Inventory existing explicit events and reuse them where semantics match. Do not add duplicate page views, autocapture or session recording.
- [ ] Proposed minimal events: navigation selection; support action selection; contact submit attempted/succeeded/failed. Use fixed allowlisted placement and action enums, plus approved layout-version marker where useful.
- [ ] Default payload excludes full URLs/query strings, free text, email, phone, request identifiers, clinical/service selections and raw error strings. Do not introduce user identification or cross-session joins for this UI question.
- [ ] On contact, use fixed failure categories; preserve the distinction between attempted send and successful action response. A successful response is not evidence of a later human reply.
- [ ] Test blocked analytics, offline mode and capture errors: links and support submission must still work. Verify outbound payloads with synthetic actions and browser network evidence; a local PostHog error is not a delivery pass.
- [ ] Record release time and compare equal-length, weekday-matched windows, split by device and only already-permitted acquisition categories. Show raw counts, denominators, missing-data limits and concurrent changes. Select duration after inspecting traffic; no invented sample-size or significance claim.
- [ ] Review contact visits per observed eligible page view, request-access usage, form attempt-to-success ratio and aggregate support themes if available through authorised privacy-safe reporting. More Contact clicks can mean either better discovery or greater confusion; fewer messages are not automatically success. Use existing checkout metrics as guardrails without altering their contracts.

**Acceptance:** Payloads pass existing privacy controls; analytics failure never blocks a user action. Measurement is observational unless a separately designed experiment establishes causality. No guaranteed conversion or support-volume uplift.

## 6. Review focus: failure cases not to miss

- Long account labels and 200% text size: navbar switches layout before collision.
- Services expanded, then close/reopen or route change: correct focus, scroll restoration and accessible state.
- Wait data absent/stale or service disabled: no misleading active-status claim or empty pill.
- Review score changes after the snapshot: update or suppress the rating accurately; never display rounded-up evidence.
- Signed-out/guest request access: no redirect loop and no account requirement to contact support.
- Contact delivery or analytics unavailable: preserve input; do not show false success or leak raw errors.
- Short landscape screen with software keyboard/sticky CTA: focused controls remain visible.
- Removed link strip: all former destinations remain reachable without relying only on XML sitemaps.

## 7. Verification, release and rollback

During implementation, use the narrowest useful tests for each task, then lint/typecheck and rendered UI checks. Extend existing behavioural E2E where interaction contracts change. Keep screenshots and logs free of real patient data; never submit a real support message or enter payment/prescribing flows as part of this cleanup.

Before a release claim, run the repository's current required release checks on Node 24/pnpm 10.23.0, including build, relevant E2E, privacy/marketing/SEO contracts and any required CI gates. Use the maintained scripts rather than copying a stale command list from this plan. Document unrelated failures by name; do not describe a partial run as a passing suite. For docs changes, run `corepack pnpm doc:audit` and reconcile bookkeeping.

Release batches: (A) navigation/footer, (B) hero/trust, (C) Contact, (D) link cleanup and measurement as appropriate. Measurement baseline must be established before the first release it is intended to evaluate. Prefer reviewable commits; do not split closely coupled badge placement and footer availability changes across releases.

Prepare draft PRs only when execution reaches that stage, with Problem, Changes, Verification, Risk/Rollback, Compliance/Privacy impact and Env/Migration changes. No schema/env migration is expected. If one appears necessary, stop and explain the scope change. Production deployment and operator visual acceptance are separate from Fable's plan review.

Rollback is a revert of the affected batch to the accepted local baseline, followed by required deployment checks. Keep review-source truth intact during rollback: do not automatically restore old Google stars as a way to reverse a layout problem. Avoid deleting public routes or historical analytics definitions, making reversal straightforward.

## 8. Completion criteria

- [ ] Fable review recorded; requested revisions resolved; Rey authorises implementation.
- [ ] All core requirements mapped in section 3 completed and verified.
- [ ] Existing navbar/footer work preserved; remaining work visibly improves readability, support access and trust hierarchy.
- [ ] ProductReview decision honoured with accurate attribution and declared snapshot freshness.
- [ ] Trust badges retained with intentional desktop/mobile composition and correct meanings.
- [ ] Public legal/clinical wording, service gating, account routing and contact delivery contracts preserved.
- [ ] Owner reviews representative desktop/mobile before-and-after screens before wider release.
- [ ] Tests/build/E2E/CI and any release status reported separately from local checks.
- [ ] No PHI-bearing telemetry, third-party review excerpts, fabricated ratings or unapproved external actions.

## 9. Suggested priority

1. Approve the final hierarchy and ProductReview placement.
2. Fix navigation readability, mobile consistency and footer grouping.
3. Repair wait wrapping and implement the hero/trust hierarchy.
4. Simplify Contact and verify request access and failure recovery.
5. Finish link-label/duplicate-strip cleanup.
6. Complete cross-route QA; use the measurement baseline prepared before release.

Core scope is deliberate public-interface refinement, not a whole-site redesign. Additional commercial, intake or clinical changes remain governed by ROADMAP.md and their own review.

## 10. Questions for Fable's review

Please return **approve / revise / block** for each task, with evidence and severity for concerns.

1. Does the proposed separation of status, ProductReview, CTA reassurance and footer certifications resolve the visual problem without diluting trust?
2. Is below-CTA ProductReview placement appropriate on the specified marketing routes? Confirm route scope, freshness ownership and any concrete advertising-policy blocker; do not silently substitute another review source.
3. Does the first screen still prioritise service explanation and action on a 390×844 phone after placement changes?
4. Are the proposed badge proportions and mobile grouping readable and faithful to the marks' usage requirements?
5. Does Contact remain quick for guests and existing patients, with a verified safe auth return path?
6. Are any links or mandatory clinical/complaints statements lost by the proposed removals?
7. Are analytics changes sufficiently bounded, with correct attempt/success semantics and no health-data collection?
8. Are the verification and rollback boundaries sufficient, and is any proposed work unnecessary relative to the roadmap?

**Handoff:** Review this document against commits `d3c01c6ad` and `8df290876` plus current HEAD. Do not implement, merge, deploy, solicit reviews, alter ratings or send messages while reviewing. Return suggested changes for Rey's decision.
