# ED + Hair Loss Hardening — Phase 2: Landing Depth + Notifs + Stripe

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the ED and hair loss landing pages to match `/medical-certificate` quality (hook quizzes, interactive calculators, timelines, mechanism explainer, expanded guides), port shared interactive components, wire subtype-aware fulfilment notifications (Telegram + patient email), and harden the Stripe price mapping to fail loud in production on missing subtype env vars.

**Architecture:** Two rebuilt landing pages reuse extracted shared components (`ContextualMessage`, `AnimatedStat`, `RecentReviewsTicker`) and a handful of new service-specific sections (`EdHookQuiz`, `EdPrevalenceCalculator`, `EdMechanismExplainer`, `EdOutcomesSection`, `HairLossHookQuiz`, `HairLossProgressTimeline`, `HairLossFamilyHistoryStrip`). Hook quizzes persist results to `sessionStorage` under a stable `v1` contract so the deferred intake rewrite can pre-fill IIEF-5 and Norwood steps later. The Stripe webhook handler swaps its hardcoded slug→name map for a subtype-aware resolver that flows through to Telegram + patient confirmation email. `lib/stripe/price-mapping.ts` throws in production rather than silently falling back to the generic consult price.

**Tech Stack:** React 18.3 client components · Framer Motion 11 (respect `useReducedMotion`) · Tailwind v4 · Vitest + `renderToStaticMarkup` for unit tests · Next.js 15.5 App Router · PostHog analytics via `useLandingAnalytics` hook · Resend email templates.

**Design doc:** [`docs/plans/2026-04-09-ed-hairloss-hardening-design.md`](./2026-04-09-ed-hairloss-hardening-design.md) — see Phase 2 (sections 2.1–2.5).

---

## Context for the implementer

### Scope boundary — what Phase 2 does NOT touch

- **No intake changes.** `components/request/steps/ed-assessment-step.tsx`, `ed-safety-step.tsx`, `hair-loss-assessment-step.tsx`, and `lib/request/step-registry.ts` are frozen.
- **No IIEF-5, no Norwood picker, no photo upload inside intake.** Those land in the post-research intake rewrite.
- **No new env vars.** `STRIPE_PRICE_CONSULT_ED` and `STRIPE_PRICE_CONSULT_HAIR_LOSS` are already validated in `lib/env.ts` at lines 123–124 — we're just changing how `price-mapping.ts` handles missing values in prod.

### Cross-phase contract — `sessionStorage` keys

Phase 2 must write these exact keys so the deferred intake work can read them later. Do not change the shape or version suffix.

```ts
// components/marketing/sections/ed-hook-quiz.tsx
const ED_HOOK_QUIZ_KEY = "instantmed.hookQuiz.ed.v1"
type EdHookQuizResult = {
  tier: "mild" | "moderate" | "severe"
  answers: [number, number, number] // each 1–5
  completedAt: string // ISO timestamp
}

// components/marketing/sections/hair-loss-hook-quiz.tsx
const HAIR_LOSS_HOOK_QUIZ_KEY = "instantmed.hookQuiz.hair_loss.v1"
type HairLossHookQuizResult = {
  norwood: 1 | 2 | 3 | 4 | 5 | 6 | 7
  durationBucket: "<6mo" | "6-12mo" | "1-3yr" | "3yr+"
  completedAt: string
}
```

Both reads should check `completedAt` is within 24 hours and discard if older (matches Zustand intake store expiry).

### TGA copy discipline — applies to every new component

No drug names in any new section. Safe phrasing:
- "oral treatment" / "prescription oral treatment"
- "treatment" / "your treatment"
- "a class of prescription treatments"
- "treatment typically shows results around month X" (about the patient population, not a specific drug)

Unsafe phrasing (DO NOT WRITE):
- "PDE5 inhibitor", "sildenafil", "tadalafil", "Viagra", "Cialis"
- "finasteride", "minoxidil", "Propecia", "Rogaine", "DHT blocker"
- Anything naming a specific Schedule 4 product

If you find yourself about to write a drug name, stop and reword.

### Landing page section order (final state after Phase 2)

**ED landing (`components/marketing/erectile-dysfunction-landing.tsx`):**
1. Navbar + ReturningPatientBanner
2. Hero with DoctorAvailabilityPill, RotatingText, EDHeroMockup, LiveWaitTime strip (new)
3. **NEW** `EdHookQuiz` — above the fold is the CTA, below it is the quiz
4. SocialProofStrip with AnimatedStat (new, ported from med cert)
5. **NEW** `ContextualMessage` (service="ed") — extracted shared component
6. **NEW** `RecentReviewsTicker` (format="anonymous") — extracted shared component
7. HowItWorksSection (existing dynamic)
8. **NEW** `EdPrevalenceCalculator`
9. **NEW** `EdMechanismExplainer`
10. EDGuideSection (existing, expanded in Phase 1 drug-strip + new sub-sections this phase)
11. **NEW** `EdOutcomesSection` — replaces `EDLimitationsSection`
12. DoctorProfileSection (existing)
13. PricingSection (existing, `showComparisonTable` enabled)
14. TestimonialsSection (existing, filtered to ED)
15. **NEW** RelatedArticles strip (ported from med cert, points at content hub)
16. ContentHubLinks (existing)
17. RegulatoryPartners (existing)
18. FaqCtaSection (existing, `ED_FAQ`)
19. FinalCtaSection (existing)
20. ExitIntentOverlay (existing)
21. Sticky mobile CTA + sticky desktop CTA (existing)
22. MarketingFooter

**Hair loss landing (`components/marketing/hair-loss-landing.tsx`):** same structure but with `HairLossHookQuiz`, `HairLossProgressTimeline`, `HairLossFamilyHistoryStrip`, `HairLossGuideSection` (expanded with Norwood visualiser), no outcomes section rebuild. Use `RecentReviewsTicker` with `format="named"` (hair loss is not shame-sensitive in the same way as ED).

### Test strategy for Phase 2 components

The Vitest environment is `node`, not `jsdom`. That means client-only components using `sessionStorage`, `IntersectionObserver`, `document`, `window.addEventListener`, or other browser globals cannot be fully exercised in unit tests. Follow this pattern:

1. **Testable in node env:**
   - Pure helper functions (tier scoring, duration bucketing, Norwood label lookups, prevalence data lookups, contextual message selection by date). Extract these into plain TS modules under `lib/marketing/<feature>.ts` and unit-test those.
   - Component markup via `renderToStaticMarkup` — good for verifying labels, a11y attributes, correct initial render. Not good for interactions.
2. **NOT testable in node env:**
   - `sessionStorage` writes, `IntersectionObserver`, scroll triggers, hover/click interactions. These get browser verification via `preview_*` tools at the end of each landing page rebuild.

So each new section gets: one pure helper with unit tests + one initial-render snapshot-style smoke test + final preview verification.

---

## Phase 2A — Shared extractions (do these first, unblocks everything else)

### Task 1: Extract `ContextualMessage` shared component

**Files:**
- Create: `lib/marketing/contextual-messages.ts` (pure data + helper)
- Create: `lib/__tests__/contextual-messages.test.ts`
- Create: `components/marketing/contextual-message.tsx` (client component)
- Modify: `components/marketing/med-cert-landing.tsx` (delete inline version, import new component)

**Step 1: Write the failing test**

Create `lib/__tests__/contextual-messages.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { selectContextualMessage, type ContextualMessageService } from "@/lib/marketing/contextual-messages"

function at(isoDay: string, hour: number): Date {
  return new Date(`${isoDay}T${String(hour).padStart(2, "0")}:30:00+10:00`)
}

describe("selectContextualMessage", () => {
  const services: ContextualMessageService[] = ["med-cert", "ed", "hair-loss"]

  it.each(services)("returns a non-empty string for %s on Monday morning", (service) => {
    const msg = selectContextualMessage(service, at("2026-04-13", 8)) // Mon 8:30am AEST
    expect(msg).toBeTruthy()
    expect(msg?.length).toBeGreaterThan(10)
  })

  it.each(services)("returns a non-empty string for %s on Sunday evening", (service) => {
    const msg = selectContextualMessage(service, at("2026-04-12", 19)) // Sun 7:30pm AEST
    expect(msg).toBeTruthy()
  })

  it("returns a different message for each service at the same time", () => {
    const clock = at("2026-04-13", 8)
    const medCert = selectContextualMessage("med-cert", clock)
    const ed = selectContextualMessage("ed", clock)
    const hairLoss = selectContextualMessage("hair-loss", clock)
    expect(medCert).not.toEqual(ed)
    expect(medCert).not.toEqual(hairLoss)
    expect(ed).not.toEqual(hairLoss)
  })

  it("never returns a string containing drug names for ED or hair loss", () => {
    const drugRe = /viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil|propecia|rogaine/i
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const clock = new Date(`2026-04-${13 + day}T${String(hour).padStart(2, "0")}:00:00+10:00`)
        const ed = selectContextualMessage("ed", clock) ?? ""
        const hl = selectContextualMessage("hair-loss", clock) ?? ""
        expect(ed).not.toMatch(drugRe)
        expect(hl).not.toMatch(drugRe)
      }
    }
  })
})
```

**Step 2: Run the test to verify it fails**

Run: `pnpm test lib/__tests__/contextual-messages.test.ts`

Expected: FAIL with "Cannot find module '@/lib/marketing/contextual-messages'".

**Step 3: Create the data + helper module**

Create `lib/marketing/contextual-messages.ts`:

