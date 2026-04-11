# Homepage Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the homepage for Google Ads launch — replace certificate-mill hero, add service card features, upgrade social proof, fix FAQ double-container bug, remove contextually wrong employer logos.

**Architecture:** 5 independent changes. New `HeroMultiServiceMockup` replaces the single cert card. Service cards get green checkmark benefits. Social proof becomes a bento grid with animated numbers. New `FAQSection` component with clean divider style replaces `AccordionSection` on landing pages. Employer logos removed from homepage only.

**Tech Stack:** React 18, Framer Motion 11, Tailwind v4, NumberFlow (already installed), shadcn Accordion (Radix), Lucide icons.

---

## Task 1: Hero Multi-Service Mockup

**Files:**
- Create: `components/marketing/hero-multi-service-mockup.tsx`
- Modify: `components/marketing/hero.tsx`

**Step 1: Create `HeroMultiServiceMockup`**

Create `components/marketing/hero-multi-service-mockup.tsx`. This replaces the single med cert card with 3 stacked outcome cards (treatment plan, eScript, certificate) to communicate service breadth.

```tsx
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { FileText, CheckCircle2, Pill, Stethoscope, Smartphone, ShieldCheck } from "lucide-react"

export function HeroMultiServiceMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80 h-[320px]">
      {/* Card 1 (back): Treatment Plan — violet */}
      <motion.div
        className="absolute top-0 left-3 right-0 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-4 space-y-3"
        initial={animate ? { y: 30, opacity: 0, rotate: 2 } : {}}
        animate={{ y: 0, opacity: 1, rotate: 2 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-semibold text-foreground">Treatment Plan</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Doctor-reviewed
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted/40 w-3/4" />
          <div className="h-2 rounded-full bg-muted/40 w-1/2" />
          <div className="h-2 rounded-full bg-muted/40 w-2/3" />
        </div>
      </motion.div>

      {/* Card 2 (middle): eScript — cyan */}
      <motion.div
        className="absolute top-16 -left-1 right-2 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-4 space-y-3 z-10"
        initial={animate ? { y: 30, opacity: 0, rotate: -1 } : {}}
        animate={{ y: 0, opacity: 1, rotate: -1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
              <Pill className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-foreground">eScript</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-[10px] font-semibold">
            <Smartphone className="h-2.5 w-2.5" />
            Sent to phone
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini QR placeholder */}
          <div className="w-10 h-10 rounded-md bg-muted/30 dark:bg-muted/15 border border-border/30 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-0.5 w-5 h-5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-[1px] ${[0,2,3,6,8].includes(i) ? 'bg-foreground/60' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
          <div className="space-y-1 flex-1">
            <div className="h-2 rounded-full bg-muted/40 w-full" />
            <div className="h-2 rounded-full bg-muted/40 w-2/3" />
          </div>
        </div>
      </motion.div>

      {/* Card 3 (front): Certificate Approved — green */}
      <motion.div
        className="absolute top-36 left-1 right-1 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none p-4 space-y-3 z-20"
        initial={animate ? { y: 30, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-foreground">Medical Certificate</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Approved
          </div>
        </div>
        <div className="rounded-lg border border-border/30 bg-muted/15 dark:bg-muted/10 p-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10 shrink-0">Status</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Reviewed & issued</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10 shrink-0">Sent</span>
            <span className="text-[10px] text-foreground/70">Just now</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>AHPRA-registered doctor</span>
        </div>
      </motion.div>
    </div>
  )
}
```

**Step 2: Swap mockup in hero**

Edit `components/marketing/hero.tsx`:
- Change import from `HeroOutcomeMockup` to `HeroMultiServiceMockup`
- Replace `<HeroOutcomeMockup />` with `<HeroMultiServiceMockup />`

```diff
- import { HeroOutcomeMockup } from '@/components/marketing/hero-outcome-mockup'
+ import { HeroMultiServiceMockup } from '@/components/marketing/hero-multi-service-mockup'
```

```diff
          <div className="hidden lg:block relative shrink-0 mt-0">
-           <HeroOutcomeMockup />
+           <HeroMultiServiceMockup />
          </div>
```

**Step 3: Add approval card to med cert landing page**

Edit `components/marketing/med-cert-landing.tsx`:
- Add import: `import { HeroOutcomeMockup } from '@/components/marketing/hero-outcome-mockup'`
- Add a new section between `HowItWorksSection` (section 4) and `SocialProofStrip` (section 5):

```tsx
          {/* 4b. Outcome preview — what you'll receive */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-4">
                    Here&apos;s what you&apos;ll get
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                    Your doctor reviews the request and issues a valid medical certificate. It&apos;s sent straight to your inbox as a secure PDF — accepted by all Australian employers and universities.
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      "Employer-accepted PDF certificate",
                      "AHPRA-registered doctor on every cert",
                      "Delivered to your inbox same day",
                      "Verifiable via our online portal",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0">
                  <HeroOutcomeMockup />
                </div>
              </div>
            </div>
          </section>
```

Insert this after `<HowItWorksSection onCTAClick={handleHowItWorksCTA} />` and before `<SocialProofStrip />`.

