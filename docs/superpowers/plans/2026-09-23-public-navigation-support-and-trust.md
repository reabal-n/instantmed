# InstantMed Front Door Redesign Implementation Plan

> **Status: implemented locally following Rey's approval, 23 September 2026.** The hero, navigation/footer, Contact and supporting page changes are implemented on `codex/front-door-plan-revision`. See the execution record below for verification and release limits.
>
> **Execution:** Once the plan is accepted, use `superpowers:executing-plans` task by task. Preserve existing work, verify each deliverable and commit each coherent batch. This document does not authorise deployment.

**Goal:** Make InstantMed feel calm, clear and considered, with an immediately understandable service, an obvious next step, accessible support and fewer competing elements.

**Architecture:** Refine the shared Hero, Navbar, Footer, service chooser and Contact page. Give status, reviews, certification and support distinct places. Preserve shared service, pricing, availability, routing and form infrastructure.

**Tech stack:** Next.js 15.5.24, React 18.3.1, TypeScript 5.9, Tailwind 4.2.2, Framer Motion 11.18.2; Node 24 and pnpm 10.23.0. No dependency upgrades or new providers.

**Spec:** Sections 1–5 contain the accepted experience and settled constraints. Sections 6–9 define execution, verification and completion. This is one consolidated plan, not a second source of business or clinical policy.

## 1. Direction and boundaries

### Settled decisions

- Redesign the hero first, including the medical-certificate and prescription pages. Do not wait for the advertising observation window to close.
- Keep ProductReview's logo and five-star presentation, linked to the InstantMed listing, using the verified rating configuration rather than hardcoded decorative stars.
- Keep the existing footer trust marks, including Stripe, LegitScript and Google certification. Improve their placement, size and spacing.
- Remove the oversized hero capsule and its redundant credential/service labels.
- Keep Contact us directly visible in the navigation.
- Keep the footer concise and make Help more prominent than company information.
- Remove the internal-process references Rey flagged from public-facing copy. Do not replace them with other sweeping process claims. Explain the patient's actions, outcome and support options in plain language.
- Incorporate useful visual and usability findings from Opus's review. Do not add a separate preliminary workstream that delays the design.
- Produce desktop and mobile previews before wider release.

### Included surfaces