```ts
/**
 * Contextual messages shown on landing pages based on day of week + time.
 * Service-indexed so each landing page has its own voice.
 *
 * TGA-compliant: no drug names anywhere in the ED or hair-loss sets.
 */

export type ContextualMessageService = "med-cert" | "ed" | "hair-loss"

type MessageSet = {
  mondayMorning?: string
  sundayEvening?: string
  weeknightLate?: string
  weekendDay?: string
  januaryAny?: string
  fallback: string
}

const CONTEXTUAL_MESSAGES: Record<ContextualMessageService, MessageSet> = {
  "med-cert": {
    mondayMorning: "Monday morning? Most patients get their certificate before their first meeting.",
    sundayEvening: "Sunday night — sort tomorrow's sick day now and relax.",
    weeknightLate: "Too late for the GP? We run 24/7 for certificates.",
    weekendDay: "Weekend and your GP is closed? We're always open.",
    fallback: "Quick, discreet, and reviewed by an Australian-registered doctor.",
  },
  "ed": {
    mondayMorning: "Sorting this before the day starts? Most assessments are reviewed before lunch.",
    sundayEvening: "Get it sorted tonight — reviewed before Monday.",
    weeknightLate: "Too late for a GP? We're reviewing now.",
    weekendDay: "Weekend and your GP is closed? We're open right now.",
    fallback: "No calls, no waiting rooms — just a structured form reviewed by an Australian doctor.",
  },
  "hair-loss": {
    januaryAny: "Starting fresh this year? Month 3 is usually when patients notice the difference.",
    weekendDay: "Taking care of this on the weekend? Reviewed within a few hours.",
    weeknightLate: "Starting treatment sooner means more follicles to work with.",
    fallback: "A quick structured assessment, reviewed by an Australian-registered doctor.",
  },
}

function getAESTDate(date: Date = new Date()): { dayOfWeek: number; hour: number; month: number } {
  // Convert to AEST (UTC+10) — simple offset, does not handle DST
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const aest = new Date(utc + 10 * 3600000)
  return {
    dayOfWeek: aest.getDay(),
    hour: aest.getHours(),
    month: aest.getMonth(),
  }
}

export function selectContextualMessage(
  service: ContextualMessageService,
  now: Date = new Date()
): string | null {
  const set = CONTEXTUAL_MESSAGES[service]
  const { dayOfWeek, hour, month } = getAESTDate(now)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isMondayMorning = dayOfWeek === 1 && hour >= 7 && hour < 11
  const isSundayEvening = dayOfWeek === 0 && hour >= 17 && hour < 23
  const isWeeknightLate = !isWeekend && (hour >= 20 || hour < 6)
  const isWeekendDay = isWeekend && hour >= 8 && hour < 20
  const isJanuary = month === 0

  if (isMondayMorning && set.mondayMorning) return set.mondayMorning
  if (isSundayEvening && set.sundayEvening) return set.sundayEvening
  if (isWeeknightLate && set.weeknightLate) return set.weeknightLate
  if (isWeekendDay && set.weekendDay) return set.weekendDay
  if (isJanuary && set.januaryAny) return set.januaryAny
  return set.fallback
}
```

**Step 4: Run the test to verify it passes**

Run: `pnpm test lib/__tests__/contextual-messages.test.ts`

Expected: all tests PASS. If "returns a different message for each service at the same time" fails, the fallback strings above are already distinct — check you copied them verbatim.

**Step 5: Create the client component wrapper**

Create `components/marketing/contextual-message.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  selectContextualMessage,
  type ContextualMessageService,
} from "@/lib/marketing/contextual-messages"

interface ContextualMessageProps {
  service: ContextualMessageService
  className?: string
}

export function ContextualMessage({ service, className }: ContextualMessageProps) {
  const [message, setMessage] = useState<string | null>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    setMessage(selectContextualMessage(service))
  }, [service])

  if (!message) return null

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={message}
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className={className ?? "text-sm text-muted-foreground"}
      >
        {message}
      </motion.p>
    </AnimatePresence>
  )
}
```

**Step 6: Replace the inline med-cert implementation**

Read `components/marketing/med-cert-landing.tsx` around line 168 (the inline `ContextualMessage`). Delete the inline definition, replace it with an import from the new component: `import { ContextualMessage } from "@/components/marketing/contextual-message"`. Keep the usage site unchanged but pass `service="med-cert"`. Verify any inline state/effects for day-of-week detection are removed.

**Step 7: Typecheck + test + commit**

```bash
pnpm typecheck && pnpm test
git add lib/marketing/contextual-messages.ts lib/__tests__/contextual-messages.test.ts components/marketing/contextual-message.tsx components/marketing/med-cert-landing.tsx
git commit -m "$(cat <<'EOF'
refactor(marketing): extract ContextualMessage to shared component

Pulls the day-of-week contextual copy out of med-cert-landing.tsx into
a reusable <ContextualMessage service="..."> component. The copy lookup
lives in lib/marketing/contextual-messages.ts so it's unit-testable in
the node Vitest env without touching the React layer. Adds ED and
hair-loss message sets ready for the Phase 2 landing rebuilds, with
a test that locks in no drug names ever leak into ED or hair-loss copy
across a full 7-day x 24-hour scan.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract `AnimatedStat` shared component

**Files:**
- Create: `components/marketing/animated-stat.tsx`
- Modify: `components/marketing/med-cert-landing.tsx`

**Step 1: Read the current inline implementation**

In `components/marketing/med-cert-landing.tsx` around line 203, read the inline `AnimatedStat` component. It's likely a count-up that uses `IntersectionObserver` or `useInView` plus a numeric spring. Copy its props shape and behavior exactly — do not redesign it.

**Step 2: Create the shared component**

Create `components/marketing/animated-stat.tsx`. Move the inline implementation into this file verbatim with `"use client"` at the top. Export it as a named export. Keep the same prop interface.

**Step 3: Replace the inline usage in med-cert-landing**

Delete the inline definition from `med-cert-landing.tsx`, add `import { AnimatedStat } from "@/components/marketing/animated-stat"` near the other imports.

**Step 4: Typecheck + build**

Run: `pnpm typecheck && pnpm build`

Expected: no errors. Build catches any client/server boundary issues from the extraction.

**Step 5: Verify med-cert landing still renders in preview**

Start preview with `preview_start` if needed, navigate to `/medical-certificate`, snapshot the social proof section and confirm the counts animate in (scroll into view). Screenshot and attach to commit message if the counts visibly animate.

**Step 6: Commit**

```bash
git add components/marketing/animated-stat.tsx components/marketing/med-cert-landing.tsx
git commit -m "refactor(marketing): extract AnimatedStat to shared component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Build generalised `RecentReviewsTicker`

**Files:**
- Create: `lib/marketing/review-ticker-data.ts`
- Create: `lib/__tests__/review-ticker-data.test.ts`
- Create: `components/marketing/recent-reviews-ticker.tsx`
- Modify: `components/marketing/med-cert-landing.tsx` (replace `RecentActivityTicker` usage)

**Step 1: Understand the current med-cert implementation**

Read `components/marketing/med-cert-landing.tsx` around line 129 where `RecentActivityTicker` is defined inline (per the audit summary). Note its data shape — probably `{ name: string; city: string; minutesAgo: number }`. The current format is "Sarah from Melbourne received her certificate 23 min ago."

**Step 2: Write the failing test for the data helper**

Create `lib/__tests__/review-ticker-data.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  formatTickerEntry,
  type TickerEntry,
  type TickerFormat,
} from "@/lib/marketing/review-ticker-data"

describe("formatTickerEntry — named format (med cert, hair loss)", () => {
  const entry: TickerEntry = { name: "Sarah", city: "Melbourne", minutesAgo: 23 }

  it("includes the first name", () => {
    expect(formatTickerEntry(entry, "named", "certificate")).toContain("Sarah")
  })

  it("includes the city", () => {
    expect(formatTickerEntry(entry, "named", "certificate")).toContain("Melbourne")
  })

  it("includes the time", () => {
    expect(formatTickerEntry(entry, "named", "certificate")).toContain("23 min")
  })
})

describe("formatTickerEntry — anonymous format (ED)", () => {
  const entry: TickerEntry = { name: "Sarah", city: "Melbourne", minutesAgo: 23 }

  it("does NOT include the first name", () => {
    expect(formatTickerEntry(entry, "anonymous", "treatment")).not.toContain("Sarah")
  })

  it("still includes the city", () => {
    expect(formatTickerEntry(entry, "anonymous", "treatment")).toContain("Melbourne")
  })

  it("still includes the time", () => {
    expect(formatTickerEntry(entry, "anonymous", "treatment")).toContain("23 min")
  })

  it("uses neutral person reference", () => {
    const str = formatTickerEntry(entry, "anonymous", "treatment")
    expect(str.toLowerCase()).toMatch(/patient|someone/)
  })
})
```

**Step 3: Run to verify it fails**

Run: `pnpm test lib/__tests__/review-ticker-data.test.ts`

Expected: FAIL with module not found.

**Step 4: Create the data helper**

Create `lib/marketing/review-ticker-data.ts`:

