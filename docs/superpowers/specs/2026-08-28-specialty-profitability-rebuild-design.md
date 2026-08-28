# Hair Loss and ED Profitability Rebuild Design

**Status:** Fable-reviewed and revised for implementation on 2026-08-28. No live Google Ads mutation or production deployment is authorised by this document.

## Decision

Rebuild Hair Loss and Erectile Dysfunction as measurable, one-off doctor-review services. Do not close either service, do not add questions or screens, and do not increase intake friction. Test different approaches sequentially at the existing public URLs, with one material product hypothesis per service at a time.

Medical certificates remain the cash engine. Protect their strong blended economics, improve paid intent quality only through separately approved Ads packets, and do not include employer outreach in this program.

## User Decisions Already Made

- Hair Loss and ED stay active as products and are rebuilt for profitability rather than shut down.
- Different positioning and presentation approaches should be tested.
- No new intake question, screen, quiz, appointment gate, identity requirement, or clinical obstacle may be introduced.
- Required safety, identity, consent, doctor review, payment, refund, and fulfilment rules may not be weakened.
- Employer outreach is out of scope.
- Codex writes the plan, an independent Fable-style reviewer challenges it, Codex revises it, and only then does implementation begin.
- Implementation approval does not approve a live Ads mutation. Each Ads change still needs its own immutable proposal and exact approval.

## Evidence Selecting the Work

The evidence below is a dated 2026-08-28 selection snapshot. Every commercial decision must refresh the same closed-window sources before action.

### Hair Loss

- The latest closed paid window showed 40 clicks, A$120.75 spend, zero retained orders, and negative A$120.75 First-Order Contribution.
- No campaign-linked production intake was persisted in that window, locating the failure before durable checkout/payment creation.
- The current landing-to-start signal is weak: 24 landing sessions, 3 starts, 1 checkout, and no paid-CPC purchase in the observed aggregate funnel.
- The paid landing-page experience is below average on the scored Hair keywords.
- The current experience explains clinical assessment well but makes the practical one-off offer, conditional eScript outcome, pharmacy handoff, medicine cost, and refund rule too hard to find.

Hair is therefore an unproven service with a failed current acquisition/landing combination, not a product to scale and not a service to abandon without testing a materially clearer experience.

### Erectile Dysfunction

- Rolling 30-day local economics showed 9 orders, A$459.50 net-retained revenue, A$10.44 Stripe fees, A$336.63 spend, and A$112.43 contribution: 24.47%.
- The fresh Manual CPC cohort showed 4 orders from 41 clicks and 35.36% contribution.
- The landing has demand, but its practical offer appears after a long clinical explanation.
- The current Details step is the largest measured product bottleneck: 32 views to 20 completions, 62.5%, with median time of 102 seconds. Mobile start-to-checkout was 30.8% versus 60% desktop.
- ED's earlier clinical screens have already been simplified. Reintroducing IIEF-5, quizzes, calculators, or more clinical screens would duplicate retired work and increase friction.

ED is a viable service whose margin should be improved through better traffic quality and a clearer, easier conversion path, not through a budget increase.

### Medical Certificates

- The latest closed blended window showed roughly A$2,128.75 First-Order Contribution at 75.5% across 98 orders.
- The paid component was positive but near the minimum scale floor, and the most recent paid window fell to 19.33% contribution.
- The current bottleneck is paid query/CPC mix, not a broad onsite rebuild.
- Recent organic work already shipped and requires its planned closed measurement windows. Stacking another medical-certificate copy change now would invalidate that read.

Medical certificates therefore remain unchanged in this rebuild. Protect protocol automation, hold price and budget, measure the recently shipped organic work, and prepare any losing-query mutation only as a separate approval packet. Employer outreach is excluded.

## Outcome and Economic Contract

The primary business outcome is First-Order Contribution:

`Net Retained Purchase Value - actual Stripe fees - attributable Google Ads spend`

