# Prescriptions & General Consult Bespoke Landing Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generic/unpolished landing pages at `/prescriptions` and `/general-consult` with bespoke, high-conversion pages matching the quality of `/medical-certificate`'s `MedCertLanding`.

**Architecture:** Each page gets its own `"use client"` orchestrator component with lazy-loaded below-fold sections, a Tailwind-rendered hero phone mockup, animated social proof stats, service-specific content sections, and full conversion infrastructure (sticky CTAs, exit-intent overlay, analytics hooks). Shared components (`PricingSection`, `TestimonialsSection`, `DoctorProfileSection`) are reused via props. Service-specific sections (eScript explainer, medications grid, common concerns, specialised consults) are new components.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, Framer Motion, lucide-react, PostHog analytics via `useLandingAnalytics`

**Design doc:** `docs/plans/2026-03-31-prescriptions-consult-landing-pages-design.md`

**Key reference files:**
- Gold standard: `components/marketing/med-cert-landing.tsx` (orchestrator pattern)
- Hero mockup pattern: `components/marketing/mockups/med-cert-hero-mockup.tsx`
- Analytics hook: `hooks/use-landing-analytics.ts`
- Pricing: `lib/constants.ts` (`PRICING`, `PRICING_DISPLAY`)
- Social proof: `lib/social-proof.ts` (`SOCIAL_PROOF`, `SOCIAL_PROOF_DISPLAY`)
- Testimonials: `lib/data/testimonials.ts` (`getTestimonialsByService`, `getTestimonialsForColumns`)
- Existing funnel configs (content source): `lib/marketing/service-funnel-configs.ts`
- Existing section components: `components/marketing/sections/*.tsx`
- FAQ pattern: `lib/data/med-cert-faq.ts`
- Shared components: `MarketingPageShell`, `ReturningPatientBanner`, `Navbar`, `MarketingFooter`, `DoctorAvailabilityPill`, `RotatingText`, `MagneticButton`, `LiveWaitTime`, `RegulatoryPartners`, `ExitIntentOverlay`

**Conventions:**
- `"use client"` at top for client components
- `@/` path alias for all imports
- `cn()` from `lib/utils` for conditional classes
- `useReducedMotion()` — always respect; use `initial={animate ? { ... } : {}}` pattern
- Framer Motion `motion` for animations, 200-500ms, ease-out, no bounce
- Card surfaces: `bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]`
- No `console.log` — ESLint errors on `no-console`

---

## Task 1: Create Prescription FAQ Data

**Files:**
- Create: `lib/data/prescription-faq.ts`

**Step 1: Create the FAQ data file**

```typescript
// lib/data/prescription-faq.ts
/**
 * Single source of truth for prescription FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const PRESCRIPTION_FAQ = [
  {
    question: "What medications can you prescribe?",
    answer:
      "We can prescribe most common repeat medications — blood pressure, cholesterol, contraceptives, asthma inhalers, reflux, thyroid, and more. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines.",
  },
  {
    question: "Is the eScript accepted at any pharmacy?",
    answer:
      "Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they'll scan it directly — no paper needed.",
  },
  {
    question: "Do I need a previous prescription?",
    answer:
      "This service is for medications you've already been prescribed. If you need a new medication, our general consult service is more appropriate.",
  },
  {
    question: "Will my PBS subsidies still apply?",
    answer:
      "Yes. If your medication is listed on the PBS, you'll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost.",
  },
  {
    question: "What if the doctor can't prescribe my medication?",
    answer:
      "If your medication isn't suitable for online prescribing (e.g. you need blood tests first), we'll explain why and refund your payment in full.",
  },
  {
    question: "How do I receive the eScript?",
    answer:
      "Once the doctor approves your request, an eScript token is sent via SMS to your phone number. You can present it at any pharmacy to collect your medication.",
  },
  {
    question: "Can I get repeats?",
    answer:
      "Yes — where clinically appropriate, the doctor will include repeats on your prescription. The number of repeats depends on the medication and your situation.",
  },
]
```

**Step 2: Commit**

```bash
git add lib/data/prescription-faq.ts
git commit -m "feat: add prescription FAQ data for landing page and schema"
```

---

## Task 2: Create Consult FAQ Data

**Files:**
- Create: `lib/data/consult-faq.ts`

**Step 1: Create the FAQ data file**