```ts
export type TickerFormat = "named" | "anonymous"

export interface TickerEntry {
  name: string
  city: string
  minutesAgo: number
}

// Keep these generic so they can be used across services — no clinical
// content, no drug names, no identifying details beyond first name + city.
const SAMPLE_ENTRIES: TickerEntry[] = [
  { name: "Sarah", city: "Melbourne", minutesAgo: 23 },
  { name: "James", city: "Sydney", minutesAgo: 41 },
  { name: "Priya", city: "Brisbane", minutesAgo: 12 },
  { name: "Tom", city: "Perth", minutesAgo: 56 },
  { name: "Lauren", city: "Adelaide", minutesAgo: 8 },
  { name: "Daniel", city: "Canberra", minutesAgo: 34 },
  { name: "Aisha", city: "Hobart", minutesAgo: 19 },
  { name: "Matt", city: "Gold Coast", minutesAgo: 47 },
]

export function getTickerEntries(): TickerEntry[] {
  return SAMPLE_ENTRIES
}

/**
 * Format a ticker entry as a display string.
 *
 * named: "Sarah from Melbourne received her certificate 23 min ago."
 * anonymous: "A patient from Melbourne received their treatment 23 min ago."
 *
 * The `artifact` param is the noun shown to the user — "certificate",
 * "treatment", "prescription", etc. Keep it generic for ED to avoid
 * the drug-name cliff.
 */
export function formatTickerEntry(
  entry: TickerEntry,
  format: TickerFormat,
  artifact: string
): string {
  const timeStr = `${entry.minutesAgo} min ago`
  if (format === "named") {
    return `${entry.name} from ${entry.city} received their ${artifact} ${timeStr}.`
  }
  return `A patient from ${entry.city} received their ${artifact} ${timeStr}.`
}
```

**Step 5: Run the test to verify it passes**

Run: `pnpm test lib/__tests__/review-ticker-data.test.ts`

Expected: all tests PASS.

**Step 6: Build the client component**

Create `components/marketing/recent-reviews-ticker.tsx`. Base it on the existing `RecentActivityTicker` inline implementation from med-cert-landing — rotate through entries with fade animation, respect `useReducedMotion`. Accept props `{ format: TickerFormat; artifact: string; className?: string }`. Use `formatTickerEntry` + `getTickerEntries` from the data helper.

```tsx
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  formatTickerEntry,
  getTickerEntries,
  type TickerFormat,
} from "@/lib/marketing/review-ticker-data"

interface RecentReviewsTickerProps {
  format: TickerFormat
  artifact: string
  className?: string
  intervalMs?: number
}

export function RecentReviewsTicker({
  format,
  artifact,
  className,
  intervalMs = 5000,
}: RecentReviewsTickerProps) {
  const entries = getTickerEntries()
  const [index, setIndex] = useState(0)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % entries.length), intervalMs)
    return () => clearInterval(id)
  }, [entries.length, intervalMs])

  const current = entries[index]

  return (
    <div className={className ?? "text-sm text-muted-foreground"} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {formatTickerEntry(current, format, artifact)}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
```

**Step 7: Replace med-cert usage**

In `med-cert-landing.tsx`, remove the inline `RecentActivityTicker` and use `<RecentReviewsTicker format="named" artifact="certificate" />`.

**Step 8: Typecheck + commit**

```bash
pnpm typecheck && pnpm test
git add lib/marketing/review-ticker-data.ts lib/__tests__/review-ticker-data.test.ts components/marketing/recent-reviews-ticker.tsx components/marketing/med-cert-landing.tsx
git commit -m "$(cat <<'EOF'
refactor(marketing): extract RecentReviewsTicker with named/anonymous formats

Pulls the rotating activity ticker out of med-cert-landing.tsx and
generalises it to support both the named format (med cert, hair loss)
and an anonymous format for the ED landing where "Sarah from Melbourne"
juxtaposed with ED content creates unnecessary shame surface area. The
helper lives in lib/marketing/review-ticker-data.ts so both formats can
be unit-tested in the node Vitest env.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Extend `LiveWaitTime` with consult subtypes

**Files:**
- Modify: `components/marketing/live-wait-time.tsx`

**Step 1: Read the current `SERVICE_CONFIG`**

Current config at lines 10–41 has `'med-cert'`, `'scripts'`, `'consult'`. Need to add subtype-aware variants for ED and hair loss so each landing can show its own pill.

**Step 2: Add new service keys**

Add to `SERVICE_CONFIG`:

```ts
'consult-ed': {
  label: 'ED Consultations',
  shortLabel: 'ED',
  icon: Phone,
  waitLabel: 'Under 1 hour',
  subtext: '8am–10pm AEST',
  color: 'text-primary',
  bgColor: 'bg-primary/10',
  alwaysOnline: false,
},
'consult-hair-loss': {
  label: 'Hair Loss Consultations',
  shortLabel: 'Hair Loss',
  icon: Phone,
  waitLabel: 'Under 1 hour',
  subtext: '8am–10pm AEST',
  color: 'text-primary',
  bgColor: 'bg-primary/10',
  alwaysOnline: false,
},
```

Icon choice: `Phone` is what the existing `consult` uses. If a different lucide icon reads better for ED/hair loss (e.g. `Stethoscope`), fine — but don't invent new icons.

**Step 3: Typecheck**

Run: `pnpm typecheck`

Expected: no errors. The `ServiceType` alias derives from `SERVICE_CONFIG` so the new keys flow through automatically.

**Step 4: Commit**

```bash
git add components/marketing/live-wait-time.tsx
git commit -m "feat(live-wait-time): add consult-ed and consult-hair-loss service configs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2B — New ED sections

### Task 5: Build `ed-hook-quiz` data + scoring

**Files:**
- Create: `lib/marketing/ed-hook-quiz.ts`
- Create: `lib/__tests__/ed-hook-quiz.test.ts`

**Step 1: Write the failing test**

Create `lib/__tests__/ed-hook-quiz.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  ED_HOOK_QUIZ_QUESTIONS,
  scoreEdHookQuiz,
  ED_HOOK_QUIZ_KEY,
  type EdHookQuizTier,
} from "@/lib/marketing/ed-hook-quiz"

describe("ED_HOOK_QUIZ_QUESTIONS", () => {
  it("has exactly 3 questions", () => {
    expect(ED_HOOK_QUIZ_QUESTIONS).toHaveLength(3)
  })

  it("each question has exactly 5 options", () => {
    for (const q of ED_HOOK_QUIZ_QUESTIONS) {
      expect(q.options).toHaveLength(5)
    }
  })

  it("each option has a score between 1 and 5", () => {
    for (const q of ED_HOOK_QUIZ_QUESTIONS) {
      for (const opt of q.options) {
        expect(opt.score).toBeGreaterThanOrEqual(1)
        expect(opt.score).toBeLessThanOrEqual(5)
      }
    }
  })

  it("contains no drug names", () => {
    const drugRe = /viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil/i
    for (const q of ED_HOOK_QUIZ_QUESTIONS) {
      expect(q.prompt).not.toMatch(drugRe)
      for (const opt of q.options) {
        expect(opt.label).not.toMatch(drugRe)
      }
    }
  })
})

describe("scoreEdHookQuiz", () => {
  it("returns 'severe' for lowest scores (3–6)", () => {
    expect(scoreEdHookQuiz([1, 1, 1]).tier).toBe("severe")
    expect(scoreEdHookQuiz([2, 2, 2]).tier).toBe("severe")
  })

  it("returns 'moderate' for mid scores (7–10)", () => {
    expect(scoreEdHookQuiz([3, 2, 2]).tier).toBe("moderate")
    expect(scoreEdHookQuiz([4, 3, 3]).tier).toBe("moderate")
  })

  it("returns 'mild' for high scores (11–15)", () => {
    expect(scoreEdHookQuiz([4, 4, 3]).tier).toBe("mild")
    expect(scoreEdHookQuiz([5, 5, 5]).tier).toBe("mild")
  })

  it("exposes the sessionStorage key constant", () => {
    expect(ED_HOOK_QUIZ_KEY).toBe("instantmed.hookQuiz.ed.v1")
  })
})
```

**Step 2: Run to verify failure**

Run: `pnpm test lib/__tests__/ed-hook-quiz.test.ts`

Expected: FAIL — module not found.

**Step 3: Create the module**

Create `lib/marketing/ed-hook-quiz.ts`:

```ts
/**
 * ED Hook Quiz — 3 lightweight questions designed for conversion.
 *
 * NOTE: this is NOT the IIEF-5. IIEF-5 is a 5-question clinical
 * assessment with a different scoring scale and lives inside the paid
 * intake. This 3-question hook quiz is positioned as a quick check,
 * not a clinical assessment, and never uses drug names.
 */

export const ED_HOOK_QUIZ_KEY = "instantmed.hookQuiz.ed.v1"

export type EdHookQuizTier = "mild" | "moderate" | "severe"

export interface EdHookQuizResult {
  tier: EdHookQuizTier
  answers: [number, number, number]
  completedAt: string
}

interface QuizOption {
  label: string
  score: 1 | 2 | 3 | 4 | 5
}

interface QuizQuestion {
  id: "q1" | "q2" | "q3"
  prompt: string
  options: QuizOption[]
}

export const ED_HOOK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt:
      "Over the past 4 weeks, how often have you been able to get an erection firm enough for sex?",
    options: [
      { label: "Almost never or never", score: 1 },
      { label: "A few times (much less than half the time)", score: 2 },
      { label: "Sometimes (about half the time)", score: 3 },
      { label: "Most times (much more than half the time)", score: 4 },
      { label: "Almost always or always", score: 5 },
    ],
  },
  {
    id: "q2",
    prompt:
      "When you tried to have sex, how confident were you that you could get and keep an erection?",
    options: [
      { label: "Very low", score: 1 },
      { label: "Low", score: 2 },
      { label: "Moderate", score: 3 },
      { label: "High", score: 4 },
      { label: "Very high", score: 5 },
    ],
  },
  {
    id: "q3",
    prompt: "Over the past 4 weeks, how satisfying was sex for you?",
    options: [
      { label: "Not at all satisfying", score: 1 },
      { label: "A little satisfying", score: 2 },
      { label: "Moderately satisfying", score: 3 },
      { label: "Highly satisfying", score: 4 },
      { label: "Very highly satisfying", score: 5 },
    ],
  },
]

export function scoreEdHookQuiz(answers: [number, number, number]): EdHookQuizResult {
  const total = answers[0] + answers[1] + answers[2]
  let tier: EdHookQuizTier
  if (total <= 6) tier = "severe"
  else if (total <= 10) tier = "moderate"
  else tier = "mild"
  return {
    tier,
    answers,
    completedAt: new Date().toISOString(),
  }
}

export function getEdHookQuizReassurance(tier: EdHookQuizTier): string {
  switch (tier) {
    case "severe":
      return "You're not alone — many patients in this range see meaningful improvement with treatment. A doctor can assess what's appropriate for you."
    case "moderate":
      return "This is a common place to be. Treatment is effective for most patients, and a doctor can recommend the right approach."
    case "mild":
      return "Things are relatively good but not perfect — a doctor can assess whether treatment or other support is worth considering."
  }
}
```