The homepage and six primary service pages: `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, `/hair-loss`, `/womens-health` and `/weight-loss`. Also: shared navigation/footer, `/contact`, `/how-it-works`, and targeted copy/layout cleanup on `/about`, `/pricing`, `/faq` and `/trust`. Trust & Safety uses the existing `/trust` route.

Shared changes also require regression checks on a guide, a certificate-guidance page and any alternate landing page that consumes the same components. They do not authorise rewriting those pages wholesale.

### Excluded work

No intake or checkout redesign, clinical workflow changes, service launches, pricing changes, new tracking/lookup system, advertising account changes or site-wide rebrand. Photography commissioning, generated assets and broader education-content work remain optional. Internal records and operational documentation retain accurate technical detail; public-copy cleanup is not deletion of internal evidence.

### Current local baseline

The previous work is preserved on `codex/simplify-public-navigation`:

| Commit | Existing work to retain |
|---|---|
| `d3c01c6ad` | Simplified navigation, direct Contact us, smaller footer, retained badges and expandable certificate guidance |
| `8df290876` | ProductReview badge replaces Google review stars |
| `a30f906f5` | Original planning document |

The shared checkout was subsequently on `main` at `5e836d1a0`. Before implementation, reconcile the feature branch with current main in an isolated worktree, preserving newer request-performance and measurement work. Do not rebuild completed changes or assume the local branch is deployed.

The [Opus review](https://claude.ai/artifact/MEMzk99nC3ccaviVDLTQ7e) was accessible and reviewed; Rey's subsequent direction takes precedence over its proposed schedule and badge removals. Source inspection confirms the crowded hero composition, small footer contact links, mismatched certification treatments, Contact's repeated promotional sections and a button transition list missing the individual CSS movement properties. Opus's additional runtime findings remain review evidence until reproduced on the execution branch.

## 2. Hero: the first implementation batch

### Composition

| Position | Proposed treatment |
|---|---|
| Above heading | One quiet, left-aligned status sentence when reliable service-specific timing exists |
| Main heading | Short, clear headline with deliberate line breaks; no highlighted keyword treatment |
| Supporting copy | One concise service explanation, followed only by information needed to decide whether to start |
| Action | One dominant button with visible price where relevant; a quieter explanatory link when useful |
| Under action | One compact reassurance line; no separate row of oversized certification cards |
| Independent reviews | ProductReview logo and stars, linked and visually separate from operational status |
| Hero visual | A large, readable representation of the actual outcome |

The copy, status and CTA share a left edge on desktop. Mobile uses the same reading order; the visual follows the action and review row. Do not put the visual between the explanation and the button.

### Headline and copy direction

- Homepage: retain **“Faster than your GP.”** and make the supporting sentence clearly identify the available services.
- Medical certificate: recommended headline **“Your medical certificate. Without the waiting room.”** Retain **“No video. No call. No appointment.”** on this service only.
- Prescriptions: recommended headline **“Your regular medication. A simpler repeat.”** Explain the request and delivery outcome without promising a prescription or a fixed turnaround.
- Specialty pages: lead with the service and the patient's need; keep practical eligibility and any necessary contact expectations close to the action.
- Stop repeating “from bed” across the headline, body, footer and closing CTA. Keep distinctive language where it earns its place.

These are proposed headline directions for the visual preview, not a mandate to rewrite every service headline identically.

### Status and reassurance

- Remove the capsule, divider dots, repeated service label and credential text from the top status area.
- Wrap the entire timing sentence in one text element beside a static indicator. It must not split into separate flex columns.
- Keep the service and observation window explicit. Use a median label if that is the statistic; do not describe a median as “most”. Example format: “Medical certificates: median turnaround ~24 min over the last 24 hours.” The number must come from current qualifying data, never this example.
- Retain existing stale-data and queue-pressure protections. Verify how test records are excluded before showing the metric; reuse the project's existing test-record exclusion convention.
- If a valid figure is unavailable, omit the timing line. The hero redesign can ship with no timing line while a data issue is repaired. Do not substitute a pulsing availability claim or a personal queue position.
- Remove the second “last reviewed” signal from the hero. One recency signal is enough.
- Keep “AHPRA-registered doctors” once in nearby explanatory copy or a short reassurance line where it is otherwise absent. Do not force another badge into an already adequate service explanation.
- Use the existing refund wording once around the first action. Retain its concise footer reference; remove additional decorative repetitions elsewhere on the same page. A direct FAQ answer can still explain the policy.

### ProductReview

Keep the linked logo and stars below the action/reassurance group on the seven primary landing pages. Keep the listing URL, score and verification date together in `lib/social-proof/index.ts`. The earlier 5.0/5 observation is dated 23 September 2026; recheck the listing before release and represent any changed score accurately.

Maintain logo proportions and readable contrast. In dark mode, use a deliberate monochrome treatment rather than a colour inversion that changes the brand to pink. Do not add a weekly automation, an arbitrary 45-day expiry, testimonials, review-count promotion or a new external widget as part of this redesign.

### Hero visuals

**Certificate:** Make the specimen the main visual. Reference the actual PDF renderer for structure, document details and verification treatment. Use synthetic information and a visible SPECIMEN label. Show the real verification mechanism and secure-link delivery treatment. Remove decorative elements that are not on the delivered document. Use a readable crop on mobile rather than shrinking an entire sheet until its text is illegible.

**Homepage:** Replace the small status tiles with a certificate-led composition and a restrained eScript delivery example. Use a single clear composition on desktop; prioritise the certificate on mobile. Do not show an invented dashboard or multiply floating cards.

**Prescriptions:** Refine the existing eScript specimen using the actual delivery format. Use synthetic content and avoid invented delivery times, repeat counts or outcome guarantees.

**Motion:** Allow one short delivery-notice entrance. No perpetual floating, pulsing or repeatedly replayed hero entrances. Reduced-motion mode shows the complete static composition immediately. The CTA and headline must not wait for the decorative sequence.

## 3. Navigation, footer and trust

### Navigation

Desktop structure:

`Logo | Services ▾ | How it works | Pricing | Contact us | Log in/account | Get started`

- Use 15–16px link text and comfortable hit areas. Target 48px on mobile in line with the existing design system.
- Keep one primary button style and a restrained active-link treatment, such as an underline or weight change.
- Keep all six active services in the dropdown. Use their existing canonical names and routes.
- On mobile, use consistent text rows. Services has an obvious disclosure control; remove the mixed coloured icon tiles.
- Keep Contact us reachable without expanding Services. Preserve keyboard operation, focus return, Escape dismissal and scrolling in short screens.
- Choose a CSS breakpoint from the widest signed-in layout. Do not add JavaScript collision detection.
- Move theme switching out of the main desktop link sequence, into the footer utility area and mobile menu utility area. Preserve explicit light/dark control.

### Footer information architecture

1. Brand and concise support details.
2. **Help:** Contact us, FAQs, Verify a certificate.
3. **About:** About InstantMed, Health Guides, What we won't do.
4. A compact **Explore services** disclosure containing six server-rendered service-page links.
5. Organised trust marks and quieter reassurance.
6. Emergency wording, legal links and entity details.

Use **“Telehealth without the small talk.”** as the single brand line. Label the number **“24/7 voice message support”**; keep the email and phone actionable. Help precedes About in both reading order and layout.

The Explore services disclosure is collapsed by default on desktop and mobile. It avoids rebuilding a third permanent directory column while keeping all six landing-page links in the HTML. A native `details`/`summary` treatment works without JavaScript. Do not hide emergency or legal information in a disclosure.

Legal links should be at least 14px, wrap comfortably and have generous hit areas. Keep Privacy, Terms, Refund, Complaints, Trust & Safety, Site map, copyright and the unbroken ABN.

### Trust arrangement

- Desktop: one horizontally aligned group for Stripe, LegitScript and Google certification, with consistent surrounding space and optical balance.
- Mobile: an explicit two-row grid. Stripe and LegitScript share the first row; the wider Google certification treatment is centred on the second. Avoid accidental flex wrapping.
- Render LegitScript close to its native 73×79 proportions so the mark is readable. Preserve intrinsic proportions for every logo.
- Use a common, quiet presentation rather than a heavily bordered Google card beside a tiny floating seal. Keep the Google logo and qualification label requested by Rey.
- Put registration, refund and privacy reassurance in a separate quieter row beneath. Avoid three different pill styles within that row.
- Keep fuller explanations on Trust & Safety. Do not repeat complete certification groups above and below the same page.

Do not introduce a blanket logo-removal task or change the requested retained badge set. Any redundant strip removed during page polish is a page-composition decision, not a prerequisite for the hero.

## 4. Contact, discovery and page polish

### Contact

Use a plain **“Contact support”** heading and one practical sentence. On desktop, support methods sit left and the form right. On mobile, concise support actions come first, followed immediately by the form.

- Remove the repeated promotional introduction, empty wrapper, clinical wait display and acquisition banner.
- Keep email, voice-message support and the form easy to reach.
- Add **“Already submitted a request?”** with two clear routes: account holders can sign in to their existing requests; guests are directed to the tracking link in their confirmation email. Do not imply that every guest can sign in.
- Keep Contact available without login. Reuse existing safe auth return paths and tracking behaviour.
- Put the Complaints page link alongside the complaints email and existing response information.
- Remove named-assistant and internal-process messaging. Describe the support action and what happens next without inventing an immediate-response promise.
- Preserve entered text on failure, prevent duplicate pending submissions, associate errors with fields and show success only after the server action succeeds.

### Discovery without link walls

Remove the homepage Popular pages strip once the replacement footer links are in place and rendered-HTML checks pass. Its current six links cover two service pages plus Pricing, How it works, Verify and Contact; the review's claim that it alone covers all six services is not supported by that component.

The homepage chooser already links four specialties to their landing pages, while certificate and repeat-prescription cards lead directly into requests. Preserve those intended CTA destinations. The new footer disclosure supplies all six service-page anchors without changing those conversion paths.

Keep certificate guidance in its existing disclosure. Use short navigation labels such as “Certificates for work”, “Certificates for study” and “Carer's leave certificates”. Keep **“Employer evidence guide”**. Preserve the URLs and full page titles.

### Core visual polish after hero, navigation and Contact

- Replace tall mobile service cards with compact rows: service name, one-line description, price and chevron. Keep useful desktop card detail. Target roughly 80–96px rows at default text size, allowing expansion for long text and accessibility settings; do not promise six rows plus surrounding content fit every phone.
- Use one restrained icon language on public service surfaces. Prefer existing Lucide marks in a consistent size and colour; use no icon where it adds nothing. Keep specialty imagery respectful and literal.
- Align the outer edges of header, hero, main sections and footer using the existing `max-w-5xl` shell. Long prose retains a narrower measure. Do not force every component to the same text width.
- Standardise public primary CTAs on the design system's rounded button shape, with consistent size, focus and press behaviour. Avoid a global control restyle that spills into staff or patient forms.
- Make CTA verbs match destinations: “Get…” or “Start…” when entering a request; “View…” when opening a service explanation. Do not label an informational link as starting an assessment.
- Keep the existing body/display font roles: Source Sans 3 for body and section text, Plus Jakarta Sans for hero/display moments. Do not silently extend the display font to every heading.
- Vary section composition according to content. Remove redundant eyebrow pills and isolated coloured words. Prefer left-aligned explanatory sections, readable prose and fewer nested cards.
- Rework How it works around three concrete stages: complete the form, receive an outcome or request for more information, and access the document or eScript when issued. Use actual product examples, not three decorative icon boxes.
- Fix button/card movement transitions by including CSS `translate` and `scale` where used. Keep shared motion tokens, short durations and reduced-motion behaviour.
- Clean up repeated refund language, forced casual phrases and inaccurate output details alongside each changed page. Cover visible text, accessible labels, metadata and FAQ schema so removed public wording does not survive elsewhere.

## 5. Optional enhancements, outside core acceptance

1. A photography pass using the existing brief, only where a real scene improves understanding. No stock doctor portraits and no asset generation required to finish this plan.
2. Display-face section headings as a separate visual option. Preview before changing the current typography contract.
3. More extensive redesign of About, Pricing and educational content after the shared system is proven.
4. A broader customer-discovery or conversion experiment once reliable traffic supports a useful comparison. No speculative uplift target.

None of these delays the hero or becomes an implementation prerequisite.

## 6. Implementation tasks and ownership

Every task ends with a diff review, its relevant checks and a focused commit. Use behavioural tests for interaction changes and browser inspection for visual decisions; do not create tests that merely pin utility classes.

### Task 1 — Hero hierarchy and review placement

**Modify:** `components/marketing/hero.tsx`, `components/marketing/wait-counter.tsx`, `components/marketing/product-review-badge.tsx`, `components/marketing/med-cert-landing.tsx`, the five other service landing components, `app/(marketing)/page.tsx`.

**Inspect/conditionally repair:** `lib/brand/wait-counter.ts`, `lib/brand/wait-counter-types.ts`, `lib/social-proof/index.ts`.

**Tests:** `lib/__tests__/landing-hero-contract.test.ts`, `lib/__tests__/wait-counter-unverified-state-contract.test.tsx`, `e2e/landing-pages.spec.ts`, `e2e/brand-surfaces.smoke.spec.ts`.

- [x] Capture homepage and certificate hero at 1440×900 and 390×844 on the execution branch.
- [x] Inventory every Hero caller, including explicit `pill`, `trustRow` and `reassuranceRow` overrides. Migrate the composition deliberately; do not retain an obsolete multipurpose pill API solely to appease a source-string test.
- [x] Separate status, CTA reassurance and ProductReview. Remove default hero certification injection; the existing footer still retains the marks throughout this change.
- [x] Repair sentence wrapping, eliminate duplicate recency and suppress unsupported timing states.
- [x] Check eligible timing population and stale handling. If unreliable, render the redesigned hero without timing while the metric correction is reviewed.
- [x] Verify one H1, readable wrapping, existing service-availability gating, CTA destinations and ProductReview link behaviour on all seven pages.
- [x] Replace old hero tests with assertions for the new hierarchy; preserve geometry and slow-font layout-shift checks.
- [x] Update relevant Hero/status documentation in `DESIGN.md`, `docs/PRIMITIVES.md` and source-owned instruction references. Commit the complete hierarchy change.

**Acceptance:** The large capsule is gone; the first action is clearly visible at 390×844 with default text; status does not break into columns; unavailable services remain unavailable; ProductReview remains linked; the footer retains the certification marks. At enlarged text sizes, natural scrolling takes precedence over forcing everything above the fold.

### Task 2 — Hero specimens and motion

**Modify:** `components/marketing/mockups/med-cert-hero-mockup.tsx`, `components/marketing/mockups/escript-hero-mockup.tsx`, `components/marketing/hero-doctor-review-mockup.tsx`, their route compositions.

**Reference:** `lib/pdf/template-renderer.ts`, actual delivery templates, `lib/motion/index.ts`.

- [x] Compare the existing specimen with the actual document/delivery format using synthetic data only.
- [x] Build the larger certificate composition and homepage outcome visual; refine the prescription specimen.
- [x] Remove invented document adornments and unsupported sample details. Keep specimen references clearly non-live.
- [x] Implement one delivery-notice entrance and static reduced-motion mode; remove looping and duplicate entrances from these heroes.
- [x] Inspect mobile crop, desktop balance, light/dark contrast, image dimensions and loading behaviour. Confirm decorative assets do not displace the CTA or add a new render-blocking dependency.
- [x] Commit with the supplied screenshot baseline and final desktop/mobile visual pack. A matched pre-change full-hero capture was not retained.

**Acceptance:** Patients can recognise the actual output; important specimen text is legible without zoom; no real patient information appears; no hero animation loops or restarts after hydration. Tasks 1 and 2 together form the first implementation batch.

### Task 3 — Navigation, footer and discovery

**Modify:** `components/shared/navbar.tsx`, `components/shared/navbar/{animated-nav-link,services-dropdown,mobile-menu-content,mobile-drawer,user-menu,theme-switch}.tsx`, `components/ui/animated-mobile-menu.tsx`, `components/shared/footer.tsx`, `components/marketing/{google-ads-cert,legitscript-seal,home-service-links,med-cert-reason-links}.tsx`, `lib/marketing/homepage.ts`, `lib/marketing/med-cert-intent-config.ts`, `app/(marketing)/page.tsx`.

**Tests:** `lib/__tests__/support-nav-contract.test.ts`, `lib/__tests__/navigation-routing-contract.test.ts`, `lib/__tests__/seo-indexing-contract.test.ts`, `e2e/marketing-dashboard-nav.spec.ts`.

- [x] Enlarge nav text, unify mobile rows and active treatment, and use the 1024px desktop breakpoint. Signed-in staff navigation remains an explicit release verification limitation below.
- [x] Reorder footer Help/About, label voice support and improve contact/legal hit areas.
- [x] Add native Explore services disclosure with all six real landing-page links in server-rendered markup.
- [x] Organise retained trust marks into the desktop row/mobile grid and quieter reassurance group.
- [x] Remove Popular pages only after verifying its destinations and all six service pages remain discoverable in HTML without scripts. Keep any other useful branded-search-link consumer.
- [x] Improve certificate-guidance labels without altering destination routes or page titles.
- [x] Verify tab order, Enter/Space, Escape, focus return, theme controls, long labels, 320px width and short landscape screens. Commit.

**Acceptance:** Contact is directly accessible; all six services remain discoverable; no crowded permanent footer directory returns; trust marks are readable and evenly spaced; keyboard and no-JavaScript discovery work.

### Task 4 — Contact and bounded measurement

**Modify:** `app/contact/contact-client.tsx`, `app/contact/page.tsx`; inspect `app/actions/contact-form.ts`, `lib/navigation/auth-handoff.ts`, `lib/auth/redirects.ts`, existing `/track` and patient-request routes.

**Add:** `e2e/contact-support.spec.ts` for synthetic, stubbed-delivery cases using the repository's existing test conventions. No real support email is sent.

- [x] Build the concise support-first layout and guest/account guidance.
- [x] Preserve existing form validation, delivery and abuse controls; remove repeated promotional blocks.
- [x] Preserve the historical meaning of `contact_form_submitted` as an attempted submission, or explicitly document its migration. Add a distinct success event only after confirmed server success.
- [x] Replace raw analytics error strings with fixed categories. Payloads exclude message text, identity, request IDs and health information. Reuse the existing consent-aware transport; analytics failure cannot block the form.
- [x] Exercise invalid input, pending submit, confirmed success, server failure with text retained, retry and blocked analytics. Check account-holder return routing and guest guidance.
- [x] Check the form begins within the first 390×844 screen after the short support actions. Commit.

**Acceptance:** A visitor immediately understands how to get help, guests are not forced into sign-in, entered text survives failure and the form never reports success early. This plan adds no navigation analytics programme or before/after conversion claim.

### Task 5 — Service chooser, page rhythm and copy

**Modify:** `components/marketing/portfolio-route-map.tsx`, `components/marketing/sections/how-it-works-inline.tsx`, `components/marketing/how-it-works-content.tsx`, `components/sections/{section-header,cta-banner}.tsx`, `components/ui/button.tsx`, relevant public route copy and its canonical source modules.

**Reference:** `lib/services/service-catalog.ts`, `lib/marketing/{voice,approved-claims,homepage}.ts`, `components/ui/heading.tsx`, `DESIGN.md`.

- [x] Convert mobile service cards to compact rows with unchanged price sources and destinations.
- [x] Apply the consistent public icon/button treatment and common outer container alignment.
- [x] Correct CSS transitions for individual movement properties, checking staff/patient controls for unintended shared effects.
- [x] Build the output-led How it works sequence and simplify section headings/eyebrows.
- [x] Remove the public-copy references specified by Rey from rendered copy, accessible text, metadata and structured data. Use neutral, accurate descriptions; do not introduce absolute claims about who sees or processes every request.
- [x] Reduce repeated slogans/refund decoration and correct factual specimen or delivery wording during the same page pass.
- [x] Update design documentation and its changelog for the patterns actually adopted. Commit after responsive, availability and reduced-motion checks.

**Acceptance:** Services are substantially quicker to compare on a phone; CTA labels accurately describe their destinations; section layouts follow their content; public copy contains no remaining instances of the references Rey asked to remove. No new typeface, service, price or patient-flow change is introduced.

### Task 6 — Final verification and review pack

- [x] Review homepage, all six service pages, Contact and How it works at 1440×900 and 390×844 in light and dark mode.
- [x] Target edge cases at 320×568, 768×900 and 844×390, plus 200% text/zoom: navigation, footer, hero wrapping, sticky CTA, menu and focused Contact inputs.
- [x] Check one guide and one alternate landing shell for shared-component regressions. Exercise reduced motion and keyboard access. Distinguish Chromium checks from WebKit or physical-device evidence.
- [x] Recheck CTA routes, availability states, no-script service anchors, page metadata, document specimens and the current ProductReview source.
- [x] Run lint, typecheck, focused tests and relevant existing E2E, followed by required release checks before any release claim.
- [x] Prepare the final contact sheets, supplied-original footer comparison, changed-route list, checks run and known limitations. Recording the actual release time in the change/Ads observation record remains release work.
- [x] Update documentation references and commit the verified batch. Present the visual pack for Rey's judgement.

## 7. Verification commands and failure cases

Run from the implementation worktree on the pinned runtime. Start with the tests that own each changed surface:

```bash
corepack pnpm test run lib/__tests__/landing-hero-contract.test.ts lib/__tests__/wait-counter-unverified-state-contract.test.tsx lib/__tests__/support-nav-contract.test.ts lib/__tests__/navigation-routing-contract.test.ts lib/__tests__/seo-indexing-contract.test.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm e2e --project=chromium e2e/landing-pages.spec.ts e2e/brand-surfaces.smoke.spec.ts e2e/marketing-dashboard-nav.spec.ts e2e/contact-support.spec.ts
corepack pnpm doc:audit
```

The Contact spec is created in Task 4; do not run it before it exists. Use the established E2E server/seed setup and isolated message-delivery stubs. Before release, run `corepack pnpm release:check` and the relevant CI gates. Report unrelated failures explicitly rather than weakening checks.

| Failure case | Required outcome | Owner |
|---|---|---|
| Missing/stale timing or test-contaminated data | Hero remains useful without a displayed figure | Task 1 |
| Service disabled or maintenance active | No contradictory active status or enabled request action | Tasks 1, 3, 5 |
| Guest cannot sign in | Clear confirmation-email tracking guidance and available support | Task 4 |
| Small screen, enlarged text, open menu or keyboard | Natural scrolling, visible focused control, no overlapping actions | Tasks 3, 4, 6 |
| Message delivery/analytics failure | No false success, no lost entered text, no sensitive telemetry | Task 4 |
| Link strip removed | All intended service/help destinations still present as real anchors | Task 3 |
| Reduced motion or slow font load | Stable, readable hero with no delayed action or repeating animation | Tasks 1, 2, 6 |

The execution record below reports observed local behavior. Neither this plan nor local checks establish production deployment or release readiness.

## 8. Release order and rollback

1. **Hero hierarchy, specimens and motion.** First implementation batch, with the existing footer marks retained.
2. **Navigation, footer, badge layout and link cleanup.** Ship discovery replacement and strip removal together.
3. **Contact and its bounded submission measurement.**
4. **Service chooser, How it works and remaining visual/copy polish.**

Each batch is independently reviewable. Do not wait for optional photography, a typography experiment or the October observation checkpoint. Keep required public disclosures and clinical boundaries accurate throughout; their layout should not dominate the page.

Rollback means reverting the affected batch, retaining accurate review attribution and working support/service routes. Do not restore old Google review stars merely to reverse spacing changes. No database migration or new environment variable is expected.

## 9. Completion checklist

- [x] Rey accepts this consolidated plan before implementation.
- [x] Hero redesign is implemented in the first batch, including certificate and prescription surfaces.
- [x] ProductReview remains linked and accurate; all requested certification marks remain present.
- [x] Navigation is readable, Contact is direct and the footer is concise.
- [x] Guest/account support paths and recoverable form states work.
- [x] Every service page remains discoverable without a link wall.
- [x] Mobile service comparison, button feedback and page rhythm improve visibly.
- [x] Public wording cleanup covers visible, accessible and search-facing copy.
- [x] Light/dark, keyboard, reduced-motion and responsive checks are recorded.
- [x] Rey receives a desktop/mobile visual review pack; local checks, CI and deployment status are reported separately.

## 10. Execution record — 23 September 2026

Rey authorised the full core plan. The implementation preserves the earlier navigation/ProductReview commits, uses the pinned stack, and adds no dependency, migration or environment variable. Optional photography and a new typeface were not undertaken.

### Implemented

- Shared left-aligned Hero: qualifying certificate timing only, one main action, compact reassurance, ProductReview and readable certificate/eScript specimens. Removed obsolete pill/trust injection and looping hero effects.
- Navigation: 16px desktop links, 48px primary controls, plain mobile rows, direct Contact and a 1024px breakpoint. Footer: Help before About, labelled voice support, native six-service disclosure, balanced Stripe/LegitScript/Google presentation and a separate quiet reassurance row.
- Contact: immediate methods and guest/account guidance, shorter form, existing server action and validation, retained text on failure, pending protection and focus after error/success. Analytics preserve attempted-submit meaning and use bounded categories; synthetic browser tests send no email.
- Compact mobile service chooser, output-led How it works, simpler shared headings/buttons, useful guidance links retained behind a native disclosure. Targeted public wording cleanup covers canonical strings, consumers and search-facing text without altering the underlying clinical workflow.
- Timing queries now apply the existing reportability filter and explicitly exclude seeded patient records. Existing freshness, sample-size and queue-pressure guards remain.

### Verification and artifacts

- Full unit suite: **809 files passed, 1 skipped; 8,508 tests passed, 122 skipped**.
- Full lint and TypeScript checks passed; final changed Contact/footer/browser files were linted again.
- **85 Chromium browser checks passed** across the existing landing/brand suites and new front-door/contact suites. The final Contact control correction and refreshed 36 page captures plus eight footer/service captures passed a further six focused checks.
- Covered: seven landing routes, Contact and How it works at 1440×900 and 390×844, light and dark; menu at 320×568, 768×900 and 844×390; 200% text, reduced motion, Escape/focus return, no-script service links, CTA visibility/routes, sticky bar behavior, no serious axe violations on the seven landing routes, and contact validation/pending/error/retry with blocked analytics.
- Mobile regression checks passed for `/blog/same-day-medical-certificate`, `/medical-certificate-online`, `/about`, `/pricing`, `/faq` and `/trust`.
- Production build passed in **114 seconds**, including the bundled WebSocket and server-action boundary checks. A further **12 Chromium checks passed against that local production build**. Pinned-runtime, stack-pin and route-conflict checks passed.
- Documentation audit passed. Content audit: **107 guides, zero issues**.
- The bundle gate reports `/request` at **181 kB against its 180 kB budget**. A clean build of unchanged main (`5e836d1a0`) on the same runtime/environment reports the same **181 kB**. Summed gzip bytes of request-manifest JavaScript are 180,613 on main and 180,611 on this branch. This is an existing gate failure; no budget or intake code was changed.
- ProductReview's linked InstantMed listing was checked during implementation against the existing verified five-star configuration.
- Independent review findings fixed: empty fallback mobile icons, missing homepage timing availability gate, and an About heading that overstated the review sequence. Final screenshot inspection also corrected footer contact wrapping and Contact radio sizing/nested labels.
- Local visual pack: `.superpowers/front-door/review.html` (44 final screenshots, theme/viewport selector, supplied-original footer comparison). Logs and screenshots live alongside it and are ignored build artifacts. Footer-only captures temporarily hide fixed chrome to avoid screenshot overlays; sticky behavior is tested separately. A matched pre-change full-hero screenshot was not retained.

### Release limits

No production deployment or merge was performed. CI, the complete `release:check` integration/security suite, signed-in staff dashboard navigation, WebKit and physical-device checks are not represented by the local Chromium evidence. Run the required release checks and record the release time before shipping. Owner visual acceptance remains separate from these technical results.