```typescript
// lib/data/consult-faq.ts
/**
 * Single source of truth for general consult FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const CONSULT_FAQ = [
  {
    question: "Will the doctor call me?",
    answer:
      "For most general consults, yes. The doctor will review your questionnaire first, then call to discuss your symptoms. Keep your phone nearby after submitting.",
  },
  {
    question: "Can I get a prescription from a consult?",
    answer:
      "Yes. If the doctor determines medication is clinically appropriate, they'll send an eScript to your phone. You can collect it at any pharmacy.",
  },
  {
    question: "What about referrals and pathology?",
    answer:
      "The doctor can provide referral letters and pathology requests if they believe further investigation is needed. These are included in your consultation fee.",
  },
  {
    question: "How is this different from a GP visit?",
    answer:
      "You get the same quality of care from an AHPRA-registered GP — just without the waiting room. The main limitation is the doctor can't physically examine you, so some conditions may still need an in-person visit.",
  },
  {
    question: "What if my issue needs in-person care?",
    answer:
      "If the doctor determines your concern requires a physical examination, they'll let you know and recommend seeing a GP in person. You'll receive a full refund.",
  },
  {
    question: "What can I consult about?",
    answer:
      "Most non-urgent health concerns including skin conditions, minor infections, cold/flu symptoms, allergies, mental health check-ins, and requests for new medications or treatment advice.",
  },
  {
    question: "How long does the consultation take?",
    answer:
      "Most consults are completed within 2 hours of submission. The doctor may call for 5-15 minutes depending on the complexity of your concern.",
  },
]
```

**Step 2: Commit**

```bash
git add lib/data/consult-faq.ts
git commit -m "feat: add consult FAQ data for landing page and schema"
```

---

## Task 3: Create eScript Hero Mockup

**Files:**
- Create: `components/marketing/mockups/escript-hero-mockup.tsx`

**Step 1: Create the mockup component**

Follow the exact pattern of `components/marketing/mockups/med-cert-hero-mockup.tsx` — Tailwind-rendered card (not an image), with `compact` prop for mobile, Framer Motion entrance animations, `useReducedMotion` respected.

The mockup should render a phone-style card showing:
- Header: pill icon + "eScript Ready"
- SMS notification area: "Your eScript is ready" message with a token link placeholder
- Pharmacy instruction: "Show this at any pharmacy to collect your medication"
- Floating badges (desktop only): "Sent via SMS" (top-right), "Any pharmacy" (top-left)
- Progress timeline overlay (desktop only): "Request submitted" → "Doctor reviewed" → "eScript sent" with checkmarks and timestamps

```typescript
// components/marketing/mockups/escript-hero-mockup.tsx
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Pill, Clock, CheckCircle2, Smartphone, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface EScriptHeroMockupProps {
  compact?: boolean
}

export function EScriptHeroMockup({ compact = false }: EScriptHeroMockupProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className={cn("relative", compact ? "w-full" : "w-72 xl:w-80")}>
      {/* Main SMS card */}
      <motion.div
        className={cn(
          "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none space-y-4",
          compact ? "p-4" : "p-5"
        )}
        initial={animate ? { opacity: 0, y: 20 } : {}}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Pill className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">eScript Ready</span>
        </div>

        {/* SMS notification */}
        <div className="rounded-xl bg-muted/50 dark:bg-muted/20 border border-border/50 p-3.5 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">SMS from InstantMed</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Your eScript is ready. Show this at any pharmacy to collect your medication.
          </p>
          <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
            <span className="underline">escript.health/tk-2847-x</span>
          </div>
        </div>

        {/* Pharmacy instruction */}
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-success shrink-0" />
          <span>Works at any pharmacy in Australia</span>
        </div>

        {/* Sent via SMS badge — top-right, desktop only */}
        {!compact && (
          <motion.div
            className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            initial={animate ? { opacity: 0, scale: 0.8 } : {}}
            whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
          >
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            Sent via SMS
          </motion.div>
        )}

        {/* Any pharmacy badge — top-left, desktop only */}
        {!compact && (
          <motion.div
            className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            initial={animate ? { opacity: 0, scale: 0.8 } : {}}
            whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.65, ease: "easeOut" }}
          >
            <MapPin className="w-3.5 h-3.5 text-success" />
            Any pharmacy
          </motion.div>
        )}
      </motion.div>

      {/* Progress timeline — desktop only */}
      {!compact && (
        <motion.div
          className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[210px]"
          initial={animate ? { opacity: 0, x: 20 } : {}}
          whileInView={animate ? { opacity: 1, x: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="space-y-2"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: animate ? 0.2 : 0, delayChildren: animate ? 0.3 : 0 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: CheckCircle2, text: "Request submitted", time: "5m ago", done: true },
              { icon: CheckCircle2, text: "Doctor reviewed", time: "Just now", done: true },
              { icon: Smartphone, text: "eScript sent", badge: "Done", done: true },
            ].map((step) => (
              <motion.div
                key={step.text}
                className="flex items-center gap-2"
                variants={animate
                  ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
                  : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
                }
              >
                <step.icon className={cn("w-3.5 h-3.5 shrink-0", step.badge ? "text-primary" : "text-success")} />
                <span className={cn("text-[11px]", step.badge ? "font-medium text-foreground" : "text-foreground/60")}>{step.text}</span>
                {step.badge ? (
                  <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-success/10 text-[9px] font-medium text-success">
                    {step.badge}
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground ml-auto">{step.time}</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketing/mockups/escript-hero-mockup.tsx
git commit -m "feat: add eScript hero mockup for prescriptions landing"
```