**Step 4: Run the test**

Run: `pnpm test lib/__tests__/ed-hook-quiz.test.ts`

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add lib/marketing/ed-hook-quiz.ts lib/__tests__/ed-hook-quiz.test.ts
git commit -m "feat(ed-landing): add hook-quiz scoring + TGA-compliant question set

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Build `EdHookQuiz` client component

**Files:**
- Create: `components/marketing/sections/ed-hook-quiz.tsx`

**Step 1: Build the component**

Create `components/marketing/sections/ed-hook-quiz.tsx` as a client component. It should:

1. Render `ED_HOOK_QUIZ_QUESTIONS` one at a time (or all three stacked — pick one, be consistent)
2. Show a radio-chip style option set per question
3. When all three are answered, animate the quiz card out and the result card in
4. Result card shows the tier label, reassurance string from `getEdHookQuizReassurance`, and a primary CTA button linking to `/request?service=consult&subtype=ed`
5. On completion, write `scoreEdHookQuiz(answers)` to `sessionStorage.setItem(ED_HOOK_QUIZ_KEY, JSON.stringify(result))`
6. Fire PostHog events via `useLandingAnalytics` hook:
   - `ed_hook_quiz_start` on first interaction
   - `ed_hook_quiz_q1_answered`, `q2`, `q3` with the chosen score
   - `ed_hook_quiz_completed` with `{ tier }`
   - `ed_hook_quiz_cta_clicked` on the result CTA

The `useLandingAnalytics` hook currently only exposes `trackCTAClick`, `trackExitIntent`, `trackFAQOpen`, `trackSectionView`. For the quiz-specific events, fall back to `usePostHog()` from `@/components/providers/posthog-provider` directly — import and use `posthog?.capture(eventName, props)`.

Layout target: single card, ~640px max width on desktop, stacked on mobile. Use the solid depth card pattern from `CLAUDE.md` §5: `bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]`. Framer-motion entry animations respect `useReducedMotion`.

Component signature:

```tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePostHog } from "@/components/providers/posthog-provider"
import {
  ED_HOOK_QUIZ_QUESTIONS,
  ED_HOOK_QUIZ_KEY,
  scoreEdHookQuiz,
  getEdHookQuizReassurance,
  type EdHookQuizResult,
} from "@/lib/marketing/ed-hook-quiz"

interface EdHookQuizProps {
  className?: string
}

export function EdHookQuiz({ className }: EdHookQuizProps) {
  // ... quiz state machine
  // ... render questions then result
  // ... writes sessionStorage on completion
}
```

Do not add translations, do not add a "skip" button, do not add progress bars beyond "Q1 of 3". Keep it lean.

**Step 2: Build-time check**

Run: `pnpm build`

Expected: no errors. Build is the best way to catch SSR issues with client-only components.

**Step 3: Commit**

```bash
git add components/marketing/sections/ed-hook-quiz.tsx
git commit -m "feat(ed-landing): add EdHookQuiz client component above the fold

3-question quiz with in-place result card. Saves scored tier to
sessionStorage under instantmed.hookQuiz.ed.v1 for the post-research
intake rewrite to pre-fill IIEF-5. PostHog events on every step.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Build `ed-prevalence-calculator` data + helper

**Files:**
- Create: `lib/marketing/ed-prevalence-data.ts`
- Create: `lib/__tests__/ed-prevalence-data.test.ts`

**Step 1: Write the failing test**

Create `lib/__tests__/ed-prevalence-data.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  ED_PREVALENCE_BY_DECADE,
  getPrevalenceForAge,
  getDecadeLabel,
} from "@/lib/marketing/ed-prevalence-data"

describe("ED prevalence data", () => {
  it("covers every adult decade from 20s to 70s+", () => {
    const decades = Object.keys(ED_PREVALENCE_BY_DECADE)
    expect(decades).toContain("20s")
    expect(decades).toContain("30s")
    expect(decades).toContain("40s")
    expect(decades).toContain("50s")
    expect(decades).toContain("60s")
    expect(decades).toContain("70s+")
  })

  it("rates increase monotonically with age", () => {
    const rates = [
      ED_PREVALENCE_BY_DECADE["20s"].rate,
      ED_PREVALENCE_BY_DECADE["30s"].rate,
      ED_PREVALENCE_BY_DECADE["40s"].rate,
      ED_PREVALENCE_BY_DECADE["50s"].rate,
      ED_PREVALENCE_BY_DECADE["60s"].rate,
      ED_PREVALENCE_BY_DECADE["70s+"].rate,
    ]
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1]!)
    }
  })

  it("all rates are plausible (between 1% and 85%)", () => {
    for (const entry of Object.values(ED_PREVALENCE_BY_DECADE)) {
      expect(entry.rate).toBeGreaterThanOrEqual(1)
      expect(entry.rate).toBeLessThanOrEqual(85)
    }
  })

  it("all entries cite a source", () => {
    for (const entry of Object.values(ED_PREVALENCE_BY_DECADE)) {
      expect(entry.source).toBeTruthy()
      expect(entry.source.length).toBeGreaterThan(5)
    }
  })
})

describe("getPrevalenceForAge", () => {
  it("maps ages 20–29 to 20s", () => {
    expect(getPrevalenceForAge(20).decade).toBe("20s")
    expect(getPrevalenceForAge(29).decade).toBe("20s")
  })
  it("maps ages 30–39 to 30s", () => {
    expect(getPrevalenceForAge(30).decade).toBe("30s")
    expect(getPrevalenceForAge(39).decade).toBe("30s")
  })
  it("maps ages 70+ to 70s+", () => {
    expect(getPrevalenceForAge(70).decade).toBe("70s+")
    expect(getPrevalenceForAge(85).decade).toBe("70s+")
  })
  it("clamps below 20 to 20s", () => {
    expect(getPrevalenceForAge(18).decade).toBe("20s")
  })
})

describe("getDecadeLabel", () => {
  it("returns human readable labels", () => {
    expect(getDecadeLabel("20s")).toContain("20")
    expect(getDecadeLabel("70s+")).toMatch(/70|seventies/i)
  })
})
```

**Step 2: Run to verify failure**

Run: `pnpm test lib/__tests__/ed-prevalence-data.test.ts`

Expected: FAIL (module not found).

**Step 3: Create the module**

Create `lib/marketing/ed-prevalence-data.ts`:

```ts
/**
 * ED prevalence rates by age decade.
 *
 * Rates are conservative estimates drawn from published literature
 * (primarily MMAS — Massachusetts Male Aging Study — cross-referenced
 * with AU-specific reviews where available). These numbers are
 * illustrative, not diagnostic. Footnoted on the page with the source.
 */

export type Decade = "20s" | "30s" | "40s" | "50s" | "60s" | "70s+"

interface PrevalenceEntry {
  rate: number // percentage, 0–100
  source: string
}

export const ED_PREVALENCE_BY_DECADE: Record<Decade, PrevalenceEntry> = {
  "20s": {
    rate: 8,
    source: "Published community surveys; illustrative",
  },
  "30s": {
    rate: 11,
    source: "Published community surveys; illustrative",
  },
  "40s": {
    rate: 22,
    source: "Massachusetts Male Aging Study (MMAS), illustrative",
  },
  "50s": {
    rate: 34,
    source: "Massachusetts Male Aging Study (MMAS), illustrative",
  },
  "60s": {
    rate: 45,
    source: "Massachusetts Male Aging Study (MMAS), illustrative",
  },
  "70s+": {
    rate: 60,
    source: "Massachusetts Male Aging Study (MMAS), illustrative",
  },
}

export function getPrevalenceForAge(age: number): { decade: Decade; rate: number; source: string } {
  let decade: Decade
  if (age < 30) decade = "20s"
  else if (age < 40) decade = "30s"
  else if (age < 50) decade = "40s"
  else if (age < 60) decade = "50s"
  else if (age < 70) decade = "60s"
  else decade = "70s+"
  const entry = ED_PREVALENCE_BY_DECADE[decade]
  return { decade, rate: entry.rate, source: entry.source }
}

export function getDecadeLabel(decade: Decade): string {
  switch (decade) {
    case "20s": return "men in their 20s"
    case "30s": return "men in their 30s"
    case "40s": return "men in their 40s"
    case "50s": return "men in their 50s"
    case "60s": return "men in their 60s"
    case "70s+": return "men aged 70 and over"
  }
}
```

**Step 4: Test**

Run: `pnpm test lib/__tests__/ed-prevalence-data.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/marketing/ed-prevalence-data.ts lib/__tests__/ed-prevalence-data.test.ts
git commit -m "feat(ed-landing): add prevalence data lookup by decade

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Build `EdPrevalenceCalculator` client component

