# ED + Hair Loss Hardening — Design

**Date:** 2026-04-09
**Status:** Design approved, implementation pending
**Scope owner:** Rey
**Related audit:** Comprehensive ED + hair loss system audit, 2026-04-09

---

## Goal

Turn ED and hair loss from "landing page + rough intake" into two genuinely production-grade specialist pathways that match the interaction density and clinical rigor of `/medical-certificate`. Fix the actively broken doctor-portal rendering, close the TGA compliance gap on the public marketing surface, add the engaging interactive elements the pages currently lack, surface proper subtype differentiation through the fulfilment pipeline, harden the Stripe mapping, and add a post-purchase follow-up tracker so outcomes can be measured over time.

---

## Scope

### What this project delivers

- **Phase 1 — Launch-blocker fixes (non-intake portion):** doctor-portal field-name alignment + drug-name strip-out from landing pages, FAQs, exit-intent copy.
- **Phase 2 — Landing page depth:** both ED and hair loss landing pages rebuilt to match `/medical-certificate` quality, with new hook quizzes, interactive calculators, timeline visualisations, ported shared sections, subtype-aware fulfilment notifications, and a hardened Stripe price mapping.
- **Phase 3 — Retention infrastructure:** post-purchase follow-up tracker with new data model, cron-driven email reminders, patient-dashboard progress card, doctor-portal decision-support shell.

### What this project explicitly defers

The user will research how Pilot, NextClinic, and other AU telehealth competitors structure their ED and hair loss intake questions and return with findings. Until then, **any change to intake question content is frozen**. This defers:

- Hair-loss safety step (new)
- ED safety step expansion (alpha-blockers, poppers, NAION, etc.)
- Drug-name strip-out from intake step option cards (they currently say "Tadalafil 5mg" and "Finasteride" — will be fixed during the intake rewrite, not now)
- Removing "alopecia areata" from the `hairPattern` picker
- Renaming `edHypertension` → `edUncontrolledHypertension` and similar field tidy-ups
- IIEF-5 replacement of the existing ED assessment step
- Norwood picker + photo upload inside intake
- Doctor-portal IIEF-5 severity badge and Norwood thumbnail widgets (depend on intake field shape)

These items will be scoped and delivered in a follow-up design document once the competitor research lands.

### Cross-phase contract

So the deferred intake work can pre-fill from the landing page hook quizzes without a re-architect, Phase 2 establishes a stable `sessionStorage` contract:

| Key | Shape | Set by | Read by (future) |
|---|---|---|---|
| `instantmed.hookQuiz.ed.v1` | `{ tier: 'mild' \| 'moderate' \| 'severe', answers: [a,b,c], completedAt: ISO }` | `EdHookQuiz` | Future ED intake IIEF-5 step |
| `instantmed.hookQuiz.hair_loss.v1` | `{ norwood: 1-7, durationBucket: '<6mo' \| '6-12mo' \| '1-3yr' \| '3yr+', completedAt: ISO }` | `HairLossHookQuiz` | Future hair loss clinical step |

The `v1` suffix is a version namespace so the contract can evolve without breaking stored data. The 24-hour expiry rule from the Zustand intake store applies here too — reads check `completedAt` and ignore entries older than 24 hours.

---

## Phase 1 — Launch-Blocker Fixes (non-intake portion)

### 1.1 Doctor-portal field-name alignment

**Problem:** `components/doctor/clinical-summary.tsx` looks for snake_case keys (`ed_onset`, `morning_erections`, `nitrate_use`, `hair_loss_duration`, etc.) but the intake writes camelCase (`edOnset`, `edMorningErections`, `nitrates`, `hairDuration`). As a result, the `CONSULT_SUBTYPE_FIELDS` render block never matches and every ED / hair loss answer falls into the unlabeled "Additional Information" catch-all, capped at 8 fields. Doctors reviewing current cases see a truncated anonymous field dump instead of a structured assessment.

**Fix:** extend `CONSULT_SUBTYPE_FIELDS` to include all the camelCase keys the intake currently writes, each with a human label and appropriate highlight list. Keep the snake_case keys alongside so pre-migration data (if any) still renders.

```ts
// components/doctor/clinical-summary.tsx
ed: {
  label: "Erectile Dysfunction Assessment",
  fields: [
    // Current camelCase keys from intake (what actually exists today)
    "edOnset", "edFrequency", "edMorningErections",
    "edAgeConfirmed", "edHypertension", "edDiabetes",
    "edPreference", "edAdditionalInfo",
    "nitrates", "recentHeartEvent", "severeHeartCondition", "previousEdMeds",
    // Legacy/future snake_case kept for forward-compat
    "ed_onset", "ed_frequency", "ed_severity", "morning_erections",
    "nitrate_use", "alpha_blocker_use", "cardiovascular_history",
  ],
  highlight: [
    "nitrates", "nitrate_use",
    "recentHeartEvent", "severeHeartCondition",
    "edHypertension", "edDiabetes",
    "cardiovascular_history",
  ],
},
hair_loss: {
  label: "Hair Loss Assessment",
  fields: [
    "hairPattern", "hairDuration", "hairFamilyHistory",
    "hairPreviousTreatments", "hairMedicationPreference",
    "hairScalpConditions", "hairAdditionalInfo",
    // Legacy/future snake_case
    "hair_loss_duration", "hair_loss_pattern", "hair_loss_family_history",
    "hair_loss_previous_treatment", "scalp_condition",
  ],
},
```