**Step 4: Verify build**

Run: `pnpm typecheck`
Expected: No type errors.

**Step 5: Commit**

```bash
git add components/marketing/hero-multi-service-mockup.tsx components/marketing/hero.tsx components/marketing/med-cert-landing.tsx
git commit -m "feat(hero): multi-service outcome cards, relocate cert mockup to med-cert page"
```

---

## Task 2: Service Cards — Feature Checkmarks

**Files:**
- Modify: `components/marketing/service-cards.tsx`

**Step 1: Add benefits to `ServiceCard`**

Edit the `ServiceCard` component. Between the description `<p>` and the CTA button, add a benefits list. The `service.benefits` array already exists in the data (`lib/marketing/homepage.ts`).

Add the `Check` import at the top:
```diff
- import { ArrowRight, AlertCircle } from 'lucide-react'
+ import { ArrowRight, AlertCircle, Check } from 'lucide-react'
```

Replace the description paragraph with description + benefits:

```tsx
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {service.description}
          </p>

          {/* Feature checkmarks */}
          {service.benefits && (
            <ul className="space-y-1.5 mb-4 flex-1">
              {service.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}
```

Remove the `flex-1` from the description `<p>` (move it to the `<ul>`).

**Step 2: Add benefits to `ComingSoonCard`**

Same pattern inside `ComingSoonCard`. Also refine the grey treatment:
- Add `grayscale` to the icon: `<ServiceIconTile ... className="mb-4 grayscale opacity-60" />`
- Keep `opacity-75` on the outer card

Add benefits rendering between description and waitlist CTA:

```tsx
          {/* Feature checkmarks */}
          {service.benefits && (
            <ul className="space-y-1.5 mb-4 flex-1">
              {service.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground/70">
                  <Check className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}
```

Note: Coming soon cards use muted check color (`text-muted-foreground/40`) instead of green.

**Step 3: Verify build**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add components/marketing/service-cards.tsx
git commit -m "feat(service-cards): add feature checkmarks, refine coming-soon styling"
```

---

## Task 3: Remove Employer Logos from Homepage

**Files:**
- Modify: `app/page.tsx`

**Step 1: Remove the import and usage**

Edit `app/page.tsx`:

Remove the import:
```diff
- import { EmployerLogoMarquee } from '@/components/shared/employer-logo-marquee'
```

Remove the usage (around line 141-142):
```diff
-        {/* 2b. Employer logo marquee — trust signal */}
-        <EmployerLogoMarquee className="border-y border-border/30 dark:border-white/10 bg-muted/20 py-8" />
```

**Step 2: Verify build**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "fix(homepage): remove employer logos (only relevant to med-cert page)"
```

---

## Task 4: Social Proof Bento Grid

**Files:**
- Modify: `components/marketing/social-proof-section.tsx`

**Step 1: Rewrite stats section to bento grid**

Replace the flat stats row in `SocialProofSection` with a 2x2 bento grid. Keep the testimonials below unchanged.

The full rewritten component:

```tsx
'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Users, Star, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { getTestimonialsForColumns } from '@/lib/data/testimonials'
import { AnimatedStat } from '@/components/marketing/animated-stat'

const bentoStats = [
  {
    icon: Users,
    value: getPatientCount(),
    suffix: '+',
    label: 'Australians helped',
    tint: 'bg-primary/5 dark:bg-primary/10',
    iconColor: 'text-primary',
    decimals: 0,
  },
  {
    icon: Star,
    value: SOCIAL_PROOF.averageRating,
    suffix: '/5',
    label: 'patient rating',
    tint: 'bg-amber-50 dark:bg-amber-950/20',
    iconColor: 'text-amber-500',
    decimals: 1,
  },
  {
    icon: Clock,
    value: SOCIAL_PROOF.sameDayDeliveryPercent,
    suffix: '%',
    label: 'delivered same day',
    tint: 'bg-blue-50 dark:bg-blue-950/20',
    iconColor: 'text-blue-500',
    decimals: 0,
  },
  {
    icon: ShieldCheck,
    value: 100,
    suffix: '%',
    label: 'AHPRA-registered doctors',
    tint: 'bg-emerald-50 dark:bg-emerald-950/20',
    iconColor: 'text-emerald-600',
    decimals: 0,
  },
]

export function SocialProofSection() {
  const prefersReducedMotion = useReducedMotion()
  const reviews = getTestimonialsForColumns().slice(0, 6)

  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Trusted by Australians
          </h2>
          <p className="text-sm text-muted-foreground">
            Real reviews from real patients.
          </p>
        </motion.div>

        {/* Bento grid stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
          {bentoStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={cn(
                'rounded-xl p-4 sm:p-5 relative overflow-hidden',
                stat.tint,
                'border border-border/20 dark:border-white/5',
              )}
              initial={prefersReducedMotion ? {} : { y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <stat.icon className={cn('w-4 h-4 mb-2', stat.iconColor)} />
              <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-none mb-1">
                <AnimatedStat value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <TestimonialsColumnsWrapper
          testimonials={reviews}
          title=""
          subtitle=""
          badgeText=""
          className="py-0 my-0"
        />

        <p className="text-xs text-muted-foreground text-center mt-6">
          Individual experiences may vary. All requests are subject to doctor assessment.
        </p>
      </div>
    </section>
  )
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add components/marketing/social-proof-section.tsx
git commit -m "feat(social-proof): bento grid with animated stat numbers"
```