---

## Task 4: Create Consult Chat Hero Mockup

**Files:**
- Create: `components/marketing/mockups/consult-chat-mockup.tsx`

**Step 1: Create the mockup component**

Same structural pattern as eScript mockup. Shows a phone-style card with a brief doctor-patient message thread:
- Header: stethoscope icon + "Doctor Chat"
- Chat bubbles: patient message (right-aligned, muted bg), doctor response (left-aligned, primary-tinted bg), doctor follow-up
- Floating badges (desktop only): "AHPRA registered" (top-right), "Same-day response" (top-left)
- Progress timeline overlay (desktop only): "Concern submitted" → "Doctor reviewing" → "Treatment plan sent"

```typescript
// components/marketing/mockups/consult-chat-mockup.tsx
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Stethoscope, Clock, CheckCircle2, FileText, BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConsultChatMockupProps {
  compact?: boolean
}

export function ConsultChatMockup({ compact = false }: ConsultChatMockupProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className={cn("relative", compact ? "w-full" : "w-72 xl:w-80")}>
      {/* Chat card */}
      <motion.div
        className={cn(
          "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none space-y-3",
          compact ? "p-4" : "p-5"
        )}
        initial={animate ? { opacity: 0, y: 20 } : {}}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Dr. Review</span>
            <span className="block text-[10px] text-success font-medium">Online now</span>
          </div>
        </div>

        {/* Chat messages */}
        <div className="space-y-2.5">
          {/* Patient message */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/10 dark:bg-primary/20 px-3 py-2">
              <p className="text-xs text-foreground leading-relaxed">I&apos;ve had a persistent rash on my arm for about a week</p>
            </div>
          </div>
          {/* Doctor response */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted/50 dark:bg-muted/20 px-3 py-2">
              <p className="text-xs text-foreground leading-relaxed">Thanks for the details. Can you send a photo of the affected area?</p>
            </div>
          </div>
          {/* Doctor follow-up */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted/50 dark:bg-muted/20 px-3 py-2">
              <p className="text-xs text-foreground leading-relaxed">I&apos;ll assess and can prescribe treatment if appropriate.</p>
            </div>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
          </div>
          Doctor is typing…
        </div>

        {/* AHPRA badge — top-right, desktop only */}
        {!compact && (
          <motion.div
            className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            initial={animate ? { opacity: 0, scale: 0.8 } : {}}
            whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
          >
            <BadgeCheck className="w-3.5 h-3.5 text-success" />
            AHPRA registered
          </motion.div>
        )}

        {/* Response time badge — top-left, desktop only */}
        {!compact && (
          <motion.div
            className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            initial={animate ? { opacity: 0, scale: 0.8 } : {}}
            whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.65, ease: "easeOut" }}
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            Within 2 hours
          </motion.div>
        )}
      </motion.div>

      {/* Progress timeline — desktop only */}
      {!compact && (
        <motion.div
          className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[210px]"
          initial={animate ? { opacity: 0, x: 20 } : {}}
          whileInView={animate ? { opacity: 1, x: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="space-y-2"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: animate ? 0.2 : 0, delayChildren: animate ? 0.3 : 0 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: CheckCircle2, text: "Concern submitted", time: "10m ago", done: true },
              { icon: CheckCircle2, text: "Doctor reviewing", time: "Just now", done: true },
              { icon: FileText, text: "Treatment plan sent", badge: "Done", done: true },
            ].map((step) => (
              <motion.div
                key={step.text}
                className="flex items-center gap-2"
                variants={animate
                  ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
                  : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
                }
              >
                <step.icon className={cn("w-3.5 h-3.5 shrink-0", step.badge ? "text-primary" : "text-success")} />
                <span className={cn("text-[11px]", step.badge ? "font-medium text-foreground" : "text-foreground/60")}>{step.text}</span>
                {step.badge ? (
                  <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-success/10 text-[9px] font-medium text-success">
                    {step.badge}
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground ml-auto">{step.time}</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketing/mockups/consult-chat-mockup.tsx
git commit -m "feat: add doctor chat hero mockup for consult landing"
```