Also extend `FIELD_LABELS` map with readable labels for each new camelCase key so they don't get auto-formatted as "Ed Onset". Add explicit labels: "ED onset", "Frequency of ED", "Morning erections", "Age 18+ confirmed", "Uncontrolled hypertension", "Uncontrolled diabetes", "Treatment preference", "Additional context", "Nitrate use", "Recent heart event", "Severe heart condition", "Previous ED medication use", and equivalent for hair loss.

Add a new unit test `lib/__tests__/clinical-summary-render.test.ts` that mounts `<ClinicalSummary>` with realistic ED and hair loss answer objects and asserts the subtype panel renders the expected labels. This prevents future regressions if the intake keys move again before the intake rewrite lands.

**Files touched:**
- `components/doctor/clinical-summary.tsx`
- `lib/__tests__/clinical-summary-render.test.tsx` (new — moves to .tsx because it renders JSX)

**Risk:** zero. This is additive — the existing snake_case keys stay in place, the new camelCase keys are added, and the render logic already tolerates missing keys. When the intake rewrite lands later, new keys get added to the same map in the same PR.

### 1.2 Drug name strip-out — marketing surface only

**Scope:**

| File | Current | Replace with |
|---|---|---|
| `lib/data/ed-faq.ts:20` | "PDE5 inhibitors (the medication class that includes sildenafil and tadalafil)" | "a class of prescription oral treatments" |
| `components/marketing/erectile-dysfunction-landing.tsx` | any instance of "Viagra", "Cialis", "sildenafil", "tadalafil", "PDE5 inhibitor" in user-visible copy | "oral treatment", "as-needed treatment", "daily treatment" |
| `components/marketing/hair-loss-landing.tsx` | any drug names (already mostly clean) | audit and fix any remaining |
| `lib/data/hair-loss-faq.ts` | already compliant | no change |
| `components/marketing/exit-intent-overlay.tsx` | any ED/hair loss drug names in exit copy | generic phrasing |

The **intake step option cards** (`ed-assessment-step.tsx` lines 279, 306 and `hair-loss-assessment-step.tsx` lines 45, 46, 268, 295) are out of scope for this phase — they'll be rewritten as part of the intake content overhaul after competitor research lands.

**Metadata and SEO:** keep SEO-relevant terms in `<meta>` tags, structured-data schema, and URL slugs where the TGA prohibition doesn't apply (search engine indexing of non-consumer-facing elements is a different legal surface). Specifically: `metadata.keywords` in `app/erectile-dysfunction/page.tsx` and `app/hair-loss/page.tsx` can continue to include search terms like "ED treatment australia" but should not name specific drugs.

**Files touched:**
- `lib/data/ed-faq.ts`
- `components/marketing/erectile-dysfunction-landing.tsx`
- `components/marketing/hair-loss-landing.tsx` (audit pass)
- `components/marketing/exit-intent-overlay.tsx` (audit pass)

---

## Phase 2 — Landing Page Depth

Both pages get rebuilt to match the `/medical-certificate` quality bar. Approach: **reuse existing section components from the med cert page wherever applicable, build new ones only where the med cert equivalent doesn't apply to ED/hair loss.**

### 2.1 Sections ported from med cert (shared across ED + hair loss)