---

## Task 5: FAQ Section Component + Homepage Migration

**Files:**
- Create: `components/sections/faq-section.tsx`
- Modify: `components/sections/index.ts`
- Modify: `app/page.tsx`

**Step 1: Create `FAQSection` component**

Create `components/sections/faq-section.tsx`. This is a clean, flat FAQ section with divider-separated rows (no card borders per item). For landing pages with flat FAQ lists.

```tsx
"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SectionHeader } from "./section-header"
import { useReducedMotion } from "@/components/ui/motion"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  id?: string
  pill?: string
  title?: string
  subtitle?: string
  items: readonly FAQItem[]
  className?: string
  /** Callback when an item is opened — receives question text and index */
  onFAQOpen?: (question: string, index: number) => void
}

export function FAQSection({
  id = "faq",
  pill,
  title = "Common questions",
  subtitle,
  items,
  className,
  onFAQOpen,
}: FAQSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id={id} className={cn("py-16 lg:py-24 scroll-mt-20", className)}>
      {title && (
        <SectionHeader pill={pill} title={title} subtitle={subtitle} />
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Accordion
          type="single"
          collapsible
          onValueChange={(value) => {
            if (value && onFAQOpen) {
              const idx = parseInt(value, 10)
              if (!isNaN(idx)) onFAQOpen(items[idx]?.question ?? "", idx)
            }
          }}
        >
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={animate ? { y: 6 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <AccordionItem
                value={index.toString()}
                className="border-b border-border/40 last:border-b-0"
              >
                <AccordionTrigger className="py-5 text-left text-sm font-medium text-foreground hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
```

**Step 2: Export from index**

Edit `components/sections/index.ts` — add:

```diff
+ export { FAQSection } from "./faq-section";
```

**Step 3: Migrate homepage FAQ**

Edit `app/page.tsx`:

Remove the `AccordionSection` import and `faqGroups` transform. Switch to `FAQSection`.

```diff
- import { AccordionSection } from '@/components/sections'
+ import { FAQSection } from '@/components/sections'
```

Remove the `faqGroups` const (lines ~68-76):
```diff
- const faqGroups = [
-   {
-     items: faqItems.map(item => ({
-       question: item.question,
-       answer: item.answer,
-     })),
-   },
- ]
```

Replace the FAQ render:
```diff
-        <AccordionSection
-          id="faq"
-          pill="FAQ"
-          title="Common questions"
-          subtitle="Everything you need to know about our service."
-          groups={faqGroups}
-        />
+        <FAQSection
+          pill="FAQ"
+          title="Common questions"
+          subtitle="Everything you need to know about our service."
+          items={faqItems}
+        />
```

**Step 4: Verify build**

Run: `pnpm typecheck`

**Step 5: Commit**

```bash
git add components/sections/faq-section.tsx components/sections/index.ts app/page.tsx
git commit -m "feat(faq): new FAQSection component, migrate homepage FAQ"
```

---

## Task 6: Migrate Remaining Landing Pages to FAQSection

**Files:**
- Modify: `app/trust/trust-client.tsx`
- Modify: `app/about/about-client.tsx`

These two pages use `AccordionSection` with grouped FAQs rendered as flat lists. Assess each:

**Step 1: Audit trust page FAQ**

Read `app/trust/trust-client.tsx` around line 377. Check if the FAQ is truly grouped (multi-category) or flat (single group). If single group, migrate to `FAQSection`. If multi-category, keep `AccordionSection` but note it for future consideration.

**Step 2: Audit about page FAQ**

Same check for `app/about/about-client.tsx` around line 143.

**Step 3: Migrate any flat-list pages**

For pages where the FAQ is a single group:
- Replace `AccordionSection` import with `FAQSection`
- Convert `groups` prop to `items` prop (unwrap from the single-group array)

For pages with real category grouping: leave on `AccordionSection` — it handles that correctly.

**Step 4: Verify build**

Run: `pnpm typecheck`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(faq): migrate trust/about landing pages to FAQSection where applicable"
```

---

## Task 7: Final Verification

**Step 1: Full build check**

Run: `pnpm build`
Expected: Clean build, no errors.

**Step 2: Visual verification**

Start dev server and verify each changed section:
- Homepage hero shows 3 stacked service cards (desktop)
- Service cards section shows 3 green checkmarks per card
- Coming soon cards are greyed with muted checkmarks
- No employer logo marquee on homepage
- Social proof shows 2x2 bento grid with animated numbers
- FAQ expands cleanly with dividers, no double-container
- Med cert page shows the approval mockup after How It Works

**Step 3: Final commit (if any adjustments)**

```bash
git commit -m "chore: homepage polish final adjustments"
```