**Files:**
- Create: `components/marketing/sections/ed-prevalence-calculator.tsx`

**Step 1: Build the component**

Client component with:
- Section heading: "How common is this?"
- Single age slider (shadcn `Slider`, range 18–80, default 40)
- Headline derived from `getPrevalenceForAge(age)`: e.g. "~22% of men in their 40s experience ED at least sometimes"
- Animated horizontal bar showing the rate (width = `rate%`), using framer-motion for the bar width spring
- Subline: "You're not alone — it's more common than most men think, and it's treatable."
- 2-line cardiovascular context below: "ED can be an early signal of heart or circulation issues. If this is new and you're over 40, worth mentioning to the doctor during your assessment."
- Footnote: "Rates from published community surveys, including the Massachusetts Male Aging Study. Illustrative only."
- PostHog event `ed_prevalence_age_changed` (debounced ~400ms, include `age` value)
- Primary CTA button "Start a discreet assessment" → `/request?service=consult&subtype=ed`, fires `ed_prevalence_cta_clicked`

Use solid-depth card pattern. Respect `useReducedMotion`.

**Step 2: Build**

Run: `pnpm build`

Expected: no errors.

**Step 3: Commit**

```bash
git add components/marketing/sections/ed-prevalence-calculator.tsx
git commit -m "feat(ed-landing): add prevalence calculator with age slider

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Build `EdMechanismExplainer` client component

**Files:**
- Create: `components/marketing/sections/ed-mechanism-explainer.tsx`

**Step 1: Build the component**

Scroll-triggered three-step animation explaining the physiological response to oral treatment at a class level. Uses framer-motion `useInView` + `useReducedMotion`.

Three frames:

1. **Baseline:** illustrated cross-section of a blood vessel (SVG, generic anatomical), minimal blood flow, labeled *"When arousal signals reach the body, the baseline response can be weaker than expected."*
2. **Treatment response:** smooth muscle relaxation animation, vessel dilation, labeled *"Oral treatment enhances the natural signal pathway — more blood flow to the area when you're aroused."*
3. **Duration:** timeline bar showing onset (~30–60 min) and duration (varies by treatment), labeled *"Different oral treatments have different onset and duration windows. A doctor decides which fits your pattern."*

Implementation notes:
- SVG illustrations inline in the component — no external image files.
- No pills, no packaging, no brand cues, no drug names anywhere in labels or alt text.
- Respect `useReducedMotion` — if reduced, show all three frames statically side-by-side instead of animating.
- Fire `ed_mechanism_viewed` PostHog event on `useInView` (once per page load).
- CTA button at the bottom → `/request?service=consult&subtype=ed`, fires `ed_mechanism_cta_clicked`.

**Step 2: Build**

Run: `pnpm build`

Expected: no errors.

**Step 3: Commit**

```bash
git add components/marketing/sections/ed-mechanism-explainer.tsx
git commit -m "feat(ed-landing): add mechanism explainer with scroll-triggered animation

Three-frame generic anatomical animation illustrating oral ED treatment
mechanism of action at the class level. No drug names, no pills, no
brand cues. Respects reduced-motion preference.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Build `EdOutcomesSection`, delete `EdLimitationsSection`

**Files:**
- Create: `components/marketing/sections/ed-outcomes-section.tsx`
- Delete: `components/marketing/sections/ed-limitations-section.tsx`
- Modify: `components/marketing/erectile-dysfunction-landing.tsx` (swap the import)

**Step 1: Build the new section**

Three-column layout, no animation, just layout + copy:

- **Column 1 "What treatment typically does":** restores function in the majority of patients, works in combination with sexual stimulation, safe for most healthy adults when screened appropriately
- **Column 2 "What it doesn't do":** not an aphrodisiac, doesn't create desire on its own, doesn't address underlying cardiovascular risk factors, isn't a substitute for addressing mental health or relationship stress when those are the driver
- **Column 3 "When it's not appropriate":** nitrate use, recent heart event, severe heart disease, certain eye conditions, significant liver/kidney disease. Closes with "The safety questionnaire screens for these, and the doctor confirms before prescribing."

TGA-compliant: no drug names, framed as population-level claims, clear contraindication language.

**Step 2: Swap in the landing page**

Read `components/marketing/erectile-dysfunction-landing.tsx`, find the `EDLimitationsSection` dynamic import and JSX usage, replace with `EdOutcomesSection`.

**Step 3: Delete the old component**

Delete `components/marketing/sections/ed-limitations-section.tsx`. Grep for any other references: `rg 'EDLimitationsSection|ed-limitations-section' app/ components/ lib/` — expected: zero results after this task.

**Step 4: Typecheck + build**

Run: `pnpm typecheck && pnpm build`

Expected: no errors.

**Step 5: Commit**

```bash
git add components/marketing/sections/ed-outcomes-section.tsx components/marketing/erectile-dysfunction-landing.tsx
git rm components/marketing/sections/ed-limitations-section.tsx
git commit -m "feat(ed-landing): replace EdLimitationsSection with balanced outcomes frame

Three-column what-it-does / what-it-doesnt / when-its-not-appropriate.
More honest framing than the doom list while keeping every
contraindication visible.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Expand `ed-guide-section.tsx`

**Files:**
- Modify: `components/marketing/sections/ed-guide-section.tsx`

**Step 1: Read the current structure**

The file was partially rewritten in Phase 1 (drug-name strip). Preserve all those rewrites. This task adds three new sub-sections on top.

**Step 2: Add three new sub-sections**

Append to the guide structure:

1. **"When ED is a signal of something bigger"** — one paragraph each on cardiovascular health, diabetes, testosterone, sleep apnea, stress and mental health. Link-text to internal blog articles where they exist: `/blog/ed-cardiovascular-link`, `/blog/ed-diabetes`, `/blog/ed-testosterone`, `/blog/ed-sleep-apnea`, `/blog/ed-mental-health`. If the article doesn't exist yet, use `#` as placeholder and add a TODO comment — do not invent URLs.

2. **"What to expect from a telehealth assessment"** — step-by-step walkthrough:
   - Step 1: Structured form (~5 minutes)
   - Step 2: Doctor review (most cases within 1–2 hours)
   - Step 3: Delivery via pharmacy eScript (same day possible)
   - Step 4: Discreet packaging, bank statement shows "InstantMed" only

3. **"Privacy and discretion — end to end"** — three paragraphs:
   - What the pharmacist sees (only the eScript, not your assessment)
   - What the bank statement says (`InstantMed`)
   - How the package arrives (plain pharmacy packaging)

**Step 3: Typecheck + re-verify no drug names**

```bash
pnpm typecheck
rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil' components/marketing/sections/ed-guide-section.tsx
```

Expected: no errors, zero drug-name matches.

**Step 4: Commit**

```bash
git add components/marketing/sections/ed-guide-section.tsx
git commit -m "feat(ed-landing): expand guide with cardiovascular, process, and privacy sections

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2C — New hair-loss sections

### Task 12: Build `hair-loss-hook-quiz` data + helper

**Files:**
- Create: `lib/marketing/hair-loss-hook-quiz.ts`
- Create: `lib/__tests__/hair-loss-hook-quiz.test.ts`

**Step 1: Write the failing test**

Create `lib/__tests__/hair-loss-hook-quiz.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  NORWOOD_STAGES,
  DURATION_BUCKETS,
  buildHairLossHookQuizResult,
  HAIR_LOSS_HOOK_QUIZ_KEY,
  getHairLossHookQuizReassurance,
  type NorwoodStage,
  type DurationBucket,
} from "@/lib/marketing/hair-loss-hook-quiz"