| Component | Source | ED | Hair loss | Notes |
|---|---|---|---|---|
| `DoctorAvailabilityPill` | `components/shared/doctor-availability-pill` | already in use | already in use | no change needed |
| `RotatingText` | `components/marketing/rotating-text` | already in use | already in use | audit copy |
| `LiveWaitTime` | `components/marketing/live-wait-time` | **add** | **add** | extend component to support `services={["consult-ed"]}` and `services={["consult-hair-loss"]}` or pass the subtype through |
| `SocialProofStrip` with `AnimatedStat` | med-cert inline | **port** | **port** | extract `AnimatedStat` to a shared component first |
| `ContextualMessage` | med-cert inline | **port** with new copy | **port** with new copy | new service-aware variants, see 2.1.1 |
| `RecentReviewsTicker` | new (generalised from med cert's `RecentActivityTicker`) | **build** | **build** | privacy-first for ED, see 2.1.2 |
| `DoctorProfileSection` | `components/marketing/sections/doctor-profile-section` | **add** | **add** | already subtype-aware |
| `PricingSection` with comparison table | `components/marketing/sections/pricing-section` | already in use | already in use | audit whether comparison table is enabled (set `showComparisonTable` if not) |
| `TestimonialsSection` | already in use | already in use | already in use | ensure `getTestimonialsByService("erectile-dysfunction")` / `"hair-loss"` returns service-specific ones |
| `RegulatoryPartners` | already in use | already in use | already in use | verify `exclude` list is appropriate |
| `FaqCtaSection` | already in use | already in use | already in use | no change |
| `FinalCtaSection` | already in use | already in use | already in use | no change |
| `ExitIntentOverlay` | already in use | already in use | already in use | audit copy for drug names (handled in 1.2) |
| Sticky mobile CTA + sticky desktop CTA | med-cert inline | already in use | already in use | no change |
| `ContentHubLinks` | `components/seo/content-hub-links` | **add** | **add** | new hub entries for ED / hair loss content clusters |
| `RelatedArticles` strip | med-cert inline | **port** | **port** | point to service-specific blog content once it exists |

#### 2.1.1 Service-aware `ContextualMessage`

Replace the hardcoded med-cert copy in `ContextualMessage` with a service-indexed lookup:

```ts
const CONTEXTUAL_MESSAGES: Record<"med-cert" | "ed" | "hair-loss", ContextualMessageSet> = {
  "med-cert": { /* existing copy */ },
  "ed": {
    mondayMorning: "Sorting this before the day starts? Most assessments are reviewed before lunch.",
    sundayEvening: "Get it sorted tonight — reviewed before Monday.",
    weeknightLate: "Too late for a GP? We're reviewing now.",
    weekendDay: "Weekend and your GP is closed? We're open right now.",
  },
  "hair-loss": {
    januaryAny: "Starting fresh in the new year? Month 3 is usually when you start noticing the difference.",
    weekendDay: "Taking care of this on the weekend? Reviewed within a few hours.",
    // ...
  },
}
```

Extract `ContextualMessage` to `components/marketing/contextual-message.tsx`, accept a `service` prop, no more inline state in the page.

#### 2.1.2 `RecentReviewsTicker` — privacy-first for ED

The med cert `RecentActivityTicker` says "Sarah from Melbourne received her certificate 23 min ago." For ED this is too exposing — even with fake names, the juxtaposition is shame-sensitive. New rules:

- **Med cert + hair loss:** first name + city + time (matches current pattern)
- **ED:** "A patient from [city] received their treatment [N] min ago" — no name

The component accepts a `format: 'named' | 'anonymous'` prop. ED landing passes `anonymous`, others pass `named`.

### 2.2 ED landing — new sections

#### A. `EdHookQuiz` — above-the-fold engagement

Lives just below the hero. Three questions, inline radio-chip style, no page navigation:

1. "Over the past 4 weeks, how often have you been able to get an erection firm enough for sex?" — 5 options mapped to scores 1–5
2. "When you started, how confident were you that you could get and keep it?" — 5 options
3. "Over the past 4 weeks, how satisfying was sex for you?" — 5 options

Total 3–15 → tiered into:
- 3–6: Severe
- 7–10: Moderate
- 11–15: Mild

Result card replaces the quiz in place with a subtle animation: shows the tier, a 1-line reassurance ("You're not alone — most patients in this tier see improvement with treatment"), and a CTA button to start the full assessment. Saves to sessionStorage under the key contract above.

This is NOT the IIEF-5 — IIEF-5 is 5 questions with a different scoring scale and lives inside the intake (Phase 3, deferred). This is a lightweight 3-question hook designed for conversion, clearly positioned as "a quick check, not a clinical assessment."

**Copy notes:** no drug names. No treatment promises. "Most patients at this level see improvement with treatment" is a factual statement about the patient population, not a claim about a specific drug. TGA-defensible.

**PostHog events:** `ed_hook_quiz_start`, `ed_hook_quiz_q1_answered`, `ed_hook_quiz_q2_answered`, `ed_hook_quiz_q3_answered`, `ed_hook_quiz_completed` (with `tier` property), `ed_hook_quiz_cta_clicked`.

**File:** `components/marketing/sections/ed-hook-quiz.tsx` (new)

#### B. `EdPrevalenceCalculator` — mid-page destigmatisation

Single input: age slider (18–80, default 40). Output:

- Animated horizontal bar showing the prevalence rate for that age decade based on published data. Data source locked in a constant `ED_PREVALENCE_BY_DECADE` citing MMAS (Massachusetts Male Aging Study) and whatever AU-specific data we can find. Each decade bucket has a conservative published rate: e.g., 20s: ~8%, 30s: ~11%, 40s: ~22%, 50s: ~34%, 60s: ~45%, 70s+: ~60%.
- Headline: "~{N}% of men in their [decade] experience ED at least sometimes"
- Subline: "You're not alone — it's more common than most men think, and it's treatable."
- Below the bar, a 2-line cardiovascular context: "ED can be an early signal of heart or circulation issues. If this is new and you're over 40, worth mentioning to the doctor during your assessment." Links to an internal guide article (`/blog/ed-cardiovascular-link` — can be stubbed if the article doesn't exist yet).

No calculation is actually happening — it's a lookup. The "calculator" framing is UX, not math. That's fine.

**PostHog events:** `ed_prevalence_age_changed` (age value), `ed_prevalence_cta_clicked`.

**File:** `components/marketing/sections/ed-prevalence-calculator.tsx` (new)

#### C. `EdMechanismExplainer` — further down the page

Scroll-triggered stepped animation showing the physiological response to oral treatment in a class-level abstract way:

1. **Baseline:** illustrated cross-section of a blood vessel, minimal flow, labeled "When arousal signals reach the body, the baseline response can be weak."
2. **Treatment response:** smooth muscle relaxation animation, vessel dilation, labeled "Oral treatment enhances the signal pathway — more blood flow to the area when you're aroused."
3. **Duration:** timeline bar showing typical onset and duration windows (generic to the oral-treatment class, not a specific drug).

Generic anatomical imagery only, no pills, no packaging, no brand cues. The furthest the copy goes is "oral treatment class." This is educational content about a mechanism of action, not advertising of a specific product. TGA-defensible.

Implementation: SVG with `framer-motion` scroll-triggered animation, respects `useReducedMotion`.

**PostHog events:** `ed_mechanism_viewed` (scroll-into-view), `ed_mechanism_cta_clicked`.

**File:** `components/marketing/sections/ed-mechanism-explainer.tsx` (new)

#### D. Guide section expansion

`components/marketing/sections/ed-guide-section.tsx` exists but is thin. Expand it with three new sub-sections:

1. **"When ED is a signal of something bigger"** — cardiovascular health, diabetes, testosterone, sleep apnea, stress and mental health. One paragraph each, cite-linked to internal blog articles where they exist.
2. **"What to expect from a telehealth assessment"** — step-by-step walkthrough of what happens after the CTA click, how long review takes, how delivery works.
3. **"Privacy and discretion — end to end"** — walk through: what the pharmacist sees (just the script), what the bank statement says ("InstantMed"), how the package arrives (plain pharmacy packaging).

**File modified:** `components/marketing/sections/ed-guide-section.tsx`

#### E. Outcomes section

New `EdOutcomesSection` component. Three-column layout: "What treatment typically does" / "What it doesn't do" / "When it's not appropriate." Honest, no overpromising. Replaces the current `EDLimitationsSection` approach with a more balanced frame — limitations are still in there, but framed as part of a fuller "here's what you're signing up for" story instead of a doom list.

**File:** `components/marketing/sections/ed-outcomes-section.tsx` (new; existing `ed-limitations-section.tsx` deleted or folded in)

### 2.3 Hair loss landing — new sections (distinct but lean)

User directive: *"do all 3 as distinct sections. dont overdo it or make the page heavier"* — each one does one job well, no stacked heavy animations.

#### A. `HairLossHookQuiz` — above-the-fold engagement

Interactive Norwood-style picker. Seven SVG silhouettes in a horizontal strip (top-down view of a head showing progressively more scalp visible), tap to select your stage. Below that, a single duration question: "How long has this been happening?" with four options.

Result card shows:
- "Stage [N] at [duration]"
- Framing: "Consistent treatment typically prevents further progression, and many patients see regrowth at this stage."
- No drug names, no promises, no "you will see results in N weeks."
- CTA to start full assessment.

Saves `{ norwood: 1-7, durationBucket: '<6mo'|'6-12mo'|'1-3yr'|'3yr+' }` to sessionStorage under the key contract.

**PostHog events:** `hair_loss_hook_quiz_norwood_selected` (stage), `hair_loss_hook_quiz_duration_selected`, `hair_loss_hook_quiz_cta_clicked`.

**File:** `components/marketing/sections/hair-loss-hook-quiz.tsx` (new). The SVG silhouettes live in `public/images/norwood/` and are sourced from public-domain medical illustrations (or commissioned fresh if budget allows — the design doc should not assume specific assets are ready).

#### B. `HairLossProgressTimeline` — mid-page

Scrubbable horizontal slider with a single illustrated scalp. As the slider moves from month 0 to month 12, the illustration morphs through realistic density stages. Three milestone annotations float above the slider at months 3, 6, 12:

- **Month 3:** "Shedding often stabilises."
- **Month 6:** "Initial regrowth typically visible in mirror."
- **Month 12:** "Full treatment window — most improvement is visible."

Lean implementation: compact strip (~160px tall), single SVG scalp with CSS/framer-motion driven density morph (use `filter: blur()` and opacity tricks to avoid shipping 12 separate illustrations). Scrollable or tappable on mobile.

**No real patient photos** — illustrated only. Avoids the privacy and "before/after" regulation minefield. Also avoids anchoring expectations to any individual's atypical response.

**PostHog events:** `hair_loss_timeline_scrubbed`, `hair_loss_timeline_cta_clicked`.

**File:** `components/marketing/sections/hair-loss-progress-timeline.tsx` (new)

#### C. Norwood stage visualiser — inside the guide section

This is **not** a new top-level section — it lives inside the expanded `hair-loss-guide-section.tsx`. Seven tappable stages, each opens a small content drawer showing the typical trajectory at that stage (with treatment vs without). Compact, informational, no interactive overhead.

**File modified:** `components/marketing/sections/hair-loss-guide-section.tsx`

#### D. Family history risk callout strip

Thin section, 2-line copy, no interactive input. One compact container:

> **"If a parent had hair loss at your age or earlier, your risk roughly doubles. Starting treatment while follicles are still alive preserves far more hair than waiting."**
>
> *[CTA] Start your assessment*

That's it. Lean, factual, data-driven without a calculator overhead.

**File:** `components/marketing/sections/hair-loss-family-history-strip.tsx` (new — or inline in the landing page if it's simple enough)

#### E. Guide section expansion

`hair-loss-guide-section.tsx` gets a full expansion in parallel with the ED guide:

1. **"Types of hair loss — what's treatable and what isn't"** — AGA (male and female), telogen effluvium, traction alopecia, scarring alopecias, autoimmune. Explicitly explain which are addressed by online assessment and which aren't.
2. **"The hair growth cycle explained"** — anagen, catagen, telogen; why treatments take 3+ months to show.
3. **"Typical treatment timeline"** — month-by-month what to expect.
4. **"Side effects — honest version"** — rare but real, the mental health + sexual function discussion, how to spot them early, how to talk to the doctor.
5. **"If you stop treatment"** — rebound shedding, the maintenance nature of the treatment.

**File modified:** `components/marketing/sections/hair-loss-guide-section.tsx`

### 2.4 Subtype notifications

`app/api/stripe/webhook/handlers/checkout-session-completed.ts` — replace the `slugDisplayNames` hardcoded map with a richer resolver that knows about consult subtypes:

```ts
function getServiceDisplayName(slug: string, category: string, subtype: string): string {
  if (category === "consult" && subtype) {
    const subtypeLabels: Record<string, string> = {
      ed: "ED Consultation",
      hair_loss: "Hair Loss Consultation",
      womens_health: "Women's Health Consultation",
      weight_loss: "Weight Loss Consultation",
      new_medication: "New Medication Request",
      general: "General Consultation",
    }
    return subtypeLabels[subtype] ?? "Consultation"
  }
  // existing slug logic for med cert, repeat scripts
  return slugDisplayNames[slug] ?? "Consultation"
}
```

Pass the resolved label through to:
- `notifyNewIntakeViaTelegram(...)` — the Telegram doctor notification
- Patient email subject line (Resend template)
- Any internal alerting (Sentry breadcrumbs, PostHog events)

Also verify: the doctor queue list at `/doctor/intakes` — does the queue item already show the subtype, or only the detail view? If only detail, add it to the queue list too. A doctor scanning 20 cases needs to see "ED" / "Hair Loss" in the queue without clicking in.

**Files touched:**
- `app/api/stripe/webhook/handlers/checkout-session-completed.ts`
- `app/doctor/intakes/page.tsx` or whatever renders the queue list
- `emails/new-intake-received.tsx` (or wherever the patient confirmation email template lives)

### 2.5 Stripe price mapping hardening

`lib/stripe/price-mapping.ts:97-102` — the current fallback silently logs a warning and uses the generic `STRIPE_PRICE_CONSULT` when a subtype env var is missing. Change to:

```ts
if (!priceId) {
  if (process.env.NODE_ENV === "production") {
    // Hard fail in prod — mischarging is worse than a 500
    throw new Error(
      `Missing Stripe price env var for consult subtype '${subtype}'. ` +
      `Expected one of: STRIPE_PRICE_CONSULT_ED, STRIPE_PRICE_CONSULT_HAIR_LOSS, ...`
    )
  }
  logger.warn(...)
  return DEFAULT_CONSULT_PRICE
}
```

Add the required env vars to `OPERATIONS.md` required-env-vars list and to `.env.example`. Add a boot-time check at `app/layout.tsx` or a dedicated env-validation module that fails loud on startup in prod if any of the subtype price env vars are missing — catches misconfig before the first customer sees a 500.

**Files touched:**
- `lib/stripe/price-mapping.ts`
- `.env.example`
- `OPERATIONS.md`
- `lib/env.ts` (add validation)

---

## Phase 3 — Retention Infrastructure (non-intake portion)

### 3.1 Follow-up tracker — data model

Two new tables plus a new storage bucket for future photo uploads (bucket created now, used in the deferred intake phase).

```sql
-- migration: 20260410000001_followup_tracker.sql

CREATE TABLE public.intake_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  subtype text NOT NULL CHECK (subtype IN ('ed','hair_loss')),
  milestone text NOT NULL CHECK (milestone IN ('month_3','month_6','month_12')),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  side_effects_reported boolean DEFAULT false,
  effectiveness_rating smallint CHECK (effectiveness_rating BETWEEN 1 AND 5),
  patient_notes text,
  doctor_reviewed_at timestamptz,
  doctor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, milestone)
);

CREATE INDEX idx_intake_followups_due ON public.intake_followups (due_at) WHERE completed_at IS NULL;
CREATE INDEX idx_intake_followups_patient ON public.intake_followups (patient_id, completed_at);

CREATE TABLE public.followup_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id uuid NOT NULL REFERENCES public.intake_followups(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  template text NOT NULL,
  resend_message_id text,
  reminder_number smallint NOT NULL CHECK (reminder_number BETWEEN 1 AND 3)
);

CREATE INDEX idx_followup_email_log_followup ON public.followup_email_log (followup_id, sent_at);

-- RLS
ALTER TABLE public.intake_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_email_log ENABLE ROW LEVEL SECURITY;

-- Patients can see their own
CREATE POLICY followups_patient_select ON public.intake_followups
  FOR SELECT USING (patient_id = auth.uid());

-- Patients can update completion (via server action, but RLS as defence in depth)
CREATE POLICY followups_patient_update ON public.intake_followups
  FOR UPDATE USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Doctors can see and review all
CREATE POLICY followups_doctor_all ON public.intake_followups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor','admin'))
  );

-- Email log: server-role only
CREATE POLICY followup_email_log_service ON public.followup_email_log
  FOR ALL USING (auth.role() = 'service_role');
```

```sql
-- Storage bucket for deferred photo upload phase (create now so the infra exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-photos', 'intake-photos', false)
ON CONFLICT DO NOTHING;

-- RLS on storage.objects for this bucket
CREATE POLICY intake_photos_patient_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'intake-photos'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY intake_photos_doctor_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'intake-photos'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor','admin'))
  );

CREATE POLICY intake_photos_patient_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'intake-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

Path convention: `intake-photos/{patient_id}/{intake_id}/{angle}.jpg` (angle = `top`, `front`, `back`, `hairline`). Foldername check enforces per-patient isolation.

**Trigger: create followup rows on approval.** When an ED or hair loss intake is approved, create three `intake_followups` rows. This can be either a Postgres trigger on `intakes` or a Node-side call in the approval server action — Node-side is easier to test, keep it there.

Approval flow change: in `app/actions/doctor/approve-intake.ts` (or wherever approval happens), after the state transition, if `category === 'consult' && subtype IN ('ed','hair_loss')`, insert three rows:

```ts
const approvedAt = new Date()
const milestones = [
  { milestone: 'month_3' as const, due: addMonths(approvedAt, 3) },
  { milestone: 'month_6' as const, due: addMonths(approvedAt, 6) },
  { milestone: 'month_12' as const, due: addMonths(approvedAt, 12) },
]
await supabase.from('intake_followups').insert(
  milestones.map(m => ({
    intake_id: intake.id,
    patient_id: intake.patient_id,
    subtype: intake.subtype,
    milestone: m.milestone,
    due_at: m.due.toISOString(),
  }))
)
```

### 3.2 Cron job — daily reminder email

New file `scripts/cron/send-followup-emails.ts`, registered in `vercel.json` as a daily Vercel Cron at 09:00 AEST (UTC 23:00 the prior day).

Query: select followups where
- `completed_at IS NULL`
- `due_at < now()`
- No log entry in `followup_email_log` in the last 3 days for this followup
- Total log entries for this followup < 3 (max 3 reminders then give up)

For each result:
- Fetch patient email from `profiles`
- Send Resend email using template `followup-reminder-{subtype}-{milestone}.tsx`
- Insert a row into `followup_email_log` with the message ID and incremented reminder number
- On Resend failure: log to Sentry, do not insert log row (so it retries tomorrow)

Email template structure:
- Subject: "How's your treatment going? — InstantMed 3-month check-in" (or 6 / 12)
- Body: one paragraph framing, a single CTA button linking to `/patient/followups/{id}` with a one-time access token, a small "not relevant anymore? reply STOP or click here" unsubscribe line that marks the followup as `completed_at = now()` with a sentinel note `{ skipped: true }` so the patient isn't pestered further.

Unsubscribe is per-followup, not a global list — keeps this within "transactional email" framing which doesn't require the same opt-in rigor as marketing blasts. Still needs one-click unsubscribe per Australian Spam Act.

**Files:**
- `scripts/cron/send-followup-emails.ts` (new)
- `vercel.json` — new cron entry
- `emails/followup-reminder-ed-month-3.tsx` (new)
- `emails/followup-reminder-ed-month-6.tsx` (new)
- `emails/followup-reminder-ed-month-12.tsx` (new)
- `emails/followup-reminder-hair-loss-month-3.tsx` (new)
- `emails/followup-reminder-hair-loss-month-6.tsx` (new)
- `emails/followup-reminder-hair-loss-month-12.tsx` (new)

Six templates feels like a lot but each is ~30 lines of JSX with different copy. Could alternatively build a single parameterised template — decision: **single parameterised template** to reduce duplication. `emails/followup-reminder.tsx` takes `subtype` and `milestone` props and renders the right copy from a lookup. Implementation plan will favour the parameterised version.

Also add `OPERATIONS.md` entry for the new cron job.

### 3.3 Patient dashboard — follow-up progress card

New component `components/patient/followup-tracker-card.tsx`. Renders on `/patient` dashboard above or near the order history. Only renders if the patient has any active (non-completed) ED or hair loss followups.

Card states:

- **No active followups:** card doesn't render.
- **Next milestone upcoming (not yet due):** "Your next check-in: [milestone label] on [date]" — informational, no CTA yet.
- **Next milestone due:** "Time for your [milestone] check-in" + CTA button to `/patient/followups/{id}`.
- **Milestone overdue (>7 days):** same as above but with a gentle amber border.

Layout: 3-dot progress indicator at the top (●○○ → ●●○ → ●●●), milestone label, short "how's it going" prompt, CTA when due.

**File:** `components/patient/followup-tracker-card.tsx` (new)

### 3.4 Follow-up submission route

New route `app/patient/followups/[id]/page.tsx` with a short form:

1. "How's your treatment going overall?" — 5-point radio (1 = not working to 5 = very well)
2. "Have you experienced any side effects?" — yes/no + conditional textarea
3. "How many days per week are you using your treatment?" — numeric input or 0–7 slider
4. "Anything you want to tell the doctor?" — optional textarea
5. (Hair loss only) "Upload a photo if you'd like to show progress" — optional, single upload, saves to `intake-photos/{patient_id}/followup-{id}/progress.jpg`

Server action `submitFollowup` validates, writes to `intake_followups` (completed_at, side_effects_reported, effectiveness_rating, patient_notes), optionally inserts photo row, flags the parent intake with a "new followup for review" marker.

If `side_effects_reported = true` OR `effectiveness_rating <= 2`: additionally insert a high-priority notification for doctor review so they see it promptly.

**Files:**
- `app/patient/followups/[id]/page.tsx` (new)
- `app/patient/followups/[id]/followup-form.tsx` (new client component)
- `app/actions/followups.ts` (new — server actions `submitFollowup`, `skipFollowup`, `getFollowup`)

### 3.5 Doctor portal — follow-up review surface

When viewing an ED or hair loss intake detail page, if there are follow-up entries, show them in a new "Follow-up check-ins" card in chronological order. Each entry shows: milestone, submitted date, rating with color coding, side effects (if any) highlighted, patient notes, a "mark reviewed" button that sets `doctor_reviewed_at` and `doctor_id`.

**Files:**
- `app/doctor/intakes/[id]/intake-detail-followups.tsx` (new)
- Modified: `app/doctor/intakes/[id]/page.tsx` to render the new card

### 3.6 Doctor portal decision-support shell

Broader portal improvements landing in this phase, minus the widgets that depend on intake field shape (IIEF-5 severity badge, Norwood thumbnails — those come with the intake rewrite):

- Auto-highlight nitrates, recent heart event, severe heart condition answers with a destructive-toned badge and a `<HoverCard>` tooltip showing the rationale ("PDE5 inhibitors are absolutely contraindicated with nitrates — can cause life-threatening hypotension")
- Auto-highlight `edHypertension` / `edDiabetes` (once renamed) with a warning tone
- Auto-highlight any safety-flagged hair loss fields once those exist (deferred)

The hover-card rationale strings live in a new `lib/clinical/contraindication-rationales.ts` keyed by answer field name. Easy to extend when the intake rewrite lands.

**Files:**
- `components/doctor/clinical-summary.tsx` (extend existing subtype render to wrap highlights in a HoverCard)
- `lib/clinical/contraindication-rationales.ts` (new)

---

## Data model changes — summary

| Change | Phase | Migration |
|---|---|---|
| `intake_followups` table + RLS | 3 | `20260410000001_followup_tracker.sql` |
| `followup_email_log` table + RLS | 3 | same migration |
| `intake-photos` storage bucket + RLS | 3 | same migration |
| Any jsonb answer keys that change (none — frozen by scope cut) | — | — |

Migration count after this project: **195** (currently 194 per CLAUDE.md).

---

## Risks & trade-offs

- **Phase 1 is narrower than originally planned because the intake changes are deferred.** The doctor-portal field-name fix (1.1) is still high-value because it unblocks visibility of existing ED/hair loss cases today. Without it, any cases submitted between now and the intake rewrite are hard to review.
- **Hook quiz results saved to sessionStorage** are ephemeral and can be wiped by the browser. That's fine — worst case, the user just re-answers the same questions inside the intake. The data isn't load-bearing.
- **No photo uploads yet** — hair loss follow-ups in Phase 3 will optionally accept a photo, but the core-intake photo upload is deferred to the intake rewrite. This creates a small temporal inconsistency (we have 12-month follow-up photos but no baseline) — not a blocker, just something to be aware of.
- **TGA compliance on landing pages** is tightened but the **intake step option cards still say "Tadalafil 5mg" / "Finasteride" until the intake rewrite lands.** This is an ongoing exposure for the duration of the scope cut. Acceptable if the intake rewrite lands soon; worth flagging as a known issue otherwise.
- **Follow-up emails could spam a patient who has stopped treatment.** Mitigation: max 3 reminders per milestone, clear one-click unsubscribe in every email, and a "skip" button on the dashboard card so they can dismiss without filling out the form.
- **Mechanism explainer animation** is the most TGA-sensitive new element. If the TGA ever reviews, the argument is "this is educational content about a mechanism of action, not advertising of a specific drug." Defensible but not zero risk. Keep drug names out of it strictly.
- **Prevalence calculator data accuracy** — the MMAS-derived numbers are 30+ years old and US-based. Add a footnote citing the source so the numbers are defensible. If better AU data exists, prefer it. If a critic challenges the numbers, we can adjust — but not claiming they're infallible is the right posture.

---

## Out of scope (explicit)

**Deferred pending user's competitor research:**
- All intake question content changes (ED safety, hair loss safety, IIEF-5, Norwood picker, photo upload inside intake, drug-name strip-out from intake option cards, alopecia areata removal, field renames)
- Any new validation schema rules for intake questions

**Deferred post-launch regardless:**
- Photo recognition / auto-Norwood staging
- Before/after real patient photo galleries (privacy review needed first)
- Multi-language content
- Non-binary / trans-specific hair loss pathways (needs clinical advisor scoping, not this project)
- A/B testing infrastructure for hook quiz copy (PostHog experiments can layer on later)
- Weight loss / women's health parallel uplift (explicitly scoped to ED + hair loss)
- TGA-adjacent SEO rewrites of existing blog content (separate project)
- Doctor training material on new decision-support UI (separate project)

---

## Phasing & merge order

Each phase is independently PR-reviewable and independently ship-able.

| Phase | Approx scope | Blocked by | Unblocks |
|---|---|---|---|
| 1 | ~1 day | nothing | nothing (independent) |
| 2 | ~3 days | nothing | nothing (independent of 1 and 3) |
| 3 | ~4 days | nothing | future intake rewrite to add IIEF-5/Norwood widgets |

Phases can land in any order but the recommended sequence is **1 → 2 → 3** because Phase 1 fixes an active clinical-visibility bug that Phase 2 and 3 don't address.

---

## File / component impact summary

### Phase 1
- `components/doctor/clinical-summary.tsx` (extend field map)
- `lib/__tests__/clinical-summary-render.test.tsx` (new)
- `lib/data/ed-faq.ts` (copy)
- `components/marketing/erectile-dysfunction-landing.tsx` (copy audit)
- `components/marketing/hair-loss-landing.tsx` (copy audit)
- `components/marketing/exit-intent-overlay.tsx` (copy audit)

### Phase 2
- `components/marketing/erectile-dysfunction-landing.tsx` (restructure)
- `components/marketing/hair-loss-landing.tsx` (restructure)
- `components/marketing/sections/ed-hook-quiz.tsx` (new)
- `components/marketing/sections/ed-prevalence-calculator.tsx` (new)
- `components/marketing/sections/ed-mechanism-explainer.tsx` (new)
- `components/marketing/sections/ed-outcomes-section.tsx` (new)
- `components/marketing/sections/ed-guide-section.tsx` (expand)
- `components/marketing/sections/hair-loss-hook-quiz.tsx` (new)
- `components/marketing/sections/hair-loss-progress-timeline.tsx` (new)
- `components/marketing/sections/hair-loss-family-history-strip.tsx` (new)
- `components/marketing/sections/hair-loss-guide-section.tsx` (expand, adds Norwood visualiser)
- `components/marketing/contextual-message.tsx` (new — extracted from med-cert inline)
- `components/marketing/recent-reviews-ticker.tsx` (new — generalised)
- `components/marketing/animated-stat.tsx` (new — extracted from med-cert inline)
- `components/marketing/live-wait-time.tsx` (extend services list)
- `app/api/stripe/webhook/handlers/checkout-session-completed.ts` (subtype display map)
- `app/doctor/intakes/page.tsx` (verify queue shows subtype)
- `emails/new-intake-received.tsx` (subtype in subject)
- `lib/stripe/price-mapping.ts` (prod hard error)
- `lib/env.ts` (boot-time env validation)
- `.env.example`
- `OPERATIONS.md`
- `public/images/norwood/` (new illustrations — sourced or commissioned)

### Phase 3
- `supabase/migrations/20260410000001_followup_tracker.sql` (new)
- `scripts/cron/send-followup-emails.ts` (new)
- `vercel.json` (new cron entry)
- `emails/followup-reminder.tsx` (new parameterised template)
- `components/patient/followup-tracker-card.tsx` (new)
- `app/patient/page.tsx` (render the card)
- `app/patient/followups/[id]/page.tsx` (new)
- `app/patient/followups/[id]/followup-form.tsx` (new)
- `app/actions/followups.ts` (new)
- `app/actions/doctor/approve-intake.ts` (create followup rows on approval)
- `app/doctor/intakes/[id]/intake-detail-followups.tsx` (new)
- `app/doctor/intakes/[id]/page.tsx` (render followups card)
- `components/doctor/clinical-summary.tsx` (HoverCard rationales)
- `lib/clinical/contraindication-rationales.ts` (new)
- `ARCHITECTURE.md` (add followup tables to schema section)
- `OPERATIONS.md` (add cron job)
- `SECURITY.md` (add intake-photos bucket RLS, followup tables RLS)
- `CLAUDE.md` (increment migration count, note new tables if relevant)

---

## Follow-up design doc needed later

When the user returns with Pilot / NextClinic / competitor intake research, a second design doc will cover:

1. New ED intake question set (likely IIEF-5 + context + expanded safety)
2. New hair loss intake question set (likely Norwood + duration + family history + photo + expanded safety)
3. Drug-name strip-out inside intake option cards
4. Alopecia areata removal and related pattern options
5. Field rename migrations (`edHypertension` → `edUncontrolledHypertension`, etc.)
6. Doctor-portal IIEF-5 severity badge
7. Doctor-portal Norwood thumbnail widget
8. Clinical summary field map update to match new field names
9. Validation schema updates

This will be a tightly-scoped intake-content-only doc and should be quick to implement once the research is in hand.