---

## Task 5: Create Prescription-Specific Sections

**Files:**
- Create: `components/marketing/sections/escript-explainer-section.tsx`
- Create: `components/marketing/sections/supported-medications-section.tsx`
- Create: `components/marketing/sections/pbs-callout-strip.tsx`
- Create: `components/marketing/sections/prescription-limitations-section.tsx`

**Step 1: Create eScript explainer section**

Visual 3-step walkthrough: Doctor approves → SMS token sent → Show at pharmacy. Use card-based layout with icons, similar pattern to `HowItWorksSection` but simpler (no FloatingCard mockups).

```typescript
// components/marketing/sections/escript-explainer-section.tsx
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Stethoscope, Smartphone, ShoppingBag } from "lucide-react"

const STEPS = [
  {
    icon: Stethoscope,
    title: "Doctor approves",
    description: "An AHPRA-registered GP reviews your request and confirms it's safe to continue your medication.",
  },
  {
    icon: Smartphone,
    title: "eScript sent via SMS",
    description: "A digital prescription token is sent straight to your phone — no paper, no printing.",
  },
  {
    icon: ShoppingBag,
    title: "Collect at any pharmacy",
    description: "Walk into any pharmacy in Australia, show your phone, and collect your medication. PBS subsidies apply.",
  },
]

export function EScriptExplainerSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="How eScripts work" className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            What is an eScript?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            eScripts are digital prescriptions — the national standard in Australia since 2020. No paper needed, works everywhere.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className="text-center p-6 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] dark:shadow-none"
              initial={animate ? { opacity: 0, y: 20 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Create supported medications section**

Grid of medication categories with icons. Sourced from existing `repeatScriptFunnelConfig.whoItsFor` content.

```typescript
// components/marketing/sections/supported-medications-section.tsx
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Heart, Pill, Shield, Wind, Droplets, Sun, Brain, Thermometer } from "lucide-react"

const MEDICATION_CATEGORIES = [
  { icon: Heart, name: "Blood pressure", examples: "Amlodipine, Ramipril, Perindopril" },
  { icon: Droplets, name: "Cholesterol", examples: "Atorvastatin, Rosuvastatin" },
  { icon: Shield, name: "Contraceptives", examples: "Combined pill, mini pill" },
  { icon: Wind, name: "Asthma & COPD", examples: "Ventolin, Seretide, Symbicort" },
  { icon: Thermometer, name: "Reflux & gut", examples: "Omeprazole, Pantoprazole, Esomeprazole" },
  { icon: Sun, name: "Skin conditions", examples: "Topical steroids, tretinoin" },
  { icon: Brain, name: "Thyroid", examples: "Levothyroxine, Thyroxine" },
  { icon: Pill, name: "Other regular meds", examples: "Antihistamines, iron, metformin" },
]