Fixed platform costs and owner/doctor capacity remain separate operating constraints. CTA rate, scroll depth, starts, checkouts, and gross revenue are diagnostics, not profitability.

A specialty approach may graduate only when all of these are true:

- at least 10 retained paid orders in the evaluated arm;
- at least 20% First-Order Contribution margin;
- refund rate below 10%;
- at least 90% expected-service attribution purity;
- GREEN tracking and complete fee evidence;
- no fulfilment, queue, safety, or compliance failure;
- no increase in validation-block rate or median completion time attributable to the change.

Thirty days without 10 retained orders is **inconclusive**, not a win. Use the funnel location to select the next approach. Do not manufacture certainty from a low-volume conversion-rate delta.

## Non-Negotiable Invariants

### Clinical and patient safety

- Every ED and Hair request remains an individually reviewed prescribing request.
- The doctor may call or message before deciding. Never promise “no call needed.”
- Prescription approval is never guaranteed.
- ED nitrate and cardiovascular terminal/clearance behaviour remains unchanged.
- Hair reproductive-safety, scalp, cardiovascular, medication, allergy, and condition answers remain required exactly as they are today.
- Hair's reproductive exclusion must have defense-in-depth parity in the shared server safety engine and retry/recovery paths. The normal unified checkout is already protected; this is a P1 hardening acceptance criterion, not evidence that the main funnel currently bypasses the rule.
- Emergency and GP/in-person-care boundaries remain visible and specific.

### No added friction

- No new questions, steps, screens, required taps, identity fields, consents, appointments, calls, account requirements, or payment screens.
- Presentation-only intake work may merge or remove a screen only while preserving every answer key, requiredness rule, validator, downstream clinical summary, doctor surface, persistence path, and back-navigation behaviour.
- Optional fields may be removed when they do not drive validation, safety, or clinical routing. Historical answers must remain readable.
- The Medicare-or-IHI path already supported by code remains available. Copy must not falsely say Medicare alone is required.

### Advertising and marketing

- Public and paid surfaces stay medicine-name-free.
- No before/after claims, guaranteed outcomes, fabricated social proof, unsupported speed claim, “best” claim, sensitive-audience targeting, or medicine-access keyword targeting.
- Landing pages may say that an AHPRA-registered doctor reviews the form, may contact the patient, and may issue an eScript if approved.
- Medicine cost remains separate from the service fee.
- The full-refund-on-decline mechanism remains accurate and conditional.
- Public service URLs stay `/hair-loss` and `/erectile-dysfunction`.

### Payments and fulfilment

- Prices remain Hair A$49.95 and ED A$49.95 during product experiments.
- No subscription, bundle, pharmacy margin, or priority-fee promotion is introduced.
- Stale Checkout Session guards, idempotency, guest checkout, retry payment, refund, and eScript evidence rules remain unchanged.

## Experiment Architecture

### Why sequential versions

Traffic is too low for a useful simultaneous 50/50 split, and campaign spend cannot be attributed precisely between simultaneous page variants without click-level cost allocation. Sequential versions keep the public URL stable, let service/campaign spend align to a closed product window, and prevent overlapping product changes from hiding the cause.

Rules:

1. One material hypothesis per service at a time. Hair and ED may each run one because their traffic and economics are evaluated separately.
2. Freeze price, acquisition settings, clinical answers, doctor workflow, checkout, and fulfilment while a product approach is measured.
3. Allow 24 hours after a window closes for payment settlement before reading results.
4. Keep a stable code-owned version ID attached to the intake attempt so draft recovery and late payment stay in the original cohort.
5. PostHog measures the funnel but does not assign a patient to a version.
6. Acquisition and product experiments never overlap for the same service.
7. A live Ads change requires a separate immutable experiment/proposal receipt even when the product version has already shipped.

### Cohort marker

Use one nullable, allowlisted, non-clinical field named `growth_experience_version`. Values are opaque identifiers such as `spx_h1_20260828`; they contain no answer, medicine, query, patient, or clinician data.