describe("NORWOOD_STAGES", () => {
  it("has exactly 7 stages numbered 1–7", () => {
    expect(NORWOOD_STAGES).toHaveLength(7)
    const numbers = NORWOOD_STAGES.map((s) => s.stage)
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("each stage has a non-empty label", () => {
    for (const s of NORWOOD_STAGES) {
      expect(s.label).toBeTruthy()
      expect(s.label.length).toBeGreaterThan(2)
    }
  })

  it("contains no drug names", () => {
    const drugRe = /viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil|propecia|rogaine/i
    for (const s of NORWOOD_STAGES) {
      expect(s.label).not.toMatch(drugRe)
      expect(s.description).not.toMatch(drugRe)
    }
  })
})

describe("DURATION_BUCKETS", () => {
  it("has exactly 4 buckets", () => {
    expect(DURATION_BUCKETS).toHaveLength(4)
  })
  it("matches the cross-phase contract ids", () => {
    const ids = DURATION_BUCKETS.map((b) => b.id)
    expect(ids).toEqual(["<6mo", "6-12mo", "1-3yr", "3yr+"])
  })
})

describe("buildHairLossHookQuizResult", () => {
  it("returns a valid result shape", () => {
    const result = buildHairLossHookQuizResult(3, "6-12mo")
    expect(result.norwood).toBe(3)
    expect(result.durationBucket).toBe("6-12mo")
    expect(result.completedAt).toBeTruthy()
  })

  it("exposes the sessionStorage key", () => {
    expect(HAIR_LOSS_HOOK_QUIZ_KEY).toBe("instantmed.hookQuiz.hair_loss.v1")
  })
})

describe("getHairLossHookQuizReassurance", () => {
  it.each([1, 2, 3, 4, 5, 6, 7] as NorwoodStage[])("returns copy for stage %i", (stage) => {
    const copy = getHairLossHookQuizReassurance(stage, "6-12mo")
    expect(copy).toBeTruthy()
    expect(copy.length).toBeGreaterThan(20)
  })

  it("never includes drug names", () => {
    const drugRe = /viagra|cialis|finasteride|minoxidil|propecia|rogaine/i
    for (const stage of [1, 2, 3, 4, 5, 6, 7] as NorwoodStage[]) {
      for (const dur of ["<6mo", "6-12mo", "1-3yr", "3yr+"] as DurationBucket[]) {
        expect(getHairLossHookQuizReassurance(stage, dur)).not.toMatch(drugRe)
      }
    }
  })
})
```

**Step 2: Run to verify failure**

Run: `pnpm test lib/__tests__/hair-loss-hook-quiz.test.ts`

Expected: FAIL.

**Step 3: Create the module**

Create `lib/marketing/hair-loss-hook-quiz.ts`:

```ts
export const HAIR_LOSS_HOOK_QUIZ_KEY = "instantmed.hookQuiz.hair_loss.v1"

export type NorwoodStage = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type DurationBucket = "<6mo" | "6-12mo" | "1-3yr" | "3yr+"

export interface HairLossHookQuizResult {
  norwood: NorwoodStage
  durationBucket: DurationBucket
  completedAt: string
}

interface NorwoodStageInfo {
  stage: NorwoodStage
  label: string
  description: string
}

export const NORWOOD_STAGES: NorwoodStageInfo[] = [
  { stage: 1, label: "Stage 1", description: "No significant recession." },
  { stage: 2, label: "Stage 2", description: "Slight hairline recession at the temples." },
  { stage: 3, label: "Stage 3", description: "Clear temple recession, some thinning at the crown." },
  { stage: 4, label: "Stage 4", description: "Deeper recession and an emerging bald spot at the crown." },
  { stage: 5, label: "Stage 5", description: "The front and crown areas are visibly bald and separated by a thinning strip." },
  { stage: 6, label: "Stage 6", description: "The thinning strip is mostly gone; front and crown have merged." },
  { stage: 7, label: "Stage 7", description: "Only a band of hair remains around the sides and back." },
]

interface DurationBucketInfo {
  id: DurationBucket
  label: string
}

export const DURATION_BUCKETS: DurationBucketInfo[] = [
  { id: "<6mo", label: "Less than 6 months" },
  { id: "6-12mo", label: "6–12 months" },
  { id: "1-3yr", label: "1–3 years" },
  { id: "3yr+", label: "More than 3 years" },
]

export function buildHairLossHookQuizResult(
  norwood: NorwoodStage,
  durationBucket: DurationBucket
): HairLossHookQuizResult {
  return {
    norwood,
    durationBucket,
    completedAt: new Date().toISOString(),
  }
}

export function getHairLossHookQuizReassurance(
  stage: NorwoodStage,
  duration: DurationBucket
): string {
  const earlyStage = stage <= 3
  const longDuration = duration === "1-3yr" || duration === "3yr+"

  if (earlyStage && !longDuration) {
    return "You're catching this early. Consistent treatment typically prevents further progression, and many patients see regrowth at this stage."
  }
  if (earlyStage && longDuration) {
    return "Early stage, but it's been a while — consistent treatment can still prevent progression and often drives some regrowth."
  }
  if (!earlyStage && !longDuration) {
    return "You're at a stage where treatment focus shifts toward preserving what's alive and stabilising progression. A doctor can assess what's realistic for you."
  }
  return "At this stage treatment is primarily about slowing further loss and protecting remaining follicles. A doctor can be honest about what's realistic."
}
```

**Step 4: Test**

Run: `pnpm test lib/__tests__/hair-loss-hook-quiz.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/marketing/hair-loss-hook-quiz.ts lib/__tests__/hair-loss-hook-quiz.test.ts
git commit -m "feat(hair-loss-landing): add hook-quiz data + reassurance copy by stage/duration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Build `HairLossHookQuiz` client component

**Files:**
- Create: `components/marketing/sections/hair-loss-hook-quiz.tsx`
- Create: `public/images/norwood/stage-1.svg` through `stage-7.svg` (seven files)

**Step 1: Source or create Norwood stage silhouettes**

Create seven simple SVG silhouettes at `public/images/norwood/stage-1.svg` through `stage-7.svg`. These should be top-down view head silhouettes showing progressively more visible scalp. Use public-domain medical illustration references if available, otherwise hand-author simple stylised SVGs using a single fill color that respects the brand palette (deep navy outline, ivory background). If building from scratch, the key visual distinction between stages is the receding hairline pattern — stage 1 has full coverage, stage 7 has only a horseshoe of hair around the sides and back.

**Acceptance:** seven SVG files that differ visibly from each other in the scalp area. They don't need to be clinically exact — they're a UX cue, not a diagnosis.

**Step 2: Build the client component**

Create `components/marketing/sections/hair-loss-hook-quiz.tsx`. Client component with:

1. Section heading: "How much progression are you seeing?"
2. Seven Norwood silhouette cards in a horizontal strip (tap to select). Use Next.js `<Image>` for the SVGs. Selected state gets a highlight ring.
3. Below the strip, a single-select question: "How long has this been happening?" with the four `DURATION_BUCKETS` as radio chips.
4. When both answered, animate quiz out and result in.
5. Result card: "Stage [N] at [duration]" heading, reassurance from `getHairLossHookQuizReassurance`, CTA button → `/request?service=consult&subtype=hair_loss`.
6. On completion, `sessionStorage.setItem(HAIR_LOSS_HOOK_QUIZ_KEY, JSON.stringify(result))`.
7. PostHog events: `hair_loss_hook_quiz_norwood_selected` (with `stage`), `hair_loss_hook_quiz_duration_selected` (with `duration`), `hair_loss_hook_quiz_completed`, `hair_loss_hook_quiz_cta_clicked`.

Respects `useReducedMotion`. No drug names anywhere.

**Step 3: Build**

Run: `pnpm build`

Expected: no errors.

**Step 4: Commit**

```bash
git add components/marketing/sections/hair-loss-hook-quiz.tsx public/images/norwood/
git commit -m "$(cat <<'EOF'
feat(hair-loss-landing): add interactive Norwood stage picker + duration hook quiz

Tap-to-select silhouette strip plus duration dropdown. Result card
shows stage-appropriate reassurance (early stages lean regrowth,
later stages lean preservation). Saves to sessionStorage under
instantmed.hookQuiz.hair_loss.v1 for the future Norwood-aware intake
step to pre-fill.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Build `HairLossProgressTimeline`

**Files:**
- Create: `components/marketing/sections/hair-loss-progress-timeline.tsx`

**Step 1: Build the component**

Client component with a scrubbable horizontal slider representing months 0–12, a single illustrated scalp SVG that morphs through density stages as the slider moves, and three milestone annotations at months 3, 6, and 12.

Implementation approach (lean — user directive "don't make the page heavier"):
- **Single SVG scalp** — do not ship 12 separate illustrations. Use one SVG with framer-motion `filter: blur()` + opacity tricks plus `motion.path` stroke density changes to represent density morph. Target bundle cost: under 20KB added.
- **Compact strip layout:** ~160px tall, full width on mobile, max 720px on desktop.
- **Milestone annotations:** three small labels above the slider track at 25%/50%/100%:
  - Month 3: "Shedding often stabilises."
  - Month 6: "Initial regrowth typically visible in mirror."
  - Month 12: "Full treatment window — most improvement is visible."
- **Slider control:** shadcn `Slider` with `min=0 max=12 step=1`, default position month 0.
- **Accessibility:** `aria-label="Treatment progress timeline"`, keyboard-navigable, value announced on change.
- **Respect `useReducedMotion`:** when reduced, show month 0, 6, and 12 as three static thumbnails in a row instead of the scrubbable slider.
- **PostHog events:** `hair_loss_timeline_scrubbed` (debounced 500ms, include `month`), `hair_loss_timeline_cta_clicked`.
- **CTA at the bottom:** "Start assessing your progress →" → `/request?service=consult&subtype=hair_loss`.

**Important:** no real patient photos, no before/after claims about specific individuals, no drug names. The illustration is generic.

**Step 2: Build**

Run: `pnpm build`

Expected: no errors.

**Step 3: Commit**

```bash
git add components/marketing/sections/hair-loss-progress-timeline.tsx
git commit -m "feat(hair-loss-landing): add scrubbable treatment-progress timeline

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: Build `HairLossFamilyHistoryStrip`

**Files:**
- Create: `components/marketing/sections/hair-loss-family-history-strip.tsx`

**Step 1: Build the component**

Thin, lean section. No interactive input. Single container card with:

- Heading: "Family history matters"
- Body: *"If a parent had hair loss at your age or earlier, your risk roughly doubles. Starting treatment while follicles are still alive preserves far more hair than waiting."*
- Primary CTA button: "Start your assessment" → `/request?service=consult&subtype=hair_loss`, fires `hair_loss_family_history_cta_clicked` PostHog event.

Single container, solid-depth card pattern. Optional subtle framer-motion fade-in on `useInView`, respects `useReducedMotion`.

**Step 2: Commit**

```bash
git add components/marketing/sections/hair-loss-family-history-strip.tsx
git commit -m "feat(hair-loss-landing): add lean family-history risk callout strip

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Expand `hair-loss-guide-section.tsx` with Norwood visualiser

**Files:**
- Modify: `components/marketing/sections/hair-loss-guide-section.tsx`

**Step 1: Read current structure**

Read the file to understand its existing shape. It's a collapsible guide section with paragraph content.

**Step 2: Add new sub-sections**

Extend the guide with five new sub-sections (per design doc 2.3.E):

1. **"Types of hair loss — what's treatable and what isn't"** — AGA (male and female), telogen effluvium, traction alopecia, scarring alopecias, autoimmune. Explicitly explain which are addressed by online assessment and which aren't.
2. **"The hair growth cycle explained"** — anagen, catagen, telogen; why treatments take 3+ months to show.
3. **"Typical treatment timeline"** — month-by-month expectations.
4. **"Side effects — honest version"** — rare but real, mental health + sexual function discussion, how to spot them early, how to talk to the doctor. No drug names.
5. **"If you stop treatment"** — rebound shedding, the maintenance nature of treatment.

**Step 3: Add the Norwood stage visualiser**

Inside the guide section (not a new top-level section), add a new collapsible subsection "Norwood stages at a glance". Seven tappable chips (`Stage 1` … `Stage 7`), each opens a small drawer showing `NORWOOD_STAGES[i].description` from `lib/marketing/hair-loss-hook-quiz.ts`. Import the constant, don't duplicate it.

**Step 4: Verify no drug names**

Run: `rg -i 'finasteride|minoxidil|propecia|rogaine|dht.block' components/marketing/sections/hair-loss-guide-section.tsx`

Expected: zero hits. Clinical terms like "androgenetic alopecia" and "telogen effluvium" are fine — they're condition names, not drug names.

**Step 5: Typecheck + commit**

```bash
pnpm typecheck
git add components/marketing/sections/hair-loss-guide-section.tsx
git commit -m "feat(hair-loss-landing): expand guide with five new sub-sections and Norwood visualiser

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2D — Landing page rebuilds

### Task 17: Rebuild `erectile-dysfunction-landing.tsx` with new section order

**Files:**
- Modify: `components/marketing/erectile-dysfunction-landing.tsx`

**Step 1: Read the current file fully**

Use Read to load all ~709 lines. Map the current section order and identify what's already wired up. Keep the hero, navbar, footer, and pricing/testimonials/doctor profile sections intact — the changes are additive at mid-page and below-fold.

**Step 2: Add new dynamic imports at the top**

Add (near the existing `dynamic()` imports):

```tsx
const EdHookQuiz = dynamic(
  () => import("@/components/marketing/sections/ed-hook-quiz").then((m) => m.EdHookQuiz),
  { loading: () => <div className="min-h-[500px]" />, ssr: false },
)
const EdPrevalenceCalculator = dynamic(
  () => import("@/components/marketing/sections/ed-prevalence-calculator").then((m) => m.EdPrevalenceCalculator),
  { loading: () => <div className="min-h-[400px]" /> },
)
const EdMechanismExplainer = dynamic(
  () => import("@/components/marketing/sections/ed-mechanism-explainer").then((m) => m.EdMechanismExplainer),
  { loading: () => <div className="min-h-[500px]" /> },
)
const EdOutcomesSection = dynamic(
  () => import("@/components/marketing/sections/ed-outcomes-section").then((m) => m.EdOutcomesSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
```

Remove the `EDLimitationsSection` dynamic import (the component was deleted in Task 10).

Add static imports for shared components:

```tsx
import { ContextualMessage } from "@/components/marketing/contextual-message"
import { AnimatedStat } from "@/components/marketing/animated-stat"
import { RecentReviewsTicker } from "@/components/marketing/recent-reviews-ticker"
```

**Step 3: Insert the new sections into the JSX tree**

Follow the final section order from the Context section above. Insert:

- `<EdHookQuiz />` immediately below the hero block
- A social-proof band using `<AnimatedStat>` + `<ContextualMessage service="ed" />` + `<RecentReviewsTicker format="anonymous" artifact="treatment" />` below the hook quiz
- `<LiveWaitTime service="consult-ed" variant="strip" />` inside or just below the hero's trust band
- `<EdPrevalenceCalculator />` after `HowItWorksSection`
- `<EdMechanismExplainer />` after the prevalence calculator
- `<EdOutcomesSection />` in place of where `<EDLimitationsSection />` used to be

**Step 4: Typecheck + build**

Run: `pnpm typecheck && pnpm build`

Expected: no errors.

**Step 5: Verify in preview**

Run `preview_start` if not running, then navigate to `/erectile-dysfunction`:

1. `preview_snapshot` — confirm the page structure: hero → hook quiz → social proof band → contextual message → how-it-works → prevalence calculator → mechanism explainer → guide → outcomes → doctor profile → pricing → testimonials → FAQ → final CTA → footer.
2. `preview_console_logs` and `preview_logs` — confirm zero errors.
3. `preview_click` the first hook quiz answer — confirm the quiz advances.
4. Scroll to the prevalence calculator, `preview_fill` or `preview_eval` to change the slider, confirm the bar updates.
5. `preview_screenshot` — capture the full page for the commit.

If anything is broken, read the source file, diagnose, fix, re-verify.

**Step 6: Commit**

```bash
git add components/marketing/erectile-dysfunction-landing.tsx
git commit -m "$(cat <<'EOF'
feat(ed-landing): integrate hook quiz, prevalence calculator, mechanism explainer

Rebuilds the ED landing page to match /medical-certificate quality.
Adds the new interactive sections (hook quiz above the fold, prevalence
calculator and mechanism explainer mid-page, outcomes section replacing
the limitations doom list). Ports shared ContextualMessage, AnimatedStat,
and RecentReviewsTicker components. Uses RecentReviewsTicker with
format="anonymous" to avoid shame-sensitive juxtaposition of names
and ED content.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Rebuild `hair-loss-landing.tsx` with new section order

**Files:**
- Modify: `components/marketing/hair-loss-landing.tsx`

**Step 1: Read the current file fully**

~833 lines. Map current structure.

**Step 2: Add new dynamic imports**

```tsx
const HairLossHookQuiz = dynamic(
  () => import("@/components/marketing/sections/hair-loss-hook-quiz").then((m) => m.HairLossHookQuiz),
  { loading: () => <div className="min-h-[500px]" />, ssr: false },
)
const HairLossProgressTimeline = dynamic(
  () => import("@/components/marketing/sections/hair-loss-progress-timeline").then((m) => m.HairLossProgressTimeline),
  { loading: () => <div className="min-h-[400px]" /> },
)
const HairLossFamilyHistoryStrip = dynamic(
  () => import("@/components/marketing/sections/hair-loss-family-history-strip").then((m) => m.HairLossFamilyHistoryStrip),
  { loading: () => <div className="min-h-[200px]" /> },
)
```

Static imports for shared components (same set as ED).

**Step 3: Insert new sections in the JSX tree**

- `<HairLossHookQuiz />` immediately below the hero
- Social proof band: `<AnimatedStat>` + `<ContextualMessage service="hair-loss" />` + `<RecentReviewsTicker format="named" artifact="treatment" />`
- `<LiveWaitTime service="consult-hair-loss" variant="strip" />` in the hero band
- `<HairLossProgressTimeline />` mid-page (before the guide)
- `<HairLossFamilyHistoryStrip />` after the guide, before the outcomes/pricing
- The expanded guide (with Norwood visualiser) already lives in `hair-loss-guide-section.tsx` — no JSX change needed here

**Step 4: Typecheck + build**

Run: `pnpm typecheck && pnpm build`

Expected: no errors.

**Step 5: Preview verification**

1. Navigate to `/hair-loss`
2. `preview_snapshot` + `preview_console_logs` + `preview_logs` — confirm structure and no errors
3. `preview_click` a Norwood stage in the hook quiz, select a duration, confirm the result card renders
4. `preview_eval` to scrub the progress timeline slider, confirm the illustration updates
5. `preview_screenshot` full page

**Step 6: Commit**

```bash
git add components/marketing/hair-loss-landing.tsx
git commit -m "$(cat <<'EOF'
feat(hair-loss-landing): integrate hook quiz, timeline, family history strip

Rebuilds the hair loss landing page to match /medical-certificate
quality. Hook quiz (Norwood picker + duration) above the fold,
scrubbable progress timeline mid-page, lean family-history strip
below the guide. Uses RecentReviewsTicker in named format — hair
loss is not shame-sensitive in the same way as ED.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2E — Subtype notifications + Stripe hardening

### Task 19: Subtype-aware service name resolver in checkout webhook

**Files:**
- Modify: `app/api/stripe/webhook/handlers/checkout-session-completed.ts`

**Step 1: Read the two `slugDisplayNames` sites**

Two hardcoded maps sit at lines ~630 and ~674. Both need the same treatment. Also check if Telegram notification passes `subtype` today — it currently takes `serviceSlug` but not subtype.

**Step 2: Extract a shared helper near the top of the file**

Just below the imports, add:

```ts
type ServiceDisplayNameInput = {
  serviceSlug?: string
  category?: string
  subtype?: string
}

function getServiceDisplayName(input: ServiceDisplayNameInput): string {
  const { serviceSlug = "", category = "", subtype = "" } = input

  if (category === "consult" || serviceSlug === "consult") {
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

  const slugDisplayNames: Record<string, string> = {
    "med-cert-sick": "Medical Certificate",
    "med-cert-carer": "Carers Certificate",
    "common-scripts": "Prescription",
    "consult": "Consultation",
  }
  return slugDisplayNames[serviceSlug] ?? "Medical Request"
}
```

**Step 3: Replace the two inline map sites**

At line ~636, replace:
```ts
const slugDisplayNames: Record<string, string> = { /* ... */ }
const serviceName = slugDisplayNames[session.metadata?.service_slug ?? ""] || "Medical Request"
```
with:
```ts
const serviceName = getServiceDisplayName({
  serviceSlug: session.metadata?.service_slug,
  category: session.metadata?.category,
  subtype: session.metadata?.subtype,
})
```

Do the same at line ~674 for the Telegram block, and pass the same resolved `serviceName` (or compute inside the block — either is fine, but avoid duplicating the lookup).

**Step 4: Verify Stripe metadata carries category + subtype**

The resolver reads `session.metadata?.category` and `session.metadata?.subtype`. Verify the upstream checkout session creation (search for `stripe.checkout.sessions.create` or `createCheckoutSession`) is passing these fields in metadata. If not, add them.

Run: `rg -l "checkout\.sessions\.create" lib/ app/`

Then read each hit and confirm `metadata: { intake_id, patient_id, service_slug, category, subtype, ... }` includes both. Add them if missing.

**Step 5: Run webhook tests**

Run: `pnpm test lib/__tests__/stripe-webhook.test.ts`

Expected: all pass. If any subtype-related test checks the old display name, update the test assertion.

**Step 6: Commit**

```bash
git add app/api/stripe/webhook/handlers/checkout-session-completed.ts
# plus any upstream checkout creation files touched
git commit -m "$(cat <<'EOF'
feat(webhook): subtype-aware service display name in patient + Telegram notifs

Replaces the two hardcoded slug→name maps in checkout-session-completed
with a single resolver that knows about consult subtypes. ED and hair
loss intakes now surface as "ED Consultation" / "Hair Loss Consultation"
in the patient confirmation email subject and the doctor Telegram
notification — not just "Consultation".

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Doctor queue shows subtype chip

**Files:**
- Modify: `app/doctor/intakes/page.tsx` (or wherever the queue list renders)

**Step 1: Find the queue list component**

Run: `rg -l "doctor/intakes" app/doctor/ | head -5` and read `app/doctor/intakes/page.tsx`.

Identify the queue list row component. Find where it renders the service name / category.

**Step 2: Add a subtype chip**

If the row already reads `intake.consult_subtype` or `intake.subtype`, add a small chip/badge next to the service name. Use shadcn `<Badge variant="secondary">` or equivalent. Show:
- `ED` for `consult_subtype === "ed"`
- `Hair Loss` for `consult_subtype === "hair_loss"`
- `Women's Health` for `"womens_health"`
- `Weight Loss` for `"weight_loss"`
- Hide the chip entirely for `general` / null

Keep the chip visually lightweight — it's a scanning aid, not a primary label.

**Step 3: Typecheck + build**

Run: `pnpm typecheck && pnpm build`

Expected: no errors.

**Step 4: Commit**

```bash
git add app/doctor/intakes/page.tsx
git commit -m "feat(doctor-queue): surface consult subtype chip in queue list

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 21: Harden `lib/stripe/price-mapping.ts` to fail loud in prod

**Files:**
- Modify: `lib/stripe/price-mapping.ts`
- Modify: `lib/__tests__/price-mapping.test.ts` (add a test for the new behavior)

**Step 1: Write the failing test**

Read the existing `lib/__tests__/price-mapping.test.ts` to understand the test style. Add these cases:

```ts
describe("getConsultPriceId — production hard-fail on missing subtype env var", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV
  const ORIGINAL_ED = process.env.STRIPE_PRICE_CONSULT_ED

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    if (ORIGINAL_ED === undefined) delete process.env.STRIPE_PRICE_CONSULT_ED
    else process.env.STRIPE_PRICE_CONSULT_ED = ORIGINAL_ED
  })

  it("throws in production when subtype env var is missing", () => {
    process.env.NODE_ENV = "production"
    delete process.env.STRIPE_PRICE_CONSULT_ED
    process.env.STRIPE_PRICE_CONSULT = "price_fallback_generic"

    expect(() => getConsultPriceId("ed")).toThrow(/STRIPE_PRICE_CONSULT_ED/)
  })

  it("falls back to generic consult price in development", () => {
    process.env.NODE_ENV = "development"
    delete process.env.STRIPE_PRICE_CONSULT_ED
    process.env.STRIPE_PRICE_CONSULT = "price_fallback_generic"

    expect(getConsultPriceId("ed")).toBe("price_fallback_generic")
  })
})
```

**Step 2: Run to verify failure**

Run: `pnpm test lib/__tests__/price-mapping.test.ts`

Expected: the new "throws in production" test FAILS — current code silently warns and returns the default.

**Step 3: Modify `price-mapping.ts`**

Change lines ~97–102 from:

```ts
// Log warning if subtype doesn't have a specific price
if (subtype && subtype !== 'general') {
  logger.warn("No specific price for consult subtype, using default", { subtype })
}