export function SupportedMedicationsSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Supported medications" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-8"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 tracking-tight">
            Common medications we can renew
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            For medications you already take. If your medication isn&apos;t listed, submit a request and the doctor will let you know.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MEDICATION_CATEGORIES.map((med, i) => (
            <motion.div
              key={med.name}
              className="p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none"
              initial={animate ? { opacity: 0, y: 20 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <med.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="font-semibold text-foreground text-sm mb-1">{med.name}</h3>
              <p className="text-xs text-muted-foreground">{med.examples}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 3: Create PBS callout strip**

```typescript
// components/marketing/sections/pbs-callout-strip.tsx
"use client"

import { CheckCircle2 } from "lucide-react"

export function PBSCalloutStrip() {
  return (
    <div className="bg-success/5 border-y border-success/15">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-sm text-success/90 font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          PBS subsidies apply at the pharmacy — you only pay the standard co-payment for eligible medications
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Create prescription limitations section**

```typescript
// components/marketing/sections/prescription-limitations-section.tsx
"use client"

import { CONTACT_EMAIL } from "@/lib/constants"

export function PrescriptionLimitationsSection() {
  return (
    <section aria-label="Service limitations" className="pb-4">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-medium text-foreground mb-3">
            Not available for every medication
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              "Schedule 8 drugs (opioids, stimulants)",
              "Benzodiazepines (Valium, Xanax, etc.)",
              "New medications you haven't taken before",
              "Medications requiring blood test monitoring",
              "Patients under 18 (parental consent required)",
              "Medical emergencies — call 000",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 text-muted-foreground/40 shrink-0">&times;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Not sure if we can help?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              Ask us first
            </a>{" "}
            — we&apos;ll be straight with you.
          </p>
        </div>
      </div>
    </section>
  )
}
```

**Step 5: Commit**

```bash
git add components/marketing/sections/escript-explainer-section.tsx components/marketing/sections/supported-medications-section.tsx components/marketing/sections/pbs-callout-strip.tsx components/marketing/sections/prescription-limitations-section.tsx
git commit -m "feat: add prescription-specific landing page sections"
```

---

## Task 6: Create Consult-Specific Sections

**Files:**
- Create: `components/marketing/sections/common-concerns-section.tsx`
- Create: `components/marketing/sections/specialised-consults-section.tsx`
- Create: `components/marketing/sections/expect-call-strip.tsx`
- Create: `components/marketing/sections/consult-limitations-section.tsx`

**Step 1: Create common concerns section**

Grid of health conditions suitable for telehealth. Content from existing `general-consult-client.tsx` `COMMON_CONCERNS` array.

```typescript
// components/marketing/sections/common-concerns-section.tsx
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

const COMMON_CONCERNS = [
  { title: "Skin conditions", examples: "Rashes, acne, eczema, suspicious moles" },
  { title: "Minor infections", examples: "UTI, sinus, ear, eye infections" },
  { title: "Cold & flu", examples: "Respiratory symptoms, cough, sore throat" },
  { title: "Allergies", examples: "Hay fever, food allergies, skin reactions" },
  { title: "Mental health", examples: "Anxiety check-in, stress, low mood" },
  { title: "Women's health", examples: "Contraception, period issues, UTI" },
  { title: "Men's health", examples: "ED, hair loss, prostate check-in" },
  { title: "Weight management", examples: "Weight loss advice, treatment options" },
]

export function CommonConcernsSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Common concerns" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-8"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 tracking-tight">
            Common presenting concerns
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The following conditions are typically suitable for telehealth assessment.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMON_CONCERNS.map((concern, i) => (
            <motion.div
              key={concern.title}
              className="p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none"
              initial={animate ? { opacity: 0, y: 20 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <h3 className="font-semibold text-foreground text-sm mb-1">{concern.title}</h3>
              <p className="text-xs text-muted-foreground">{concern.examples}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Create specialised consults section**

Cards for ED, hair loss, women's health, weight management — each with dedicated pricing and links. Content from existing `generalConsultFunnelConfig.specializedServices`.

```typescript
// components/marketing/sections/specialised-consults-section.tsx
"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { ArrowRight, Shield, Sparkles, Stethoscope, ClipboardList } from "lucide-react"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

const SERVICES = [
  {
    icon: Shield,
    title: "Erectile Dysfunction",
    description: "Discreet assessment and treatment. Clinically proven medications prescribed if appropriate.",
    price: PRICING_DISPLAY.MENS_HEALTH,
    href: "/request?service=consult&subtype=ed",
    color: "bg-primary/10",
  },
  {
    icon: Sparkles,
    title: "Hair Loss",
    description: "Medical assessment for hair loss. Evidence-based treatments prescribed by an Australian GP.",
    price: PRICING_DISPLAY.HAIR_LOSS,
    href: "/request?service=consult&subtype=hair-loss",
    color: "bg-primary/10",
  },
  {
    icon: Stethoscope,
    title: "Women's Health",
    description: "Contraception, hormonal concerns, and general women's health. Compassionate, confidential care.",
    price: PRICING_DISPLAY.WOMENS_HEALTH,
    href: "/request?service=consult&subtype=womens-health",
    color: "bg-primary/10",
  },
  {
    icon: ClipboardList,
    title: "Weight Management",
    description: "Doctor-guided weight management plans. Medication options discussed if clinically appropriate.",
    price: PRICING_DISPLAY.WEIGHT_LOSS,
    href: "/request?service=consult&subtype=weight-loss",
    color: "bg-primary/10",
  },
]

export function SpecialisedConsultsSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Specialised consultations" className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            Specialised consultations
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Looking for something specific? Dedicated pathways with doctors experienced in these areas.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.title}
              initial={animate ? { opacity: 0, y: 20 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link href={service.href} className="group block h-full">
                <div className="h-full p-5 rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className={`w-10 h-10 rounded-xl ${service.color} flex items-center justify-center mb-3`}>
                    <service.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{service.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-sm font-semibold text-foreground">{service.price}</span>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 3: Create "expect a call" strip**

```typescript
// components/marketing/sections/expect-call-strip.tsx
"use client"

import { Phone, CheckCircle2 } from "lucide-react"

export function ExpectCallStrip() {
  return (
    <div className="bg-primary/5 border-y border-primary/15">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <p className="text-sm text-primary/90 font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            Most consults include a brief phone call with the doctor
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            Keep your phone nearby after submitting
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Create consult limitations section**

```typescript
// components/marketing/sections/consult-limitations-section.tsx
"use client"

import { CONTACT_EMAIL } from "@/lib/constants"

export function ConsultLimitationsSection() {
  return (
    <section aria-label="Service limitations" className="pb-4">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-medium text-foreground mb-3">
            Not suitable for every situation
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              "Emergencies — call 000 immediately",
              "Conditions requiring physical examination",
              "Schedule 8 drugs (opioids, stimulants)",
              "Workers' compensation assessments",
              "Complex mental health crises",
              "Patients under 18 (parental consent required)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 text-muted-foreground/40 shrink-0">&times;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Not sure if telehealth is right for your concern?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              Ask us first
            </a>{" "}
            — we&apos;ll be straight with you.
          </p>
        </div>
      </div>
    </section>
  )
}
```

**Step 5: Commit**

```bash
git add components/marketing/sections/common-concerns-section.tsx components/marketing/sections/specialised-consults-section.tsx components/marketing/sections/expect-call-strip.tsx components/marketing/sections/consult-limitations-section.tsx
git commit -m "feat: add consult-specific landing page sections"
```

---

## Task 7: Build Prescriptions Landing Orchestrator

**Files:**
- Create: `components/marketing/prescriptions-landing.tsx`

**Step 1: Create the orchestrator component**

Follow the exact architecture of `components/marketing/med-cert-landing.tsx`:
- `"use client"` with lazy-loaded below-fold sections via `dynamic()`
- `useLandingAnalytics("prescription")` for analytics
- `useServiceAvailability().isServiceDisabled("prescription")` for disable state
- Hero with `EScriptHeroMockup`, `DoctorAvailabilityPill`, `RotatingText`, `MagneticButton`, CTA, `ClosingCountdown`
- Sticky mobile CTA (bottom drawer), sticky desktop CTA (top bar)
- `ExitIntentOverlay` with `service="prescription"`
- Section order per design doc: Hero → LiveWaitTime → SocialProofStrip → PBSCalloutStrip → HowItWorks (Rx-specific inline) → EScriptExplainer → SupportedMedications → DoctorProfile → PrescriptionLimitations → Pricing → Testimonials → RegulatoryPartners → FAQ → Referral → FinalCTA

Data constants at top of file:
- `ROTATING_BADGES`: ["Sent to your phone", "Any pharmacy", "Same-day delivery", "Full refund if we can't help"]
- `SOCIAL_PROOF_STATS`: scriptFulfillmentPercent, averageResponseMinutes, averageRating, refund guarantee
- `RECENT_ACTIVITY_ENTRIES`: prescription-specific ("received their eScript")
- `PRICING_FEATURES`: prescription-specific bullet list
- `RELATED_ARTICLES`: prescription-relevant blog links

The hero section should follow the same layout pattern as `MedCertLanding`'s `HeroSection`: flexbox with text left + mockup right on desktop, stacked on mobile. Include `ClosingCountdown` and `ContextualMessage` (can extract these from med-cert-landing into a shared file, or copy them since they're small utility components).

For the how-it-works section: inline 3-step cards (no FloatingCard mockups like med-cert), matching the step data from `repeatScriptFunnelConfig.howItWorks`.

For FAQ: import `PRESCRIPTION_FAQ` from `lib/data/prescription-faq.ts`, use `FAQList` component directly (same pattern as `FaqCtaSection` but with prescription data).

For the final CTA: inline section with prescription-specific copy ("Your regular medication, renewed from home") and CTA ("Renew your medication — $29.95").

Full code is too long for the plan — the implementing agent should use `med-cert-landing.tsx` as the template and swap:
1. All med-cert content → prescription content
2. `MedCertHeroMockup` → `EScriptHeroMockup`
3. `MED_CERT_FAQ` → `PRESCRIPTION_FAQ`
4. Med-cert sections → Prescription sections (PBS strip, eScript explainer, supported medications, prescription limitations)
5. Service IDs: `"med-cert"` → `"prescription"` everywhere (analytics, exit-intent, availability, CTAs)
6. Pricing: `PRICING.MED_CERT` → `PRICING.REPEAT_SCRIPT`
7. CTA href: `/request?service=med-cert` → `/request?service=prescription`
8. Remove med-cert-specific sections: `CertificatePreviewSection`, `EmployerCalloutStrip`
9. Copy `ClosingCountdown`, `ContextualMessage`, `AnimatedStat`, `RecentActivityTicker`, `SocialProofStrip` patterns (adapt messages for prescriptions)

**Step 2: Commit**

```bash
git add components/marketing/prescriptions-landing.tsx
git commit -m "feat: add bespoke prescriptions landing page orchestrator"
```

---

## Task 8: Build General Consult Landing Orchestrator

**Files:**
- Create: `components/marketing/general-consult-landing.tsx`

**Step 1: Create the orchestrator component**

Same architecture as Task 7 but for consults. Key differences:
- `ConsultChatMockup` instead of `EScriptHeroMockup`
- `useLandingAnalytics("consult")`
- `useServiceAvailability().isServiceDisabled("consult")`
- `ExitIntentOverlay` with `service="consult"`
- Section order: Hero → LiveWaitTime → SocialProofStrip → ExpectCallStrip → HowItWorks (consult-specific inline) → CommonConcerns → SpecialisedConsults → DoctorProfile → ConsultLimitations → Pricing → Testimonials → RegulatoryPartners → FAQ → Referral → FinalCTA

Data constants:
- `ROTATING_BADGES`: ["AHPRA registered doctors", "Medication if needed", "Same-day response", "Full refund if we can't help"]
- `SOCIAL_PROOF_STATS`: averageResponseMinutes, averageRating, doctorCombinedYears, refund
- `RECENT_ACTIVITY_ENTRIES`: consult-specific ("completed their consult")
- `PRICING_FEATURES`: consult-specific bullet list

Swap guidance (same as Task 7 but for consults):
1. `MedCertHeroMockup` → `ConsultChatMockup`
2. `MED_CERT_FAQ` → `CONSULT_FAQ`
3. Med-cert sections → Consult sections (ExpectCallStrip, CommonConcerns, SpecialisedConsults, ConsultLimitations)
4. Service IDs: `"consult"` everywhere
5. Pricing: `PRICING.CONSULT` ($49.95)
6. CTA href: `/request?service=consult`
7. Hero copy: "Talk to a doctor today" / rotating words consult-specific
8. ContextualMessage adapted for consults (e.g. "Too late for a GP? We're open until 10pm AEST")

**Step 2: Commit**

```bash
git add components/marketing/general-consult-landing.tsx
git commit -m "feat: add bespoke general consult landing page orchestrator"
```

---

## Task 9: Wire Up Route Pages

**Files:**
- Modify: `app/prescriptions/page.tsx`
- Modify: `app/general-consult/page.tsx`
- Delete: `app/general-consult/general-consult-client.tsx`

**Step 1: Update prescriptions page**

Replace the `ServiceFunnelPage` import with `PrescriptionsLanding`. Keep the metadata export. Keep SEO structured data schemas but update to use `PRESCRIPTION_FAQ`.

```typescript
// app/prescriptions/page.tsx
import type { Metadata } from 'next'
import { PrescriptionsLanding } from '@/components/marketing/prescriptions-landing'
import { PRESCRIPTION_FAQ } from '@/lib/data/prescription-faq'
import { BreadcrumbSchema, MedicalServiceSchema, PrescriptionHowToSchema, SpeakableSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Online Repeat Medication | Same-Day eScript',
  description: 'Renew your regular medications online. Australian doctors review your request and send an eScript to your phone. Any pharmacy, same day. From $29.95.',
  openGraph: {
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send an eScript to your phone.',
    type: 'website',
    url: 'https://instantmed.com.au/prescriptions',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send an eScript to your phone.',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/prescriptions',
  },
}

export default function PrescriptionsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Repeat Medication", url: "https://instantmed.com.au/prescriptions" }
        ]}
      />
      <MedicalServiceSchema
        name="Online Repeat Medication"
        description="Renew your regular medications online. Reviewed by Australian registered doctors. eScript sent to your phone."
        price="29.95"
      />
      <PrescriptionHowToSchema />
      <SpeakableSchema
        name="Online Repeat Medication Australia"
        description="Renew your regular medications online. Australian registered doctors review your request and send an eScript to your phone. From $29.95."
        url="/prescriptions"
      />
      <FAQSchema faqs={[...PRESCRIPTION_FAQ]} />
      <PrescriptionsLanding />
    </>
  )
}
```

**Step 2: Update general-consult page**

```typescript
// app/general-consult/page.tsx
import type { Metadata } from 'next'
import { GeneralConsultLanding } from '@/components/marketing/general-consult-landing'
import { CONSULT_FAQ } from '@/lib/data/consult-faq'
import { BreadcrumbSchema, MedicalServiceSchema, SpeakableSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Online GP Consultation | Talk to a Doctor Today',
  description: 'See an AHPRA-registered GP online for health concerns, treatment advice, prescriptions, and referrals. Same-day response. From $49.95.',
  openGraph: {
    title: 'Online GP Consultation | InstantMed',
    description: 'See an AHPRA-registered GP online. Treatment, prescriptions, and referrals. Same-day response.',
    type: 'website',
    url: 'https://instantmed.com.au/general-consult',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online GP Consultation | InstantMed',
    description: 'See an AHPRA-registered GP online. Treatment, prescriptions, and referrals.',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/general-consult',
  },
}

export default function GeneralConsultPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "General Consult", url: "https://instantmed.com.au/general-consult" }
        ]}
      />
      <MedicalServiceSchema
        name="Online GP Consultation"
        description="See an AHPRA-registered GP online for health concerns, treatment, prescriptions, and referrals."
        price="49.95"
      />
      <SpeakableSchema
        name="Online GP Consultation Australia"
        description="Talk to an AHPRA-registered GP about health concerns, treatment options, or anything you'd normally see a doctor for. From $49.95."
        url="/general-consult"
      />
      <FAQSchema faqs={[...CONSULT_FAQ]} />
      <GeneralConsultLanding />
    </>
  )
}
```

**Step 3: Delete old general-consult client component**

```bash
rm app/general-consult/general-consult-client.tsx
```

**Step 4: Commit**

```bash
git add app/prescriptions/page.tsx app/general-consult/page.tsx
git rm app/general-consult/general-consult-client.tsx
git commit -m "feat: wire prescriptions + consult routes to bespoke landing pages"
```

---

## Task 10: Typecheck and Build Verification

**Step 1: Run typecheck**

```bash
pnpm typecheck
```

Fix any type errors that surface.

**Step 2: Run lint**

```bash
pnpm lint
```

Fix any ESLint violations.

**Step 3: Run build**

```bash
pnpm build
```

Verify both `/prescriptions` and `/general-consult` routes compile without errors.

**Step 4: Visual verification**

```bash
pnpm dev
```

Open both pages in browser, check:
- Hero renders with mockup (desktop + mobile)
- All sections render in correct order
- Sticky CTAs appear on scroll
- Exit-intent fires on mouse leave (desktop)
- Dark mode toggle works
- No console errors

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck and build issues for landing pages"
```

---

## Task 11: Check for Broken References

**Step 1: Search for imports of deleted/changed files**

```bash
grep -r "general-consult-client" app/ components/ --include="*.tsx" --include="*.ts"
grep -r "ServiceFunnelPage" app/prescriptions/ --include="*.tsx" --include="*.ts"
grep -r "repeatScriptFunnelConfig" app/prescriptions/ --include="*.tsx" --include="*.ts"
```

Fix any stale imports.

**Step 2: Check that other routes still use ServiceFunnelPage correctly**

The `ServiceFunnelPage` and `repeatScriptFunnelConfig` are still used by `app/repeat-prescriptions/page.tsx` and `app/consult/page.tsx` — verify those pages still work.

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: clean up stale imports after landing page migration"
```