The marker is captured when the intake starts and follows the existing `flow_instance_id` through:

```text
validated landing CTA token
  -> request store and service-scoped draft
  -> partial_intakes
  -> authenticated or guest checkout
  -> intakes
  -> Stripe metadata
  -> canonical funnel events and purchase_completed_server
```

Only a validated, current, service-matched landing CTA token may create an H1/E1 cohort on a genuinely fresh flow. An untagged direct `/request` start remains `null` and is reported separately; the application never infers a version merely because that version is active today. A restored flow keeps its first stored cohort even when a different query token is present.

The value must be normalised against the registry at every trust boundary. Unknown values become `null`; they never block care or checkout. It must not be stored inside the clinical answers JSON and must not overload UTM fields. Database rules make the value set-once for a draft session and immutable after intake creation, matching the existing `flow_instance_id` ownership boundary.

### Code-owned registry

`lib/growth/specialty-experiences.ts` owns:

- opaque version ID;
- service (`hair_loss` or `ed`);
- surface (`landing` or `intake_presentation`);
- hypothesis;
- status (`baseline`, `active`, `retired`);
- activation timestamp and optional retirement timestamp;
- the stable public landing pathname.

The registry fails closed if two active material versions exist for the same service. Changing the active version is a reviewed code/deployment change, not a PostHog flag.

## Approach Sequence

### Hair Loss

#### H1 — practical outcome clarity (first active approach)

Hypothesis: visitors are not starting because they cannot quickly understand what the A$49.95 request buys or what happens if the doctor approves it.

Change only the landing presentation:

- lead with a private one-off doctor assessment and A$49.95 price;
- state the qualified outcome: if approved, the eScript goes to the patient's phone and can be filled at an Australian pharmacy;
- keep medicine cost separate, full refund if declined, possible doctor contact, and no-guarantee copy adjacent;
- move the existing process/outcome/cost content directly below the hero;
- keep the sudden, patchy, inflamed/infected scalp and broader-diagnosis boundaries visible below the practical offer;
- retain the current six-screen intake unchanged during this arm.

Primary diagnostic: unique landing session to `intake_started`.

Decision floor: 30 qualified landing sessions or 20 paid clicks, plus at least 5 starts, or 21 days. Commercial graduation still requires 10 retained orders and 20% contribution.

#### H2 — fit-first opener compression (second approach, only after H1 closes)

Hypothesis: users who start abandon because two early screens make one mental task feel longer than it is.

- merge the current Goals and Pattern presentation into one opener;
- preserve all four required answers and optional prior-treatment answers;
- keep the existing health, preference, Details, and Review/Pay content;
- map the retired `hair-loss-assessment` step to the merged opener for restored drafts and review edit links;
- do not activate H2 while H1 is being measured.

Primary diagnostic: start-to-completion of the merged opener and start-to-checkout. No validation key or clinical rule changes.

#### H3 — privacy/fit positioning (only if H1 is inconclusive or loses)

Test a privacy-led hero while keeping the winning structure, price, outcome caveat, and intake constant. This is a message approach, not a new page or pathway.

### Erectile Dysfunction

#### E1 — private outcome clarity (first active approach)

Hypothesis: demand exists, but the current SEO-shaped hero and long pre-offer clinical sequence obscure the private, one-off practical outcome.

Change only the landing presentation:

- use a human H1 such as “Private ED assessment, from home,” while retaining keyword coverage in metadata and supporting copy;
- show A$49.95, Medicare or IHI plus an Australian address, medicine cost separate, possible doctor contact, the qualified eScript outcome, and full refund if declined with the first CTA;
- source effort from the service catalog rather than hardcoding “about 3 minutes”;
- move the existing process/outcome/cost section directly below the hero;
- narrow unsupported decision-copy references to only what the current intake actually collects;
- keep the existing five-screen intake unchanged during E1.

Primary diagnostic: unique landing session to `intake_started`.

