# Specialty Focus: ED + Hair Loss Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pivot InstantMed to a specialty-focused telehealth model by launching a premium ED landing page, rebuilding the hair loss landing page to match the med cert quality bar, and updating the homepage + navigation to remove general consult and surface ED + hair loss as primary services.

**Architecture:** Each specialty gets a bespoke landing page component (following the `MedCertLanding` pattern: hero with mockup → social proof → how it works → treatment/outcome section → guide → pricing → testimonials → FAQ → sticky CTAs). Homepage `serviceCategories` data and `ServicePicker` grid update to a 4-card layout (med-cert, repeat-rx, ED, hair-loss). Navbar dropdown and footer update to match. `/general-consult` gets repurposed as a "Specialty Services" hub page (no delete). Intake flow already supports ED + hair loss subtypes (`CONSULT_SUBTYPE_STEPS` in `lib/request/step-registry.ts:267`), so no step changes needed.

**Tech Stack:** Next.js 15.5 App Router · TypeScript · Tailwind v4 · Framer Motion 11 · Existing Morning Canvas components (`components/heroes`, `components/sections`, `components/marketing/sections`) · shadcn/ui · Lucide icons.

**Quality bar:** Every new/modified page must pass `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Visual verification via the preview tools for hero, mobile, and dark mode before claiming done.

---

## Context — Read This First

### What exists today

- **Med cert landing** (`components/marketing/med-cert-landing.tsx`) — the gold standard. Bespoke hero + `MedCertHeroMockup`, `SocialProofStrip`, `EmployerCalloutStrip`, `HowItWorksSection`, `CertificatePreviewSection`, `MedCertGuideSection`, `DoctorProfileSection`, `LimitationsSection`, `PricingSection`, `TestimonialsSection`, `RegulatoryPartners`, `FaqCtaSection`, `RelatedArticles`, `ExitIntentOverlay`, sticky mobile + desktop CTAs. 760 lines.
- **Hair loss page** (`app/hair-loss/page.tsx` + `hair-loss-client.tsx`) — uses generic `CenteredHero`, `FeatureGrid`, `Timeline`. Functional but lower fidelity. CTAs route to `/request?service=consult&subtype=hair_loss`.
- **Homepage** (`app/page.tsx`) — uses `ServicePicker` with 3 services from `lib/marketing/homepage.ts` `serviceCategories`: med-cert, scripts, consult (general).
- **Navbar** (`components/shared/navbar/services-dropdown.tsx`) — dropdown with 5 items: Medical Certificates, Repeat Medication, **General Consult**, Weight Loss, Hair Loss.
- **Footer** (`lib/marketing/homepage.ts` `footerLinks.services`) — 5 items including **General Consult**.
- **Pricing** (`lib/constants.ts` `PRICING`) — already updated by user: `HAIR_LOSS: 49.95`, `MENS_HEALTH: 49.95` (ED), `WEIGHT_LOSS: 89.95`.
- **Step registry** (`lib/request/step-registry.ts`) — already supports `ed` + `hair_loss` subtypes. ED has `ed-assessment` + `ed-safety` → common tail. Hair loss has `hair-loss-assessment` → common tail. **No call steps.** No changes needed to the intake flow.
- **No existing ED landing page.** ED is only reachable via `/request?service=consult&subtype=ed`. This is the gap.
- **Guide sections that already exist:** `hair-loss-guide-section.tsx` (needs enhancement), no ED equivalent.
- **Mockups that exist:** `med-cert-hero-mockup.tsx`, `consult.tsx`, `consult-chat-mockup.tsx`, `escript.tsx`, `escript-hero-mockup.tsx`, `certificate.tsx`, `certificate-showcase.tsx`. No ED or hair loss specific hero mockup.

### What we must NOT touch

- `components/request/**` (intake flow logic). Already supports the subtypes.
- `lib/request/step-registry.ts`. Already correctly configured — ED and hair loss have no call step.
- Pricing constants in `lib/constants.ts`. Already set.
- Stack-pinned deps. Read `CLAUDE.md` Stack Pin Policy section before any `package.json` touch.
- PHI encryption, middleware, auth, doctor portal, Stripe webhooks — out of scope.

### Copy tone guardrails

From user: **"Do NOT plaster 'async' across the platform — medico-legal sensitivity. Use 'no call needed', 'no appointment needed', or 'no waiting room' instead."** Apply across all ED + hair loss copy.

Doctor names: **Never use individual doctor names on marketing pages** (project rule, see `~/.claude/projects/.../memory/feedback_author.md`). Use "an AHPRA-registered Australian doctor" / "our doctors".

### Related skills

- `@superpowers:executing-plans` — how to implement this task by task
- `@superpowers:verification-before-completion` — must verify via preview_snapshot before marking done
- `@instantmed-ship` — run full quality gate before PR

---

## Pre-flight

### Task 0: Verify starting state

**Step 1: Confirm git state is clean enough to branch**

Run: `git status`
Expected: `app/locations/page.tsx` and `app/locations/sitemap.ts` modified, `app/locations/state/` and `lib/seo/data/states.ts` untracked (from prior unrelated work). No other changes.

**Step 2: Create feature branch**

Run: `git checkout -b feat/specialty-focus-ed-hair-loss`
Expected: Branch created.

**Step 3: Confirm baseline tests pass**

Run: `pnpm typecheck`
Expected: 0 errors.

Run: `pnpm lint`
Expected: 0 warnings.

Run: `pnpm test`
Expected: All tests green.

If any of the above fail, **stop** — they are pre-existing issues unrelated to this work. Flag to the user before continuing.

**Step 4: Verify pricing constants match expected values**

Read: `lib/constants.ts` lines 37–52

Assert:
- `MED_CERT: 19.95`, `MED_CERT_2DAY: 29.95`, `MED_CERT_3DAY: 39.95`
- `REPEAT_SCRIPT: 29.95`
- `HAIR_LOSS: 49.95` (user updated)
- `MENS_HEALTH: 49.95` (user updated — this is ED pricing)
- `WEIGHT_LOSS: 89.95` (user updated)
- `CONSULT: 49.95` (unchanged)

If any don't match, **stop and ask the user.** Do NOT "fix" them.

---

## Phase 1 — Data & Config Foundation

Update the shared marketing data before touching pages. Everything downstream reads from these files.

### Task 1: Update `serviceCategories` in homepage data

**Files:**
- Modify: `lib/marketing/homepage.ts`

**Step 1: Read the current shape**

Read: `lib/marketing/homepage.ts` lines 59–121

The `serviceCategories` array has 3 items: `med-cert`, `scripts`, `consult` (general).

**Step 2: Replace the `consult` entry with two new specialty entries + add icon/color metadata**

Replace the current `consult` entry (lines ~102–121) with these two entries, and add them after `scripts`:

```typescript
{
  id: "ed",
  slug: "erectile-dysfunction",
  title: "ED Treatment",
  shortTitle: "ED",
  benefitQuestion: "Need discreet ED treatment?",
  description: "Prescription ED treatment reviewed by an Australian doctor. No call, no waiting room.",
  icon: "Stethoscope",
  color: "blue",
  priceFrom: 49.95,
  href: "/erectile-dysfunction",
  popular: false,
  cta: "Start assessment",
  benefits: [
    "No call needed — doctor reviews your form",
    "Discreet packaging, sent to any pharmacy",
    "Only pay if doctor approves",
  ],
},
{
  id: "hair-loss",
  slug: "hair-loss",
  title: "Hair Loss Treatment",
  shortTitle: "Hair Loss",
  benefitQuestion: "Noticed your hairline changing?",
  description: "Doctor-led assessment for hair loss treatment. Discreet, no call required.",
  icon: "Sparkles",
  color: "violet",
  priceFrom: 49.95,
  href: "/hair-loss",
  popular: false,
  cta: "Start assessment",
  benefits: [
    "Evidence-based treatments",
    "No waiting room, no call needed",
    "eScript sent straight to your phone",
  ],
},
```

Keep `med-cert` and `scripts` entries unchanged. Remove the existing `consult` (general) entry completely.

**Step 3: Update `featuredServices` (same file, lines ~167–182)**

Add ED + Hair Loss as featured services after the existing two:

```typescript
{
  title: "ED Treatment",
  description: "Discreet doctor-led assessment for ED. Our doctors review your form and issue treatment if appropriate. No call required, no waiting room.",
  priceFrom: 49.95,
  href: "/erectile-dysfunction",
  features: ["No call needed", "Discreet packaging", "Any Australian pharmacy", "Doctor-reviewed"],
},
{
  title: "Hair Loss Treatment",
  description: "Doctor-led hair loss assessment and treatment plan. Evidence-based options, reviewed by an Australian doctor, sent straight to your phone.",
  priceFrom: 49.95,
  href: "/hair-loss",
  features: ["Oral and topical options", "Doctor-reviewed", "eScript delivered", "No call required"],
},
```

**Step 4: Update `footerLinks.services` (same file, line ~236)**

Current:
```typescript
services: [
  { label: "Medical Certificates", href: "/medical-certificate" },
  { label: "Repeat Prescriptions", href: "/prescriptions" },
  { label: "General Consult", href: "/general-consult" },
  { label: "Weight Loss", href: "/weight-loss" },
  { label: "Hair Loss", href: "/hair-loss" },
],
```

Replace with:
```typescript
services: [
  { label: "Medical Certificates", href: "/medical-certificate" },
  { label: "Repeat Prescriptions", href: "/prescriptions" },
  { label: "ED Treatment", href: "/erectile-dysfunction" },
  { label: "Hair Loss Treatment", href: "/hair-loss" },
  { label: "Weight Loss", href: "/weight-loss" },
],
```

(General Consult removed; ED added in the 3rd position; hair loss moves up.)

**Step 5: Update `faqItems` entry that mentions services**

Find the FAQ item: `"What services does InstantMed offer?"` (around line 206–207).

Replace the answer with:
```
"Medical certificates for sick leave, carer's leave, and uni extensions. Repeat prescriptions for your regular medication. Discreet doctor-reviewed treatment for ED and hair loss — no call required. All requests reviewed by an AHPRA-registered Australian doctor."
```

**Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors. If there are errors about `color: "violet"` not matching the ServicePicker config union, that's expected and fixed in Task 2.

**Step 7: Commit**

```bash
git add lib/marketing/homepage.ts
git commit -m "feat(marketing): replace general consult with ED + hair loss in service data"
```

---

### Task 2: Extend `ServicePicker` color config and handle 4-card layout

**Files:**
- Modify: `components/marketing/service-picker.tsx`
- Modify: `components/marketing/homepage.ts` (only if additional icon imports needed; probably yes)

**Step 1: Read current colorConfig**

Read: `components/marketing/service-picker.tsx` lines 28–52

Currently has `emerald`, `cyan`, `blue`. We introduced `violet` for hair loss in Task 1. Need to add it.

**Step 2: Add `violet` entry to `colorConfig`**

Inside the `colorConfig` object add:

```typescript
violet: {
  gradient: 'from-violet-400 to-purple-500',
  accent: '#8B5CF6',
  light: 'rgba(139, 92, 246, 0.08)',
  chipColor: 'primary',
},
```

And verify `blue` already exists (it does — used by ED). Keep `emerald` for med-cert and `cyan` for repeat rx.

**Step 3: Extend `iconMap` to include Sparkles for hair loss**

Read: lines 22–26

Current:
```typescript
const iconMap = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
}
```

The hair loss entry in `homepage.ts` uses `icon: "Sparkles"`. Add a Sparkles mapping. Since there is no premium `SparklesPremium` in the codebase, import `Sparkles` from `lucide-react` at the top and map to it:

```typescript
import { ArrowRight, Check, ShieldCheck, Stethoscope, Clock, AlertCircle, Sparkles } from 'lucide-react'
// ...
const iconMap = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
  Sparkles: Sparkles,
}
```

**Step 4: Update grid column classes for 4-card layout**

Find line 130:
```typescript
className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

Change to:
```typescript
className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
```

**Step 5: Update `mockupMap` to provide a mockup for ED and hair loss**

Read line 16–20:
```typescript
const mockupMap: Record<string, React.ComponentType> = {
  'med-cert': CertificateMockup,
  'scripts': EScriptMockup,
  'consult': ConsultMockup,
}
```

For now, reuse existing mockups as placeholders (we build dedicated mockups in Phase 2):

```typescript
const mockupMap: Record<string, React.ComponentType> = {
  'med-cert': CertificateMockup,
  'scripts': EScriptMockup,
  'ed': ConsultMockup,        // TODO: replaced with EDMockup in Task 5
  'hair-loss': ConsultMockup, // TODO: replaced with HairLossMockup in Task 12
}
```

Delete the `'consult'` key since that service is gone from homepage.

**Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 7: Commit**

```bash
git add components/marketing/service-picker.tsx
git commit -m "feat(marketing): 4-card ServicePicker grid with violet + Sparkles support"
```

---

### Task 3: Update Services dropdown nav

**Files:**
- Modify: `components/shared/navbar/services-dropdown.tsx`

**Step 1: Read current state**

Read: `components/shared/navbar/services-dropdown.tsx` lines 21–27

Current dropdown items: Medical Certificates, Repeat Medication, General Consult, Weight Loss, Hair Loss.

**Step 2: Replace the `services` array**

Replace lines 21–27 with:

```typescript
export const services: Array<{ serviceId: ServiceId; title: string; href: string; description: string; icon: typeof FileText }> = [
  { serviceId: "med-cert", title: "Medical Certificates", href: "/medical-certificate", description: "Work, uni & carer's leave", icon: FileText },
  { serviceId: "scripts", title: "Repeat Medication", href: "/repeat-prescriptions", description: "Medications you already take", icon: Pill },
  { serviceId: "consult", title: "ED Treatment", href: "/erectile-dysfunction", description: "Discreet, no call needed", icon: HeartPulse },
  { serviceId: "consult", title: "Hair Loss Treatment", href: "/hair-loss", description: "Doctor-reviewed treatment plan", icon: Sparkles },
]
```

Note: I fixed a small existing bug — the current `href` for med cert is `/medical-certificates` (plural) but the actual page is `/medical-certificate` (singular). **Verify** by running `pnpm dev` and visiting `/medical-certificates` — if it's a valid alias, leave as-is. If it 404s, keep my fix.

Remove general consult. Remove weight loss (not launched yet per the pivot — it's listed in `footerLinks` as "coming soon" positioning but doesn't need a dropdown entry yet).

**Step 3: Update icon imports**

Read line 4–11 — current imports: `FileText, Pill, Stethoscope, ChevronDown, Scale, Sparkles`.

Replace with:
```typescript
import {
  FileText,
  Pill,
  ChevronDown,
  HeartPulse,
  Sparkles,
} from "lucide-react"
```

(Removes `Stethoscope` and `Scale` since they're no longer used. Adds `HeartPulse` for ED.)

**Step 4: Update the `isActivePath` check**

Read line 42:
```typescript
isActivePath("/medical-certificate") || isActivePath("/prescriptions") || isActivePath("/consult")
```

Replace with:
```typescript
isActivePath("/medical-certificate") || isActivePath("/prescriptions") || isActivePath("/repeat-prescriptions") || isActivePath("/erectile-dysfunction") || isActivePath("/hair-loss")
```

**Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 6: Visual check of dropdown**

Start dev server via preview tools, navigate to homepage, hover "Services" in nav.

Expected: 4 items — Med Certs, Repeat Medication, ED Treatment, Hair Loss Treatment. ED uses `HeartPulse` icon, hair loss uses `Sparkles`.

**Step 7: Commit**

```bash
git add components/shared/navbar/services-dropdown.tsx
git commit -m "feat(nav): services dropdown prioritises ED + hair loss specialties"
```

---

### Task 4: Update mobile nav menu

**Files:**
- Modify: `components/shared/navbar/mobile-menu-content.tsx`

**Step 1: Read the file**

Read: `components/shared/navbar/mobile-menu-content.tsx` (all)

Find where the mobile menu lists services. It likely pulls from the same `services` array exported by `services-dropdown.tsx` — if so, no change needed (already fixed in Task 3). If it has its own hardcoded list, update it to match the 4 items.

**Step 2: If updates needed, apply them**

Same logic as Task 3: remove General Consult and Weight Loss, add ED Treatment in position 3, Hair Loss in position 4.

**Step 3: Typecheck + visual check**

Run: `pnpm typecheck`
Start preview, resize to mobile width (`preview_resize` to 375px), open mobile menu, verify services list shows the 4 new items.

**Step 4: Commit (if changes made)**

```bash
git add components/shared/navbar/mobile-menu-content.tsx
git commit -m "feat(nav): mobile menu services list matches specialty pivot"
```

---

## Phase 2 — ED Landing Page (NEW)

Build the ED landing from scratch using `MedCertLanding` as the structural template. This is the biggest task block in the plan.

### Task 5: Create the `EDHeroMockup` component

**Files:**
- Create: `components/marketing/mockups/ed-hero-mockup.tsx`

**Step 1: Read the reference mockup**

Read: `components/marketing/mockups/med-cert-hero-mockup.tsx`

Understand the structure (phone-frame or document card with subtle motion, compact variant support).

**Step 2: Create the ED mockup**

Visual concept: A minimalist "digital script / consultation card" showing:
- Pill-capsule illustration or prescription envelope
- "Doctor-reviewed" badge
- Treatment plan copy snippet (e.g. "Assessment reviewed. Treatment approved.")
- Optional subtle checkmark animation on mount

Keep it on-brand with Morning Canvas tokens (neutral card, soft shadows `shadow-primary/[0.06]`, no lurid colours).

Implementation scaffold:

```tsx
"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Pill, ShieldCheck } from "lucide-react"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface EDHeroMockupProps {
  compact?: boolean
}

export function EDHeroMockup({ compact = false }: EDHeroMockupProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto",
        compact ? "max-w-xs" : "max-w-sm lg:max-w-md"
      )}
      aria-hidden="true"
    >
      {/* Main card */}
      <motion.div
        className="relative rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-xl shadow-primary/[0.08] overflow-hidden"
        initial={animate ? { opacity: 0, y: 18 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Pill className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">InstantMed</p>
                <p className="text-sm font-semibold">Treatment plan</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reviewed by</p>
            <p className="text-sm font-medium">An AHPRA-registered Australian doctor</p>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">Next step</p>
            <p className="text-sm font-medium">eScript sent to your phone</p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Discreet packaging · No call needed</span>
          </div>
        </div>
      </motion.div>

      {/* Floating badge */}
      <motion.div
        className="absolute -bottom-3 -right-3 rounded-full bg-white dark:bg-card shadow-lg shadow-primary/[0.15] border border-border/50 px-3 py-1.5 text-[11px] font-semibold text-primary"
        initial={animate ? { opacity: 0, scale: 0.8 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        Doctor-reviewed
      </motion.div>
    </div>
  )
}
```

**Step 3: Wire into ServicePicker mockup map**

Modify: `components/marketing/service-picker.tsx`

Replace the temp `'ed': ConsultMockup` line with:
```typescript
import { EDHeroMockup } from '@/components/marketing/mockups/ed-hero-mockup'
// ...
'ed': EDHeroMockup,
```

**Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 5: Commit**

```bash
git add components/marketing/mockups/ed-hero-mockup.tsx components/marketing/service-picker.tsx
git commit -m "feat(marketing): ED hero mockup component"
```

---

### Task 6: Create the `ed-guide-section.tsx` long-form content section

**Files:**
- Create: `components/marketing/sections/ed-guide-section.tsx`

**Step 1: Read a reference guide section**

Read: `components/marketing/sections/hair-loss-guide-section.tsx`

Understand: E-E-A-T long-form content block. Headings, medical information, treatment explanation, safety notes. Purely static content for SEO depth.

**Step 2: Draft the ED guide content**

Content themes (all should be accurate, doctor-approved tone, non-promotional):
1. **What is ED?** — prevalence, causes (vascular, hormonal, psychological), when to seek help
2. **How our assessment works** — form-based intake, safety screening, doctor review, no call required unless the doctor needs clarification
3. **Treatment options** — generic descriptions of PDE5 inhibitors (sildenafil, tadalafil) WITHOUT drug-brand glorification. Focus on mechanism + who it's suitable for
4. **Safety & contraindications** — nitrates warning, cardiac conditions, when not suitable, honest discussion of risks
5. **What to expect** — eScript flow, pharmacy pickup, discreet packaging
6. **When we'll recommend seeing your GP in person** — builds trust by explicitly stating limits

Write the component. Use the same structural pattern as `hair-loss-guide-section.tsx` — Morning Canvas section header, max-w-3xl prose block, gentle fade-in motion, anchor links.

**Reference copy** (condensed, expand each into 150–250 words):

```
## Understanding erectile dysfunction
ED affects roughly 1 in 5 Australian men over 40 and becomes more common with age.
Common causes include reduced blood flow (the most common vascular cause), diabetes,
high blood pressure, certain medications, hormonal changes, and psychological factors
like stress, anxiety, or depression. ED can also be an early indicator of cardiovascular
issues — which is why doctor review matters even when treatment seems straightforward.

## How our assessment works
Fill out a structured health questionnaire covering your symptoms, medical history,
current medications, and relevant lifestyle factors. An AHPRA-registered Australian
doctor reviews your submission, typically within 1–2 hours during operating hours.
If the doctor determines treatment is safe and appropriate, an eScript is sent straight
to your phone. No video call, no waiting room — just a thorough online assessment
reviewed by a real doctor.

## Treatment options we can assess
PDE5 inhibitors (the medication class that includes sildenafil and tadalafil) are
the most commonly prescribed first-line treatment for ED. They work by improving
blood flow to the penis in response to sexual stimulation. They do not cause erections
on their own and are not an aphrodisiac. Sildenafil has a shorter duration of action
(4–6 hours) while tadalafil can last up to 36 hours. Your doctor will recommend the
right option based on your assessment.

## Who should not take these medications
These treatments are NOT suitable if you take nitrates for chest pain, have severe
cardiovascular disease, have had a recent heart attack or stroke, or have significant
liver or kidney disease. Our safety screening step flags these conditions before
you submit, and the doctor performs a final clinical review. If treatment is not
appropriate, we issue a full refund and recommend next steps — often a visit to your
GP.

## What happens after approval
You'll receive your eScript via SMS. Take it to any Australian pharmacy to collect
your medication. All medications are dispensed in standard pharmacy packaging — there
is nothing on the outside to indicate what's inside. Your bank statement shows
"InstantMed" only.

## When you should see a GP in person
ED can be a symptom of underlying conditions that warrant an in-person physical
examination — new chest pain, significant weight loss, symptoms of depression,
or symptoms that started suddenly alongside other neurological changes. If our
doctor identifies any of these signals, we'll tell you directly rather than prescribing.
```

The component wraps each `##` heading in an `<h2>` with anchor link and a short paragraph block. Use `prose` styles or manual styling matching `hair-loss-guide-section.tsx`.

**Step 3: Export the component**

```tsx
export function EDGuideSection() { /* ... */ }
```

**Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 5: Commit**

```bash
git add components/marketing/sections/ed-guide-section.tsx
git commit -m "feat(marketing): ED long-form guide section for SEO depth"
```

---

### Task 7: Create `EDLimitationsSection` (honest bounds)

**Files:**
- Create: `components/marketing/sections/ed-limitations-section.tsx`

**Step 1: Read existing `limitations-section.tsx`**

Read: `components/marketing/sections/limitations-section.tsx`

It's a general-purpose "what we can and can't do" strip for med-cert. We need an ED-specific version.

**Step 2: Build the ED limitations list**

The section pre-qualifies patients before pricing to reduce bad-fit conversions. Two columns: "What we can help with" vs "When to see a doctor in person".

**Can help with:**
- First-time or ongoing ED concerns with no red-flag symptoms
- Repeat PDE5 inhibitor prescriptions you've had before
- Treatment plan review for established patients

**When to see a GP in person:**
- New chest pain, fainting, or cardiovascular symptoms
- You take nitrate medications for chest pain
- ED that began suddenly alongside neurological symptoms
- Severe liver or kidney disease
- Under 18

Build the component with the same visual pattern as `limitations-section.tsx` — two-column card, clear iconography (CheckCircle2 for "can help", AlertCircle for "see a GP"), muted tones.

**Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 4: Commit**

```bash
git add components/marketing/sections/ed-limitations-section.tsx
git commit -m "feat(marketing): ED limitations section — pre-qualify before pricing"
```

---

### Task 8: Create the `ErectileDysfunctionLanding` client component

**Files:**
- Create: `components/marketing/erectile-dysfunction-landing.tsx`

**Step 1: Read the template**

Read: `components/marketing/med-cert-landing.tsx` (all 760 lines).

Study the structure:
1. Module-level data constants (`ROTATING_BADGES`, `PRICING_FEATURES`, `SOCIAL_PROOF_STATS`, `RECENT_ACTIVITY_ENTRIES`, `RELATED_ARTICLES`)
2. Small components: `RecentActivityTicker`, `ContextualMessage`, `AnimatedStat`, `SocialProofStrip`, `EmployerCalloutStrip`, `HeroSection`, `RelatedArticles`
3. `MedCertLanding` main export — composes everything with sticky CTAs, exit intent, service-availability disabled state, analytics hooks
4. Dynamic imports for below-fold sections

**Step 2: Create `erectile-dysfunction-landing.tsx`** mirroring the structure with ED-specific content.

Replace copy throughout:
- Hero headline: `Discreet ED treatment, reviewed by a real Australian doctor.`
- Subheadline: `Fill a short health form. A doctor reviews it and — if appropriate — sends treatment straight to your phone. No call, no waiting room.`
- Primary CTA: `Start assessment — $49.95` linking to `/request?service=consult&subtype=ed`
- `ROTATING_BADGES`: `["No call needed", "Discreet packaging", "Doctor-reviewed", "Full refund if we can't help"]`
- `SOCIAL_PROOF_STATS`: reuse `SOCIAL_PROOF` values but swap labels to be ED-relevant — review turnaround, patient rating, pharmacy dispensing rate, full refund guarantee. Use existing `SOCIAL_PROOF` constants — do NOT fabricate stats.
- Replace `MedCertHeroMockup` → `EDHeroMockup`
- Remove `EmployerCalloutStrip` (irrelevant — no employer context)
- Replace `RecentActivityTicker` entries with generic ED-safe entries (no names if it feels off; can use a city-only variant: `"A patient in Melbourne received their treatment plan 23 min ago"`)
- Replace `MedCertGuideSection` → `EDGuideSection`
- Replace `CertificatePreviewSection` → **omit** (no certificate preview for ED; this section is med-cert specific)
- Replace `LimitationsSection` → `EDLimitationsSection` (Task 7)
- Replace `PRICING_FEATURES`:
  ```typescript
  const PRICING_FEATURES = [
    "AHPRA-registered Australian doctor reviews your form",
    "eScript sent to your phone via SMS",
    "Collect from any Australian pharmacy",
    "Discreet packaging — nothing on the outside",
    "Full refund if we can't help",
  ]
  ```
- Replace `RELATED_ARTICLES` with ED-relevant internal links (set to placeholder blog slugs — we can leave them commented out if the blog posts don't exist yet, or point to general health blog; confirm during review):
  ```typescript
  const RELATED_ARTICLES = [
    { title: "Is ED common in Australia?", href: "/blog/ed-prevalence-australia" },
    { title: "How PDE5 inhibitors work", href: "/blog/how-pde5-inhibitors-work" },
    { title: "Talking to a doctor about ED", href: "/blog/talking-to-doctor-about-ed" },
  ]
  ```
  If these slugs do not exist, leave the array empty and hide the `RelatedArticles` section — don't create broken links.
- CTA links: all point to `/request?service=consult&subtype=ed`
- Analytics hook: `useLandingAnalytics("ed")` — verify that the hook accepts arbitrary service keys. Read `hooks/use-landing-analytics.ts` first. If it's typed to a union, extend the union to include `"ed"` and `"hair-loss"`.
- Service availability check: `useServiceAvailability().isServiceDisabled("ed")` — verify the provider supports this id. Read `components/providers/service-availability-provider.tsx`. If the id union does not include `"ed"`, extend it. Do NOT break other services.
- Pricing colors: use `blue` theme to match ServicePicker
  ```typescript
  const pricingColors = {
    light: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    button: "bg-primary hover:bg-primary/90",
  }
  ```
- `PricingSection` props:
  ```tsx
  <PricingSection
    title="One flat fee. No hidden costs."
    subtitle="You only pay if the doctor approves treatment."
    price={PRICING.MENS_HEALTH}
    features={PRICING_FEATURES}
    ctaText={`Start assessment — $${PRICING.MENS_HEALTH.toFixed(2)}`}
    ctaHref="/request?service=consult&subtype=ed"
    colors={pricingColors}
  />
  ```
  Do NOT use `originalPrice` / `showComparisonTable` — not relevant here.

**Step 3: Drop the employer strip call + remove med-cert-only sections**

Sections you KEEP:
- Hero
- LiveWaitTime strip
- RecentActivityTicker (with ED-safe copy)
- SocialProofStrip
- HowItWorksSection (generic enough)
- EDGuideSection
- DoctorProfileSection
- EDLimitationsSection
- PricingSection
- TestimonialsSection
- RegulatoryPartners
- FaqCtaSection
- RelatedArticles (if any)
- FinalCtaSection
- ContentHubLinks
- ExitIntentOverlay
- Sticky mobile + desktop CTAs

Sections you REMOVE:
- EmployerCalloutStrip (employer-only)
- CertificatePreviewSection (med-cert-only)

**Step 4: Testimonials**

Use `getTestimonialsByService("consultation")` with a filter for ED-relevant content if possible, falling back to `getTestimonialsForColumns()`. Read `lib/data/testimonials.ts` first to confirm the keys.

If there are no ED-specific testimonials, use the generic consultation testimonials — same pattern the hair loss page uses today.

**Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 6: Commit**

```bash
git add components/marketing/erectile-dysfunction-landing.tsx hooks/use-landing-analytics.ts components/providers/service-availability-provider.tsx
git commit -m "feat(marketing): ErectileDysfunctionLanding component"
```

---

### Task 9: Create the ED page route

**Files:**
- Create: `app/erectile-dysfunction/page.tsx`
- Create: `lib/data/ed-faq.ts` (structured FAQ list for schema + page)

**Step 1: Create the ED FAQ data file**

Create `lib/data/ed-faq.ts`:

```typescript
export const ED_FAQ = [
  {
    question: "Do I need a video consultation?",
    answer: "No. Fill out our structured health form, and an AHPRA-registered Australian doctor reviews your submission. If further clarification is needed, the doctor may contact you by message, but most patients are reviewed without a call.",
  },
  {
    question: "How fast will I hear back?",
    answer: "Most assessments are reviewed within 1–2 hours during operating hours (8am–10pm AEST, 7 days). You'll receive email updates as your request progresses.",
  },
  {
    question: "Is this service discreet?",
    answer: "Yes. Medications are dispensed in standard pharmacy packaging with no indication of contents. Your bank statement shows 'InstantMed' only. The pharmacy receives only the prescription — no consultation details.",
  },
  {
    question: "What if the doctor declines my request?",
    answer: "Full refund, no questions. If we decline, the doctor will explain why and recommend next steps — which sometimes means seeing your regular GP in person.",
  },
  {
    question: "Which treatments can I be prescribed?",
    answer: "Our doctors can assess you for PDE5 inhibitors (the medication class that includes sildenafil and tadalafil) based on your individual health profile. The specific treatment and dose is determined by the doctor after reviewing your assessment.",
  },
  {
    question: "Is it safe to take ED medication with my current medications?",
    answer: "Our safety screening step checks for common contraindications including nitrates, alpha-blockers, and certain cardiac medications. The doctor performs a final review of your full medication list before approving any treatment.",
  },
  {
    question: "Can I get this treatment without a Medicare card?",
    answer: "Yes. Medicare is optional for our ED service. You'll still need to provide ID details so the doctor can verify your identity.",
  },
  {
    question: "How much does it cost?",
    answer: "Our flat fee is $49.95 for the doctor consultation and eScript. Medication cost is separate and paid at the pharmacy. There are no subscriptions or ongoing fees.",
  },
] as const
```

**Step 2: Create the ED page route**

Create `app/erectile-dysfunction/page.tsx`:

```tsx
export const revalidate = 86400

import type { Metadata } from "next"
import { ErectileDysfunctionLanding } from "@/components/marketing/erectile-dysfunction-landing"
import {
  SpeakableSchema,
  FAQSchema,
  BreadcrumbSchema,
  MedicalServiceSchema,
  ReviewAggregateSchema,
} from "@/components/seo/healthcare-schema"
import { ED_FAQ } from "@/lib/data/ed-faq"
import { PRICING } from "@/lib/constants"

export const metadata: Metadata = {
  title: "ED Treatment Online Australia | Doctor-Reviewed | InstantMed",
  description: `Discreet ED treatment from an AHPRA-registered Australian doctor. No call needed. Reviewed within 1–2 hours. From $${PRICING.MENS_HEALTH.toFixed(2)}.`,
  keywords: [
    "ed treatment online australia",
    "erectile dysfunction treatment online",
    "ed medication online",
    "online doctor ed",
    "telehealth ed australia",
    "discreet ed treatment",
  ],
  openGraph: {
    title: "ED Treatment Online Australia | InstantMed",
    description: "Doctor-reviewed ED treatment, no call needed. From an AHPRA-registered Australian doctor.",
    url: "https://instantmed.com.au/erectile-dysfunction",
    type: "website",
    locale: "en_AU",
    siteName: "InstantMed",
  },
  twitter: {
    card: "summary_large_image",
    title: "ED Treatment Online Australia | InstantMed",
    description: "Doctor-reviewed ED treatment, no call needed.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/erectile-dysfunction",
  },
}

export default function Page() {
  return (
    <>
      <SpeakableSchema
        name="ED Treatment Online Australia"
        description={`Discreet, doctor-reviewed ED treatment from an AHPRA-registered Australian doctor. From $${PRICING.MENS_HEALTH.toFixed(2)}. No call needed.`}
        url="/erectile-dysfunction"
      />
      <FAQSchema faqs={[...ED_FAQ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "ED Treatment", url: "https://instantmed.com.au/erectile-dysfunction" },
        ]}
      />
      <MedicalServiceSchema
        name="Online ED Treatment"
        description="Discreet erectile dysfunction assessment and treatment from an AHPRA-registered Australian doctor. No call needed."
        price={PRICING.MENS_HEALTH.toFixed(2)}
      />
      <ReviewAggregateSchema ratingValue={4.8} reviewCount={49} />
      <ErectileDysfunctionLanding />
    </>
  )
}
```

**Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 4: Lint**

Run: `pnpm lint`
Expected: 0 warnings.

**Step 5: Preview — visual verification**

Start dev server via `preview_start` if not running. Navigate to `/erectile-dysfunction`.

Run preview checks:
1. `preview_snapshot` — confirm all sections render (hero, stats, how it works, guide, limitations, pricing, testimonials, partners, FAQ, final CTA)
2. `preview_console_logs` — confirm no React errors, no hydration warnings
3. `preview_network` — confirm no failed asset requests
4. `preview_resize` to 375px — confirm mobile layout; sticky mobile CTA appears after hero scrolls out
5. `preview_resize` back to 1280px — confirm desktop layout
6. `preview_eval` with `document.documentElement.classList.add('dark')` — confirm dark mode renders correctly
7. Revert dark mode

If any section renders broken or missing, diagnose and fix before committing.

**Step 6: Commit**

```bash
git add app/erectile-dysfunction/page.tsx lib/data/ed-faq.ts
git commit -m "feat(marketing): /erectile-dysfunction landing page"
```

---

### Task 10: Add `/ed` short URL redirect

**Files:**
- Create: `app/ed/page.tsx`

**Step 1: Create a simple redirect page**

```tsx
import { redirect } from "next/navigation"

export default function EDRedirect() {
  redirect("/erectile-dysfunction")
}
```

Alternative: use a `redirects` entry in `next.config.mjs` (permanent 301). Prefer the config-level redirect for SEO correctness.

**Step 2: Check existing redirects config**

Read: `next.config.mjs`

Find any existing `async redirects()` block. If present, add an entry:
```js
{
  source: '/ed',
  destination: '/erectile-dysfunction',
  permanent: true,
},
```

If there's already an `app/ed/` directory (check), do not clash — prefer the config-level redirect and remove any conflicting `app/ed` route.

**Step 3: Typecheck + build**

Run: `pnpm typecheck`
Expected: 0 errors.

Run: `pnpm build` (needed to verify the redirect config is valid)
Expected: Build succeeds. `/ed` → `/erectile-dysfunction` appears in the build output.

**Step 4: Commit**

```bash
git add next.config.mjs app/ed/page.tsx
git commit -m "feat(seo): permanent redirect /ed → /erectile-dysfunction"
```

---

### Task 11: Add ED to sitemap

**Files:**
- Modify: `app/sitemap.ts` (or wherever the sitemap is generated)

**Step 1: Find the sitemap generator**

Run: Grep for `erectile` and `medical-certificate` in `app/sitemap.ts` and any `app/**/sitemap.ts` files.

**Step 2: Add ED route**

Add an entry for `/erectile-dysfunction` with priority similar to `/medical-certificate`. Do NOT add `/ed` (redirect shouldn't be in the sitemap).

**Step 3: Build to verify sitemap output**

Run: `pnpm build`
Expected: Build succeeds. Sitemap includes `/erectile-dysfunction`.

**Step 4: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): add /erectile-dysfunction to sitemap"
```

---

## Phase 3 — Hair Loss Landing Rebuild

Rebuild the hair loss page to match the med cert quality bar. Reuse the section components we built for ED where appropriate.

### Task 12: Create `HairLossHeroMockup` component

**Files:**
- Create: `components/marketing/mockups/hair-loss-hero-mockup.tsx`

Same pattern as Task 5 but themed for hair loss.

**Content:**
- Mockup shows a doctor-reviewed treatment plan card for hair loss
- "Treatment plan approved" badge
- Sub-label: "Oral + topical option" or "Topical treatment plan"
- Discretion signal: "Shipped discreetly"
- Use violet accent tokens (`text-violet-600`, `bg-violet-500/10`) to differentiate from ED's blue

**Step 1–3: Build, wire into ServicePicker mockupMap, typecheck**

Same steps as Task 5, substituting hair loss theming.

**Step 4: Commit**

```bash
git add components/marketing/mockups/hair-loss-hero-mockup.tsx components/marketing/service-picker.tsx
git commit -m "feat(marketing): hair loss hero mockup component"
```

---

### Task 13: Enhance `hair-loss-guide-section.tsx`

**Files:**
- Modify: `components/marketing/sections/hair-loss-guide-section.tsx`

**Step 1: Read current state**

Read: `components/marketing/sections/hair-loss-guide-section.tsx` (all).

**Step 2: Add missing sections**

The current guide is likely missing the "when to see a GP in person" and "realistic expectations" sections that give the page E-E-A-T depth. Add:
1. **Causes** — male-pattern (androgenetic), telogen effluvium, alopecia areata, nutritional factors
2. **Evidence behind the treatments** — TGA approval, mechanism of action (without drug brand names)
3. **Realistic results timeline** — 3–6 months for initial improvement, 12 months for full effect
4. **Who shouldn't use oral treatments** — women who are or may become pregnant, men with liver disease
5. **What our doctor looks for in the assessment** — pattern, duration, medications, family history
6. **Continuing treatment** — repeat Rx flow for ongoing supply (cross-link to `/repeat-prescriptions`)

Keep the existing tone and structure. Extend, don't rewrite.

**Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 4: Commit**

```bash
git add components/marketing/sections/hair-loss-guide-section.tsx
git commit -m "feat(marketing): expand hair loss guide with evidence + safety + continuation"
```

---

### Task 14: Create `HairLossLimitationsSection`

**Files:**
- Create: `components/marketing/sections/hair-loss-limitations-section.tsx`

Same pattern as Task 7 (ED limitations), themed for hair loss.

**Can help with:**
- Androgenetic alopecia (male-pattern hair loss)
- Repeat treatment prescriptions for hair loss
- First-time assessment for men experiencing thinning or recession

**When to see a GP in person:**
- Sudden or patchy hair loss
- Hair loss with scalp pain, redness, or scaling
- Female-pattern hair loss with other symptoms (possible hormonal investigation needed)
- Hair loss in children or adolescents

**Step 1–3: Build, typecheck, commit**

```bash
git add components/marketing/sections/hair-loss-limitations-section.tsx
git commit -m "feat(marketing): hair loss limitations section"
```

---

### Task 15: Create `HairLossLanding` client component

**Files:**
- Create: `components/marketing/hair-loss-landing.tsx`

**Step 1: Use Task 8 (`ErectileDysfunctionLanding`) as the template**

Read: `components/marketing/erectile-dysfunction-landing.tsx`

**Step 2: Copy and adapt**

- Replace all ED copy with hair loss copy (headline, subheadline, rotating badges, CTA text)
- `<EDHeroMockup />` → `<HairLossHeroMockup />`
- `<EDGuideSection />` → `<HairLossGuideSection />`
- `<EDLimitationsSection />` → `<HairLossLimitationsSection />`
- CTA href: `/request?service=consult&subtype=hair_loss`
- `PRICING.MENS_HEALTH` → `PRICING.HAIR_LOSS`
- Pricing theme: `violet` (match ServicePicker)
- Keep the "Treatment Options" section from the current hair-loss-client.tsx — the oral/topical/combination cards. It's the most valuable part of the existing page and lives between "How It Works" and the guide section. Port it into the new `HairLossLanding` as a dedicated component or inline function.
- Testimonials: `getTestimonialsByService("consultation")` filtered for hair-loss-adjacent content
- Analytics hook: `useLandingAnalytics("hair-loss")`
- Service availability id: `"hair-loss"` (ensure provider supports it; reuse the extension from Task 8)

**Copy guidelines:**
- Headline: `Hair loss treatment, reviewed by a real Australian doctor.`
- Subheadline: `Doctor-led assessment for hair loss treatment. Discreet, evidence-based, and no call required.`
- CTA: `Start assessment — $49.95`
- Rotating badges: `["No call needed", "Discreet packaging", "Evidence-based treatments", "Full refund if we can't help"]`

**Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 4: Commit**

```bash
git add components/marketing/hair-loss-landing.tsx
git commit -m "feat(marketing): HairLossLanding component mirroring med cert quality"
```

---

### Task 16: Wire `HairLossLanding` into `/hair-loss` route

**Files:**
- Modify: `app/hair-loss/page.tsx`
- Delete: `app/hair-loss/hair-loss-client.tsx` (only after confirming HairLossLanding is feature-complete)

**Step 1: Read current page**

Read: `app/hair-loss/page.tsx`

**Step 2: Replace the render target**

Swap `<HairLossClient ... />` for `<HairLossLanding />`. Update imports accordingly.

Update metadata:
- `title`: `"Hair Loss Treatment Online Australia | Doctor-Reviewed | InstantMed"`
- `description`: `` `Doctor-led hair loss assessment from an AHPRA-registered Australian doctor. Discreet, no call needed. From $${PRICING.HAIR_LOSS.toFixed(2)}.` ``
- Keep `canonical: "https://instantmed.com.au/hair-loss"`
- Keep the existing schemas (`BreadcrumbSchema`, `MedicalServiceSchema`) and update `price={PRICING.HAIR_LOSS.toFixed(2)}`
- Add `ReviewAggregateSchema` and `SpeakableSchema` for parity with ED/med cert pages

**Step 3: Delete `hair-loss-client.tsx`**

ONLY after the new `HairLossLanding` is complete and the page visually matches or exceeds the old version. Before deleting, grep the codebase for any other imports of `HairLossClient`:

Run: Grep for `HairLossClient` across the repo.

If any other file imports it, update them to use the new component or remove the references. Then delete the old file.

**Step 4: Typecheck + build**

Run: `pnpm typecheck`
Expected: 0 errors.

Run: `pnpm build`
Expected: Build succeeds.

**Step 5: Preview — visual verification**

Navigate to `/hair-loss`. Run preview checks identical to Task 9 Step 5.

Confirm the Treatment Options section still exists and looks good.

**Step 6: Commit**

```bash
git add app/hair-loss/page.tsx
git rm app/hair-loss/hair-loss-client.tsx
git commit -m "feat(marketing): /hair-loss uses HairLossLanding (rebuild to med cert quality bar)"
```

---

## Phase 4 — Homepage Polish

Now that the data foundation and the two specialty pages exist, polish the homepage presentation.

### Task 17: Verify homepage `ServicePicker` renders 4 cards correctly

**Files:**
- Visual check only (no code changes unless bugs found)

**Step 1: Preview homepage**

Navigate to `/`. Run `preview_snapshot`.

**Step 2: Verify**

- ServicePicker shows exactly 4 cards: Medical Certificates, Repeat Medication, ED Treatment, Hair Loss Treatment
- Each card has the correct price, mockup, benefits list, CTA
- The grid is 2x2 on mobile, 4-col on desktop
- Hover states work (shadow lift, card translate)
- Clicking ED card navigates to `/erectile-dysfunction`
- Clicking Hair Loss card navigates to `/hair-loss`
- No hydration warnings in `preview_console_logs`

**Step 3: If layout is cramped at `lg` breakpoint**

The 4-col layout may feel tight. If so, adjust to `sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4` (stay 2-col until xl). Update `components/marketing/service-picker.tsx` line 130.

**Step 4: Commit (if fix made)**

```bash
git add components/marketing/service-picker.tsx
git commit -m "fix(marketing): ServicePicker breakpoint to prevent cramped 4-col at lg"
```

---

### Task 18: Update homepage hero subcopy to reference specialties

**Files:**
- Modify: `app/page.tsx`

**Step 1: Read current hero copy**

Read: `app/page.tsx` lines 135–140

Current:
```
Medical certificates in under 30 minutes, 24/7. Prescriptions and consultations reviewed by real Australian doctors. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest.
```

**Step 2: Update copy to match the new positioning**

Replace with:
```
Medical certificates in under 30 minutes, 24/7. Repeat medication and discreet treatment for ED and hair loss — reviewed by AHPRA-registered Australian doctors. No appointments, no waiting rooms, no video calls.
```

**Step 3: Update `metadata.description` (lines 35–36)**

Replace:
```
'Medical certificates from $19.95 — issued in under 30 minutes, 24/7. Repeat medication from $29.95. AHPRA-registered Australian doctors, 100% online.'
```

With:
```
'Medical certificates from $19.95 in under 30 minutes. Repeat medication from $29.95. Discreet ED and hair loss treatment from $49.95. AHPRA-registered Australian doctors, 100% online.'
```

Also update the `keywords` array to add `"ed treatment online"` and `"hair loss treatment online"`. Remove `"sick certificate"` only if the array is approaching length limits — otherwise keep it.

Update the `openGraph.description` and `twitter.description` to match the new positioning (two-sentence versions).

**Step 4: Update `SpeakableSchema` description (around line 113)**

Change to:
```
"Get medical certificates in under 30 minutes, 24/7. Repeat medication and discreet treatment for ED and hair loss from AHPRA-registered Australian doctors. From $19.95."
```

**Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 6: Preview homepage**

Reload `/`. Confirm hero subcopy renders correctly. `preview_snapshot` to verify.

**Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat(marketing): homepage hero + metadata reflect specialty focus"
```

---

## Phase 5 — Repurpose /general-consult as Specialty Hub

User requirement: do NOT delete or redirect. Repurpose as a "Specialty Services" hub introducing the new model.

### Task 19: Audit `/general-consult` current state

**Files:**
- Read: `app/general-consult/page.tsx` (and any sibling client file)

**Step 1: Understand what's there**

Read all files under `app/general-consult/`.

Note the metadata, schemas, and section components currently used.

**Step 2: Decide scope of repurpose**

Minimum viable repurpose:
1. Keep the URL live
2. Change the H1 + copy to "Specialty Services" framing
3. Add 2–3 routing cards → ED, Hair Loss, Repeat Rx (with "coming soon" for Weight Loss, Women's Health)
4. Soften the existing "general consult" intake CTA so it's no longer the primary action
5. Update metadata so SEO snippet matches the new framing

We are NOT doing a full rebuild with Morning Canvas here — out of scope for this plan. Aim for 1–2 hours of targeted edits.

---

### Task 20: Rewrite `/general-consult` as specialty hub

**Files:**
- Modify: `app/general-consult/page.tsx`
- Modify: any client component file used by the page

**Step 1: Update metadata**

```typescript
export const metadata: Metadata = {
  title: "Online Doctor Specialties | ED, Hair Loss, Prescriptions | InstantMed",
  description: "InstantMed focuses on specific conditions — discreet ED treatment, hair loss treatment, and repeat prescriptions. Doctor-reviewed by AHPRA-registered Australian doctors.",
  alternates: {
    canonical: "https://instantmed.com.au/general-consult",
  },
}
```

**Step 2: Replace the main content**

Use the existing section components (CenteredHero, FeatureGrid, CTABanner) to build a lightweight routing page:

1. **Hero**: "Specialty Services" / "Doctor-reviewed treatment for specific conditions"
2. **Subhero**: "InstantMed focuses on a handful of conditions where online care works well. Find yours below."
3. **Service cards (3 live, 2 coming soon)**:
   - Medical Certificates → `/medical-certificate`
   - Repeat Medication → `/repeat-prescriptions`
   - ED Treatment → `/erectile-dysfunction`
   - Hair Loss Treatment → `/hair-loss`
   - Weight Loss (coming soon, no link)
   - Women's Health (coming soon, no link)
4. **"Can't find what you need?"** CTA → `/contact` with copy: `If you need care for something not listed, your regular GP is the best next step. We're here if you need a referral letter or sick certificate.`
5. **FAQ about why we focus on specific services** (1 question/answer): `"Why doesn't InstantMed offer general consults anymore? Focusing on specific conditions lets us build deeper clinical safety checks and a better experience for each one. For everything else, your regular GP is the best next step."`

**Step 3: Typecheck + lint + preview**

Run: `pnpm typecheck`
Expected: 0 errors.

Run: `pnpm lint`
Expected: 0 warnings.

Navigate to `/general-consult`. `preview_snapshot` to confirm it renders as a hub page. No intake flow CTAs prominently visible.

**Step 4: Commit**

```bash
git add app/general-consult/
git commit -m "feat(marketing): /general-consult repurposed as specialty services hub"
```

---

## Phase 6 — Cleanup

### Task 21: Audit hair loss CTAs across the codebase

**Files:**
- Search: entire codebase

**Step 1: Find stale consult-subtype URLs**

Run: Grep for `service=consult&subtype=hair_loss` across the codebase. The new landing uses this URL — so most references are correct. But verify none are still using deprecated variants.

Run: Grep for `service=consult&subtype=ed`. Same check.

**Step 2: Check for any references to the deleted `HairLossClient`**

Run: Grep for `HairLossClient` — should be 0 results (we deleted it in Task 16).

**Step 3: Check for any references to the old `/consult` route as a primary service CTA**

Run: Grep for `/consult` (excluding `/consult/request` which is intake).

Evaluate each result. Any marketing CTA pointing to `/consult` as a primary destination should now point to `/erectile-dysfunction` or `/hair-loss`. Do NOT remove links to `/consult/request` — that's the intake.

**Step 4: Fix any stragglers**

Edit files as needed. Small scope — expect <5 changes.

**Step 5: Commit**

```bash
git add <files>
git commit -m "chore(marketing): align cross-page CTAs with specialty URLs"
```

---

### Task 22: Update CLAUDE.md Pricing table & Key Workflows

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Read the pricing table**

Find the Pricing section in `CLAUDE.md`. It currently lists Hair loss at $39.95 and ED at $39.95. User already updated `lib/constants.ts` but may not have updated the docs.

**Step 2: Update prices in the table**

- `Hair loss` → `$49.95`
- `ED consult` → `$49.95`
- `Weight loss` → `$89.95`

**Step 3: Update the Key Workflows section (or add one)**

Add a brief bullet noting that ED and hair loss use **asynchronous form-based review** — no call step. This is important context for future Claude sessions.

Specifically, add to the `Key Workflows` section (or create a new subsection):

```
**Specialty services (ED, Hair Loss):** Form-based intake only, no call step. Patient fills structured assessment → doctor reviews → approves/declines → eScript delivered. URLs: `/erectile-dysfunction`, `/hair-loss`. Both use the shared `consult` service type with subtypes `ed` and `hair_loss`. General consult has been removed from marketing surfaces but the `/general-consult` URL is kept as a specialty services hub.
```

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): update pricing + document specialty focus model"
```

---

### Task 23: Update ARCHITECTURE.md (if it has a key pages / service list)

**Files:**
- Modify: `ARCHITECTURE.md`

**Step 1: Read the file**

Search for "key pages" or any list of marketing pages / service types.

**Step 2: Update**

- Add `/erectile-dysfunction` as a key landing page
- Update `/hair-loss` description to reflect the quality rebuild
- Note that `/general-consult` is now a specialty hub, not an intake entry point

Keep edits minimal — this is a doc update, not a rewrite.

**Step 3: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs(arch): document specialty focus model and /erectile-dysfunction"
```

---

## Phase 7 — Verification & PR

### Task 24: Full quality gate

**Files:**
- None — verification only

**Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 2: Lint**

Run: `pnpm lint`
Expected: 0 warnings.

**Step 3: Unit tests**

Run: `pnpm test`
Expected: All tests green.

**Step 4: Build**

Run: `pnpm build`
Expected: Build succeeds. Inspect output for:
- `/erectile-dysfunction` appears in the route list
- `/hair-loss` appears
- `/ed` → 301 redirect (from Task 10)
- No route conflicts
- No type errors
- Bundle size not dramatically larger (ballpark check — new landing pages add ~10–20KB each)

**Step 5: Stack pins check**

Run: `scripts/check-stack-pins.sh` (or equivalent)
Expected: All pins match. If any drift, stop and investigate — you must not have upgraded deps.

**Step 6: Commit (marker, no changes)**

Skip commit — this task is validation only.

---

### Task 25: E2E smoke of the intake flow

**Files:**
- None — verification only

**Step 1: Run targeted intake E2E tests**

Run: `PLAYWRIGHT=1 pnpm e2e --grep "hair_loss|ed-assessment|consult-subtype"`

If no matching tests exist, run the full intake suite:
Run: `PLAYWRIGHT=1 pnpm e2e e2e/intake-flows.spec.ts`

Expected: ED and hair loss intake subtypes still work. `/request?service=consult&subtype=ed` routes correctly to the ED assessment step.

**Step 2: Manual flow check**

Via preview tools:
1. Navigate to `/erectile-dysfunction`
2. Click primary CTA
3. Confirm the URL is `/request?service=consult&subtype=ed`
4. Confirm first step is the ED assessment form
5. Back out, navigate to `/hair-loss`
6. Click primary CTA
7. Confirm URL is `/request?service=consult&subtype=hair_loss`
8. Confirm first step is the hair loss assessment form

Use `preview_click` and `preview_snapshot` to verify.

**Step 3: If anything is broken, fix and re-verify before proceeding.**

---

### Task 26: Visual polish pass

**Files:**
- Any marketing page with visual issues

**Step 1: Screenshot each new/changed page**

Pages to check via `preview_screenshot`:
- `/` (homepage)
- `/erectile-dysfunction`
- `/hair-loss`
- `/general-consult`

Check each at:
- Desktop (1280px)
- Mobile (375px)
- Dark mode

**Step 2: Flag any visible issues**

Common issues to look for:
- Hero mockup overlaps text
- Sticky CTA obscures content
- Dark mode contrast issues on cards
- Testimonials section empty or showing placeholder data
- FAQ accordions misaligned
- Footer service list shows the right 5 items

**Step 3: Fix any issues found.** Re-verify after each fix.

**Step 4: Share final screenshots with user in the session summary.**

---

### Task 27: Run the `instantmed-ship` quality gate skill

**Files:**
- None — skill invocation

**Step 1: Invoke the ship skill**

Use the Skill tool with `instantmed-ship`.

Expected: the skill runs the full quality pipeline (typecheck, lint, test, build, route conflict check, stack pin check) and reports green.

**Step 2: Resolve any issues the skill flags.**

---

### Task 28: Open PR

**Files:**
- None — git/gh only

**Step 1: Push the branch**

Run: `git push -u origin feat/specialty-focus-ed-hair-loss`

**Step 2: Open PR via `gh pr create`**

Use the PR template from CLAUDE.md's git workflow. Title: `feat: specialty focus — ED + hair loss landing pages, homepage update`.

Body (HEREDOC):

```
## Summary
- Launch dedicated ED landing page at /erectile-dysfunction (async form-based flow, no call step)
- Rebuild /hair-loss landing to match med cert quality bar
- Replace general consult with ED + hair loss as primary specialties on homepage + nav + footer
- Repurpose /general-consult as a specialty services hub (no redirect)
- Update pricing docs: ED $49.95, hair loss $49.95, weight loss $89.95

## Test plan
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` 0 warnings
- [ ] `pnpm test` all green
- [ ] `pnpm build` succeeds, new routes in output
- [ ] Preview: /erectile-dysfunction renders on desktop + mobile + dark mode
- [ ] Preview: /hair-loss renders on desktop + mobile + dark mode
- [ ] Preview: Homepage ServicePicker shows 4 cards, ED + hair loss route correctly
- [ ] Preview: Services dropdown shows the 4 items
- [ ] Preview: /general-consult renders as hub page
- [ ] E2E: /request?service=consult&subtype=ed + subtype=hair_loss intake flows still work
- [ ] /ed redirects to /erectile-dysfunction (permanent 301)
- [ ] Sitemap includes /erectile-dysfunction
```

**Step 3: Share PR URL with user.**

---

## Out of Scope (Explicitly Not in This Plan)

- Weight loss / Women's health landing pages (user: "later")
- Compound pharmacy / medication supply model (user: "consult-only")
- New intake step components (the step registry already supports ED + hair loss)
- PHI encryption changes
- Doctor portal updates
- Stripe pricing config updates (prices flow through existing `STRIPE_PRICE_*` env vars tied to `CONSULT` price point)
- Blog post creation for the related articles section (will be stubs or empty if posts don't exist)
- Google Ads / LegitScript compliance copy pass (separate workstream)
- Programmatic SEO pages (`/health/*`) updates
- Repeat Rx subscription flip to default-ON (user discussion, separate task)

---

## Risks & Watch-outs

1. **Copy drift on medico-legal tone.** Do NOT use "async" or "instant" language. Stick to "no call needed", "doctor-reviewed", "AHPRA-registered". If in doubt, mirror the `/medical-certificate` page copy patterns.

2. **Service availability provider ID union.** Extending it to include `"ed"` and `"hair-loss"` may touch the disabled-state handling in `ServicePicker` and other consumers. Typecheck is your safety net — if the build goes red on a consumer you didn't touch, the id union changed upstream.

3. **Analytics hook service key.** Same risk as above. Check that `useLandingAnalytics` accepts the new keys. Extend the union if needed, but keep the change minimal.

4. **Testimonials coverage.** The existing `testimonials.ts` data may not have ED or hair-loss-tagged entries. Falling back to generic "consultation" testimonials is fine — do NOT fabricate testimonials.

5. **Hair loss Treatment Options section.** This is the highest-value block on the current hair loss page. Make sure the rebuild PRESERVES it. If the new `HairLossLanding` component drops it, go back and add it in.

6. **Stack pin enforcement.** CI will fail if Next, React, Tailwind, or Framer Motion drift. None of this work should touch `package.json`. If it does, stop and investigate.

7. **Route conflicts.** `scripts/check-route-conflicts.sh` runs in CI. If you accidentally create `app/ed/page.tsx` AND a `redirects` entry for `/ed`, the build tracer will complain. Pick one (prefer the redirects config).

8. **Image assets.** The hair loss page currently uses `/images/consult-1.jpeg`. The new ED landing may need its own hero image. Check `public/images/` — if there's nothing suitable, omit the hero image section rather than using the wrong one.

9. **Related articles links.** If the blog slugs in `RELATED_ARTICLES` (Task 8 Step 2) don't exist, the `RelatedArticles` section will render broken links. Either hide the section or point to existing blog posts. Grep `app/blog/**` for existing posts before hardcoding.

10. **General consult page removal from nav but not from sitemap.** Leave `/general-consult` in the sitemap since the URL is still live (as a hub). Do NOT remove it from `app/sitemap.ts`.

---

## Success Criteria

- [ ] `/erectile-dysfunction` is live as a bespoke landing page that matches the `/medical-certificate` quality bar
- [ ] `/hair-loss` is rebuilt to match the same quality bar
- [ ] Homepage shows 4 services: Med Cert, Repeat Rx, ED, Hair Loss
- [ ] Navbar services dropdown shows the same 4 items (no general consult)
- [ ] Footer lists the new services in the correct order
- [ ] `/general-consult` still loads but has been reframed as a specialty hub
- [ ] `/ed` 301 redirects to `/erectile-dysfunction`
- [ ] Intake flows for `ed` + `hair_loss` subtypes still work end-to-end
- [ ] No call step shown in any ED / hair loss copy
- [ ] `pnpm ci` passes green
- [ ] PR opened with a green CI run

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-04-08-specialty-focus-ed-hair-loss.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan because the tasks are bite-sized and there's moderate review surface area per task.

**2. Parallel Session (separate)** — Open a new session with `superpowers:executing-plans`, batch execution with checkpoints. Best if you want to walk away and come back to a completed branch.

**Which approach?**