return defaultPriceId
```

to:

```ts
// Hard fail in production — mischarging a customer is worse than a 500
if (subtype && subtype !== 'general') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing Stripe price env var for consult subtype '${subtype}'. ` +
      `Expected STRIPE_PRICE_CONSULT_${subtype.toUpperCase()} ` +
      `(one of: STRIPE_PRICE_CONSULT_ED, STRIPE_PRICE_CONSULT_HAIR_LOSS, ` +
      `STRIPE_PRICE_CONSULT_WOMENS_HEALTH, STRIPE_PRICE_CONSULT_WEIGHT_LOSS).`
    )
  }
  logger.warn("No specific price for consult subtype, using default (dev/test only)", { subtype })
}

return defaultPriceId
```

**Step 4: Run the test**

Run: `pnpm test lib/__tests__/price-mapping.test.ts`

Expected: all tests PASS, including the new hard-fail case.

**Step 5: Update `.env.example`**

Read `.env.example`. Verify the four subtype env vars are present and have comments explaining they're required in production:

```bash
# Stripe price IDs — consult subtypes (REQUIRED in production)
STRIPE_PRICE_CONSULT_ED=price_...
STRIPE_PRICE_CONSULT_HAIR_LOSS=price_...
STRIPE_PRICE_CONSULT_WOMENS_HEALTH=price_...
STRIPE_PRICE_CONSULT_WEIGHT_LOSS=price_...
```