Decision floor: 50 qualified landing sessions and 15 starts, or 21 days. Commercial graduation requires 10 retained orders and 20% contribution.

#### E2 — Details simplification (second approach, only after E1 closes)

Hypothesis: optional height, weight, and BMI content makes the prescribing-identity screen look longer without affecting ED validation or safety.

- remove only the optional ED height/weight/BMI inputs and calculated badge from the current Details presentation;
- preserve historical values on review and doctor surfaces;
- preserve Medicare-or-IHI, structured address, sex, phone, date of birth, and all other required fields;
- do not activate E2 while E1 is being measured.

Primary diagnostic: Details completion from the 62.5% baseline toward at least 75%, with median completion time below 80 seconds and no validation/safety regression.

#### E3 — privacy-first hero (only if E1 is inconclusive or loses)

Test a privacy-first message while retaining the qualified outcome, price, doctor-decision caveat, and winning page structure. Do not add discreet packaging or pharmacy privacy claims that InstantMed cannot control.

## Paid Acquisition Controls

This rebuild changes code and prepares evidence; it does not mutate Google Ads.

### Hair

- The current 40-click/zero-retained-order state must produce a campaign-status approval recommendation, not a quiet hold.
- A future relaunch is exact/phrase assessment or consultation intent only, with the existing A$3 CPC ceiling.
- Stop/propose pause at 10 clicks with no persisted checkout progression, 20 clicks, A$60 incremental loss, or 30 days, whichever comes first.
- Hair needs CAC at or below about A$38.82 for a 20% contribution margin at the current fee assumptions.
- Any pause, relaunch, keyword, RSA, bid, budget, or schedule change is a separate exact approval packet.

### ED

- Do not increase the A$12/day budget; impression-share loss to budget is negligible.
- First paid lever is removal of a proven losing keyword, then an isolated RSA decision, each in a separate packet and observation window.
- Do not turn medicine-access search terms into positive keywords.
- Continue only with GREEN tracking, at least 90% service purity, healthy fulfilment, refunds below 10%, and at least 20% contribution.

### Control-plane repair

The deterministic evaluator currently declares but does not enforce specialty click/day gates. The first safe repair is:

- Hair with zero retained orders at 20 clicks -> campaign-status `APPROVAL_NEEDED`;
- ED or Women's Health with zero retained orders at 30 clicks -> campaign-status `APPROVAL_NEEDED`;
- zero retained orders at 10 clicks -> `INVESTIGATE` until persisted-progression evidence is available;
- loss cap takes precedence;
- already-paused campaigns remain `HOLD`;
- missing economics remain `INVESTIGATE`;
- no code path directly mutates the account.

Elapsed-day and persisted-progression enforcement may be added only with a trustworthy, campaign-scoped evidence source. Do not invent a pilot date from a rolling window. For an approved Hair relaunch, the experiment-level A$60 incremental-loss stop precedes the 20-click stop; the generic rolling-campaign evaluator retains its code-owned lifetime loss cap until a relaunch baseline is durably bound.

## Prescribing Identity Truth

The implementation already accepts either:

- valid Medicare number plus IRN; or
- valid IHI;

together with date of birth, sex, phone, and structured Australian address for prescribing pathways. Canonical documentation and public specialty copy must say “Medicare or IHI,” not “Medicare required.”

This is a truth repair, not a relaxed identity rule. The validator, address requirements, eScript matching, Parchment sync, and downstream doctor workflow remain unchanged.

## Measurement Readout

Every product window starts with an immutable opening receipt containing the exact deployed SHA, activation timestamp, service availability, price, campaign status/configuration, tracking state, and closed pre-window economics. It ends with a closing receipt that confirms whether price, product version, campaign/ad/keyword/bid/budget/schedule, clinical workflow, or checkout changed during the window. If any material input changed, or either receipt is missing, label the result **contaminated/inconclusive** and do not describe movement as causal product lift.

**Opening receipt recovery (2026-08-28):** the original production deployment became ready before its opening receipt was committed. The same operating-day recovery at `docs/superpowers/receipts/2026-08-28-specialty-profitability-opening.json` binds the exact deployed SHA and Vercel-ready timestamp to a closed pre-deployment Ads/economics window, the fresh account-state hash, prices, availability, and the canonical delivered `GREEN` tracking run. The registry activation timestamp was corrected from Sydney midnight to that exact ready boundary. The timing miss remains explicit: the recovery does not waive closing-receipt drift checks or the retained-order, contribution, refund, purity, fulfilment, and seven-consecutive-GREEN-day gates.

For each version report, separately by paid and free acquisition:

- qualified landing sessions/clicks;
- unique `flow_instance_id` starts;
- checkout views;
- payment initiations;
- retained paid orders;
- net-retained revenue;
- actual Stripe fees;
- attributable Ads spend for paid windows;
- First-Order Contribution and margin;
- refunds, declines/unsuitable outcomes, checkout failures;
- validation-block rate and median step completion time;
- clinical clarification/call and fulfilment health where aggregate safe evidence exists.

Never put names, email, phone, Medicare/IHI, address, intake IDs, click IDs, search terms, medicines, clinical answers, or free text into the experiment readout.

## Release and Rollback

- Product code may be implemented and verified on this branch after Fable review.
- Deployment, merge, live Ads inspection that exposes external data, and every Ads mutation remain separately approval-gated.
- Each active approach ships as an exact SHA with activation time recorded in the registry.
- Rollback is a code change that restores the last verified version. It must preserve saved drafts and cohort markers.
- Stop acquisition immediately for weakened safety, broken checkout/payment, missing prescribing identity, refund/fulfilment failure, compliance drift, or unhealthy clinical queue evidence.

## Fable Review Gate

Before product code changes, an independent reviewer must return `KEEP`, `REVISE`, or `BLOCK` and inspect:

- whether the plan can distinguish product lift from acquisition lift;
- whether the low-volume decision rules overclaim significance;
- whether the cohort marker is proportionate and privacy-safe;
- whether any intake or safety change adds friction or weakens clinical protection;
- whether public copy is TGA/AHPRA/Google compliant;
- whether payment and recovery paths preserve the assigned cohort;
- whether Ads stop gates are enforceable without invented evidence;
- whether medical-certificate work or employer outreach leaked into scope;
- whether rollback and production proof are concrete.

Implementation starts only after all load-bearing `REVISE`/`BLOCK` findings are resolved in this document and the implementation plan.

## Fable Review Receipt — 2026-08-28

**Reviewed commit:** `9bb139866`

**Verdict:** `REVISE`
**Resolution:** All six load-bearing findings were accepted and applied before product-code work.

| Finding | Correction applied |
|---|---|
| Saved cohort could be overwritten | Cohort is now set-once per draft session and immutable after intake creation, with database and recovery tests required. |
| Draft/persistence plan had two wrong paths and omitted the live draft API | The implementation plan now names `types/db.ts`, `lib/stripe/checkout/stripe-session.ts`, `app/api/draft/route.ts`, `app/request/page.tsx`, and `components/request/request-flow.tsx`. |
| Direct specialty starts would contaminate landing-version results | Only a validated landing CTA token can assign H1/E1; direct and untagged starts remain unassigned. |
| Hair used contradictory 20- and 30-click stops | Hair now has an exact 19/20 boundary; 29/30 remains for ED/Women's Health. The Hair experiment's A$60 incremental loss pre-empts clicks when trustworthy experiment evidence exists. |
| Hair safety test omitted the subtype that activates the rule | Tests now require `consultSubtype: "hair_loss"` and cover `yes`, `no`, `na`, and missing values through normal, recovery, and retry paths. |
| Sequential windows lacked verifiable opening/closing controls | Exact opening and closing receipts are now mandatory; drift makes the result contaminated/inconclusive. |

The reviewer found no basis to close Hair or ED, add intake friction, include employer outreach, or broaden live Ads authority.