If any are missing, add them.

**Step 6: Update `OPERATIONS.md`**

Read `OPERATIONS.md`. In the required environment variables section, add a note under the Stripe price IDs group:

> Consult subtype prices (`STRIPE_PRICE_CONSULT_ED`, `STRIPE_PRICE_CONSULT_HAIR_LOSS`, etc.) are hard-validated in production by `lib/stripe/price-mapping.ts` — a missing env var causes a thrown error at checkout rather than a silent fallback to the generic consult price. This is intentional: mischarging a customer is worse than a 500.

**Step 7: Run the full unit suite + build**

Run: `pnpm test && pnpm build`

Expected: all green.

**Step 8: Commit**

```bash
git add lib/stripe/price-mapping.ts lib/__tests__/price-mapping.test.ts .env.example OPERATIONS.md
git commit -m "$(cat <<'EOF'
fix(stripe): hard-fail in prod on missing consult subtype price env var

Previously a missing STRIPE_PRICE_CONSULT_ED or
STRIPE_PRICE_CONSULT_HAIR_LOSS silently fell back to the generic
STRIPE_PRICE_CONSULT (which is $49.95 — same as ED and hair loss
today, but would mischarge if the subtype prices ever diverge).

Production now throws with a clear error naming the missing env var.
Development keeps the warn-and-fallback behavior so local setup isn't
painful. env.ts already validates all four subtype price vars at boot
in production, so this is a belt-and-braces check.

Adds a regression test covering both NODE_ENV branches.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Done criteria for Phase 2

- [ ] All 21 tasks committed individually
- [ ] `pnpm test` passes (all unit tests, including new ones for contextual-messages, review-ticker-data, ed-hook-quiz, ed-prevalence-data, hair-loss-hook-quiz, price-mapping)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine' components/marketing/ lib/marketing/ lib/data/` returns zero real hits
- [ ] Preview verification: `/erectile-dysfunction` renders with hook quiz, prevalence calculator, mechanism explainer, outcomes section, and all existing sections — no console errors
- [ ] Preview verification: `/hair-loss` renders with hook quiz, progress timeline, family history strip, expanded guide, and all existing sections — no console errors
- [ ] Doctor queue (`/doctor/intakes`) shows ED / Hair Loss chip next to relevant rows
- [ ] `app/api/stripe/webhook/handlers/checkout-session-completed.ts` uses `getServiceDisplayName` helper in both notification sites
- [ ] `lib/stripe/price-mapping.ts` throws in prod on missing subtype env var, warns in dev
- [ ] `sessionStorage` contract: open `/erectile-dysfunction`, complete the hook quiz, open devtools, confirm `instantmed.hookQuiz.ed.v1` is set with the correct shape. Same for `/hair-loss`.

## Notes for the executor

- **This plan is long because the scope is broad.** It's deliberately broken into 21 bite-sized tasks so each is independently committable and reviewable. Don't try to batch them.
- **Phase 2A extractions must land before Phase 2B/2C sections use them.** If a subagent is executing out of order, make sure 2A is complete first.
- **The landing page rebuild tasks (17, 18) depend on every earlier task in Phase 2.** Do not start them until all earlier tasks are committed.
- **Stripe hardening (21) is independent of everything else** and can be done at any point in Phase 2. If you're looking for a quick win while another task is blocked, do this one.
- **If a subagent can't source Norwood silhouettes in Task 13**, use placeholder SVGs (simple filled circles with varying clip paths) and file a TODO comment pointing to the commission/sourcing need. Don't block the whole phase on asset acquisition.
