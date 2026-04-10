# Homepage Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the homepage from 16+ sections down to 7, replace the certificate-mill hero mockup with an outcome-focused design, add clean service cards with coming-soon waitlist, and consolidate trust signals.

**Architecture:** Server component page (`app/page.tsx`) renders 7 sections. New `HeroOutcomeMockup` replaces `HeroProductMockup`. New `ServiceCard` + `ComingSoonCard` components replace `ServicePicker`. Social proof section merges reviews + stats. Waitlist uses a server action writing to Supabase `service_waitlist` table.

**Tech Stack:** Next.js 15 App Router, React 18, Framer Motion 11, Tailwind v4, Supabase, shadcn/ui, Zod, lucide-react

---

## Task 1: Add Women's Health + Weight Loss to Service Data

**Files:**
- Modify: `lib/marketing/homepage.ts:59-140` (serviceCategories array)

**Step 1: Add two new service entries to `serviceCategories`**

Add these after the `hair-loss` entry at line ~140:

```typescript
{
  id: "womens-health",
  slug: "womens-health",
  title: "Women's Health",
  shortTitle: "Women's Health",
  benefitQuestion: "Need support with women's health?",
  description: "Contraception, UTIs, and more — reviewed by an Australian doctor, no waiting room.",
  icon: "Stethoscope",
  color: "pink",
  priceFrom: 59.95,
  href: "/womens-health",
  popular: false,
  comingSoon: true,
  cta: "Notify me",
  benefits: [
    "Contraception and hormonal health",
    "Doctor-reviewed, no call needed",
    "eScript sent to your phone",
  ],
},
{
  id: "weight-loss",
  slug: "weight-loss",
  title: "Weight Loss",
  shortTitle: "Weight Loss",
  benefitQuestion: "Looking for medical weight management?",
  description: "Doctor-led weight loss assessment with evidence-based treatment options.",
  icon: "Stethoscope",
  color: "rose",
  priceFrom: 89.95,
  href: "/weight-loss",
  popular: false,
  comingSoon: true,
  cta: "Notify me",
  benefits: [
    "Evidence-based treatment plans",
    "Doctor-reviewed assessment",
    "Ongoing support available",
  ],
},
```

**Step 2: Add pink/rose color configs**

These will be used by the new service cards. Add to the color config in `service-picker.tsx` (but since we're replacing ServicePicker, we'll define them in the new component in Task 4).

**Step 3: Commit**

```bash
git add lib/marketing/homepage.ts
git commit -m "feat(homepage): add women's health + weight loss service data with comingSoon flag"
```

---

## Task 2: Create Supabase Migration for Waitlist Table

**Files:**
- Create: `supabase/migrations/<next_number>_service_waitlist.sql`

**Step 1: Determine next migration number**

```bash
ls supabase/migrations/ | tail -1
```

Use the next sequential number.

**Step 2: Write migration**

```sql
-- Service waitlist for coming-soon services
create table if not exists public.service_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  service_id text not null,
  created_at timestamptz not null default now(),
  constraint service_waitlist_email_service_unique unique (email, service_id)
);

-- RLS: insert only, no read
alter table public.service_waitlist enable row level security;

create policy "Anyone can join waitlist"
  on public.service_waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Index for admin queries
create index idx_service_waitlist_service on public.service_waitlist (service_id, created_at desc);
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add service_waitlist table for coming-soon email capture"
```

**Step 4: Update migration count in CLAUDE.md**

Increment the migration count from 196 to 197.

---

## Task 3: Create Waitlist Server Action

**Files:**
- Create: `app/actions/waitlist.ts`

**Step 1: Write the server action**

```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const WaitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  serviceId: z.string().min(1),
})

export async function joinWaitlist(
  _prev: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = WaitlistSchema.safeParse({
    email: formData.get('email'),
    serviceId: formData.get('serviceId'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('service_waitlist')
    .upsert(
      { email: parsed.data.email, service_id: parsed.data.serviceId },
      { onConflict: 'email,service_id' }
    )

  if (error) {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
```

**Step 2: Commit**

```bash
git add app/actions/waitlist.ts
git commit -m "feat(homepage): add waitlist server action for coming-soon services"
```

---

## Task 4: Create New Hero Outcome Mockup

**Files:**
- Create: `components/marketing/hero-outcome-mockup.tsx`

**Step 1: Build the outcome mockup component**

This replaces `HeroProductMockup`. It shows an APPROVED certificate result — not a form. Key elements:
- Clean card with "Medical Certificate" header + "Approved" badge
- Doctor seal area (no individual names — use "Your GP" pattern)
- Floating notification: "Certificate ready — check your inbox"
- Subtle animation (Framer Motion, respect reduced motion)

```typescript
"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { FileText, CheckCircle2, Mail, ShieldCheck, User } from "lucide-react"

export function HeroOutcomeMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80">
      {/* Approved certificate card */}
      <motion.div
        className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none p-5 space-y-4"
        initial={animate ? { y: 20, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Medical Certificate</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </div>
        </div>

        {/* Certificate preview area */}
        <div className="rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Patient</span>
            <div className="h-2 rounded-full bg-muted/50 dark:bg-muted/25 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Period</span>
            <span className="text-[10px] text-foreground/70">1 day · 10 Apr 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Status</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Reviewed & issued</span>
          </div>
        </div>

        {/* Doctor verification */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-card flex items-center justify-center">
              <CheckCircle2 className="w-2 h-2 text-white" />
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Reviewed by your GP</p>
            <p className="text-[10px] text-muted-foreground">AHPRA-registered · Verified</p>
          </div>
        </div>

        {/* Trust footer */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>Accepted by all Australian employers</span>
        </div>
      </motion.div>

      {/* Floating notification */}
      <motion.div
        className="absolute -bottom-5 -right-4 xl:-right-6 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-2.5 flex items-center gap-2.5 min-w-[190px]"
        initial={animate ? { x: 20, opacity: 0 } : {}}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight">Certificate ready</p>
          <p className="text-[10px] text-muted-foreground">Check your inbox</p>
        </div>
      </motion.div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketing/hero-outcome-mockup.tsx
git commit -m "feat(homepage): add HeroOutcomeMockup — outcome-focused hero visual"
```

---

## Task 5: Redesign Hero Component

**Files:**
- Modify: `components/marketing/hero.tsx` (full rewrite)

**Step 1: Update hero to use new mockup, streamlined copy, 3 trust pills**

Key changes:
- Import `HeroOutcomeMockup` instead of `HeroProductMockup`
- Simplify sub-copy to one sentence
- CTAs: "Get started" → `/request` + "See pricing" → `/pricing`
- Reduce trust row to 3 pills: social_proof, no_call, refund
- Remove the price badge (price info is in service cards + sub-copy)

```typescript
'use client'

import type React from "react"
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { HeroOutcomeMockup } from '@/components/marketing/hero-outcome-mockup'
import { TrustBadgeRow } from '@/components/shared/trust-badge'

export function Hero({ children }: { children?: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-16">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-8"
              initial={prefersReducedMotion ? {} : { y: -10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-6 leading-[1.15] animate-hero-headline">
              A doctor, without the waiting room.
            </h1>

            {/* Sub-line — one clean sentence */}
            {children ?? (
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
                Medical certificates, repeat prescriptions, and discreet treatment for ED and hair loss — reviewed by AHPRA-registered Australian doctors. From $19.95.
              </p>
            )}

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
              initial={prefersReducedMotion ? {} : { y: 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
              >
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base font-semibold"
              >
                <Link href="/pricing">
                  See pricing
                </Link>
              </Button>
            </motion.div>

            {/* Trust signals — 3 only */}
            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2"
              initial={prefersReducedMotion ? {} : { y: 8 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <TrustBadgeRow
                badges={[
                  { id: 'social_proof', variant: 'styled' },
                  { id: 'no_call', variant: 'styled' },
                  'refund',
                ]}
              />
            </motion.div>
          </div>

          {/* Outcome mockup — desktop only */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HeroOutcomeMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketing/hero.tsx
git commit -m "feat(homepage): redesign hero — outcome mockup, streamlined copy, 3 trust pills"
```

---

## Task 6: Create New Service Card Components

**Files:**
- Create: `components/marketing/service-cards.tsx`

**Step 1: Build ServiceCard and ComingSoonCard**

This replaces the entire `ServicePicker` component. Clean icon cards — no mockups, no bullet lists.

```typescript
'use client'

import Link from 'next/link'
import { ArrowRight, Bell, Sparkles } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useServiceAvailability, type ServiceId } from '@/components/providers/service-availability-provider'
import { DocumentPremium, PillPremium, StethoscopePremium } from '@/components/icons/certification-logos'
import { WaitlistForm } from '@/components/marketing/waitlist-form'

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
  Sparkles: Sparkles,
}

const colorConfig: Record<string, { accent: string; light: string }> = {
  emerald: { accent: '#059669', light: 'rgba(5, 150, 105, 0.08)' },
  cyan:    { accent: '#0891b2', light: 'rgba(8, 145, 178, 0.08)' },
  blue:    { accent: '#3B82F6', light: 'rgba(59, 130, 246, 0.08)' },
  violet:  { accent: '#8B5CF6', light: 'rgba(139, 92, 246, 0.08)' },
  pink:    { accent: '#EC4899', light: 'rgba(236, 72, 153, 0.08)' },
  rose:    { accent: '#F43F5E', light: 'rgba(244, 63, 94, 0.08)' },
}

interface ServiceData {
  id: string
  title: string
  description: string
  icon: string
  color: string
  priceFrom: number
  href: string
  popular?: boolean
  comingSoon?: boolean
  cta?: string
}

function ServiceCard({ service }: { service: ServiceData }) {
  const { isServiceDisabled } = useServiceAvailability()
  const Icon = iconMap[service.icon] || DocumentPremium
  const colors = colorConfig[service.color] || colorConfig.emerald
  const disabled = isServiceDisabled(service.id as ServiceId)

  return (
    <Link
      href={disabled ? '#' : service.href}
      className={cn(
        'group relative block rounded-xl p-5',
        'bg-white dark:bg-card',
        'border border-border/50 dark:border-white/15',
        'shadow-md shadow-primary/[0.06] dark:shadow-none',
        'transition-all duration-300',
        disabled
          ? 'opacity-60 cursor-default'
          : 'hover:shadow-xl hover:shadow-primary/[0.1] hover:-translate-y-1',
        service.popular && !disabled && 'ring-2 ring-primary/20',
      )}
      aria-disabled={disabled}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
    >
      {/* Popular badge */}
      {service.popular && !disabled && (
        <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold">
          Most popular
        </div>
      )}

      {/* Icon + title + price */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: colors.light }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.accent }} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {service.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            From ${service.priceFrom.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {service.description}
      </p>

      {/* CTA */}
      <Button size="sm" className="w-full gap-1" tabIndex={-1}>
        {service.cta || 'Get started'}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </Link>
  )
}

function ComingSoonCard({ service }: { service: ServiceData }) {
  const Icon = iconMap[service.icon] || DocumentPremium
  const colors = colorConfig[service.color] || colorConfig.pink

  return (
    <div className={cn(
      'relative rounded-xl p-5',
      'bg-white/60 dark:bg-card/60',
      'border border-border/30 dark:border-white/10',
      'shadow-sm shadow-primary/[0.03]',
    )}>
      {/* Coming soon badge */}
      <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
        Coming soon
      </div>

      {/* Icon + title + price */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 opacity-60"
          style={{ backgroundColor: colors.light }}
        >
          <Icon className="w-5 h-5 opacity-60" style={{ color: colors.accent }} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground/70">
            {service.title}
          </h3>
          <p className="text-sm text-muted-foreground/70">
            From ${service.priceFrom.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground/70 leading-relaxed mb-4">
        {service.description}
      </p>

      {/* Waitlist form */}
      <WaitlistForm serviceId={service.id} />
    </div>
  )
}

export function ServiceCards() {
  // Import dynamically to avoid circular deps — define inline for now
  // These come from lib/marketing/homepage.ts serviceCategories
  const { serviceCategories } = require('@/lib/marketing/homepage')
  const prefersReducedMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 },
    },
  }

  const itemVariants: Variants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { y: 20, opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }

  return (
    <section id="services" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-3">
            What do you need?
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Flat pricing. No hidden fees. No account needed to start.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {(serviceCategories as ServiceData[]).map((service) => (
            <motion.div key={service.id} variants={itemVariants}>
              {service.comingSoon ? (
                <ComingSoonCard service={service} />
              ) : (
                <ServiceCard service={service} />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Private service — no Medicare rebate, but PBS subsidies may still apply at the pharmacy
        </p>
      </div>
    </section>
  )
}
```

**Step 2: Create WaitlistForm component**

Create `components/marketing/waitlist-form.tsx`:

```typescript
'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, CheckCircle2, Loader2 } from 'lucide-react'
import { joinWaitlist } from '@/app/actions/waitlist'
import { cn } from '@/lib/utils'

interface WaitlistFormProps {
  serviceId: string
}

export function WaitlistForm({ serviceId }: WaitlistFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [state, formAction, isPending] = useActionState(joinWaitlist, null)

  if (state?.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
        <CheckCircle2 className="h-4 w-4" />
        We'll let you know!
      </div>
    )
  }

  if (!expanded) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={() => setExpanded(true)}
      >
        <Bell className="h-3 w-3" />
        Notify me
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="serviceId" value={serviceId} />
      <Input
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        className="h-8 text-sm"
        autoFocus
      />
      <Button size="sm" type="submit" disabled={isPending} className="shrink-0 h-8 px-3">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
      </Button>
    </form>
  )
}
```

Note: Import `ArrowRight` from lucide-react at the top.

**Step 3: Update barrel export**

In `components/marketing/index.ts`, replace the `ServicePicker` export:

```typescript
export { ServiceCards } from './service-cards'
```

Remove or keep `ServicePicker` export (it may be used on other pages — check before removing).

**Step 4: Commit**

```bash
git add components/marketing/service-cards.tsx components/marketing/waitlist-form.tsx components/marketing/index.ts
git commit -m "feat(homepage): new ServiceCards + ComingSoonCard with waitlist capture"
```

---

## Task 7: Create Combined Social Proof Section

**Files:**
- Create: `components/marketing/social-proof-section.tsx`

**Step 1: Build merged reviews + stats section**

```typescript
'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Users, Star, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { getTestimonialsForColumns } from '@/lib/data/testimonials'

const stats = [
  {
    icon: Users,
    value: `${getPatientCount()}+`,
    label: 'Australians helped',
    color: 'text-primary',
  },
  {
    icon: Star,
    value: SOCIAL_PROOF_DISPLAY.ratingOutOf5,
    label: 'patient rating',
    color: 'text-amber-500',
  },
  {
    icon: Clock,
    value: `${SOCIAL_PROOF.sameDayDeliveryPercent}%`,
    label: 'delivered same day',
    color: 'text-primary',
  },
  {
    icon: ShieldCheck,
    value: '100%',
    label: 'AHPRA-registered',
    color: 'text-emerald-600',
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
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
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

        {/* Stats row */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-12"
          initial={prefersReducedMotion ? {} : { y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 text-sm">
              <stat.icon className={cn('w-4 h-4', stat.color)} />
              <span className="font-semibold text-foreground">{stat.value}</span>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <TestimonialsColumnsWrapper
          testimonials={reviews}
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

**Step 2: Commit**

```bash
git add components/marketing/social-proof-section.tsx
git commit -m "feat(homepage): add SocialProofSection — merged reviews + stats"
```

---

## Task 8: Rebuild Homepage Layout (app/page.tsx)

**Files:**
- Modify: `app/page.tsx` (major restructure)

**Step 1: Rewrite to 7 sections, remove all trust-badge clutter**

The new page structure:

```typescript
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
import { Hero, HowItWorks, MarketingFooter } from '@/components/marketing'
import { ServiceCards } from '@/components/marketing/service-cards'
import { SocialProofSection } from '@/components/marketing/social-proof-section'
import { Navbar } from '@/components/shared/navbar'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { FAQSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { faqItems } from '@/lib/marketing/homepage'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { getFeatureFlags } from '@/lib/feature-flags'
import { CTABanner } from '@/components/sections'
import { AccordionSection } from '@/components/sections'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'
import { AfterHoursMedCertBanner } from '@/components/shared/after-hours-med-cert-banner'

// Keep existing metadata export — it's well-optimized
export const revalidate = 3600

export const metadata: Metadata = {
  // ... keep existing metadata unchanged ...
}

function SectionSkeleton({ height = 'h-96' }: { height?: string }) {
  return <div className={cn(height, "animate-pulse bg-muted/20 rounded-xl")} />
}

const faqGroups = [
  {
    items: faqItems.map(item => ({
      question: item.question,
      answer: item.answer,
    })),
  },
]

async function MaintenanceBanner() {
  const flags = await getFeatureFlags()
  if (!flags.maintenance_mode) return null
  return (
    <div className="mx-4 mt-2 rounded-2xl border border-warning-border bg-warning-light/50 px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-warning shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63" />
      </svg>
      <div>
        <p className="text-sm font-medium text-amber-900">We&apos;re currently performing maintenance.</p>
        <p className="text-xs text-warning">{(flags as { maintenance_message?: string }).maintenance_message || "New requests will be accepted soon."}</p>
      </div>
    </div>
  )
}

export default async function HomePage() {
  const faqSchemaData = faqItems.map(item => ({
    question: item.question,
    answer: item.answer
  }))

  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">
      <FAQSchema faqs={faqSchemaData} />
      <SpeakableSchema
        name="InstantMed - Online Doctor Australia"
        description="Get medical certificates in under 30 minutes, 24/7. Repeat medication and discreet treatment for ED and hair loss from AHPRA-registered Australian doctors. From $19.95."
        url="/"
      />
      <HashScrollHandler />
      <ReturningPatientBanner className="mx-4 mt-2" />
      <Navbar variant="marketing" />
      <AfterHoursMedCertBanner />
      <Suspense fallback={null}>
        <MaintenanceBanner />
      </Suspense>

      <main className="relative">
        {/* 1. Hero */}
        <Hero>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed text-balance">
            Medical certificates, repeat prescriptions, and discreet treatment for ED and hair loss — reviewed by AHPRA-registered Australian doctors. From $19.95.
          </p>
        </Hero>

        {/* 2. Services */}
        <ServiceCards />

        {/* 3. How It Works */}
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorks />
        </Suspense>

        {/* 4. Social Proof */}
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <SocialProofSection />
        </Suspense>

        {/* 5. FAQ */}
        <AccordionSection
          id="faq"
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about our service."
          groups={faqGroups}
        />

        {/* 6. CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Tell us what's going on, a doctor reviews it, and you're sorted. No appointments, no waiting rooms."
          ctaText="Get started"
          ctaHref="/request"
        />
      </main>

      {/* 7. Footer */}
      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
```

Key removals from page.tsx:
- `LiveWaitTime` strip
- `RegulatorLogoMarquee`
- `GoogleReviewsBadge`
- `ServicePicker` (replaced by `ServiceCards`)
- `PatientReviews` (absorbed into `SocialProofSection`)
- `DoctorCredibility` section
- `EmployerLogoMarquee`
- `StatsStrip`
- `Browse by Topic` links section
- `TotalPatientsCounter` badge
- `TrustBadgeRow preset="pre_cta"`
- `TrustBadgeFloat` floating sidebar

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat(homepage): rebuild to 7 sections — remove trust-badge clutter, streamline layout"
```

---

## Task 9: Update Barrel Exports and Clean Up Imports

**Files:**
- Modify: `components/marketing/index.ts`

**Step 1: Update exports**

Remove `StatsStrip` and `LiveWaitTime` from homepage barrel (they may still be used elsewhere, so keep the source files — just remove from barrel if not needed).

Check if `ServicePicker` is imported anywhere outside `app/page.tsx`:

```bash
grep -r "ServicePicker" --include="*.tsx" --include="*.ts" -l
```

If only used in `app/page.tsx`, remove the barrel export. Same for `LiveWaitTime` — check if used on service landing pages.

**Step 2: Commit**

```bash
git add components/marketing/index.ts
git commit -m "chore(homepage): update barrel exports for new homepage structure"
```

---

## Task 10: Fix Certificate Mockup Doctor Name

**Files:**
- Modify: `components/marketing/mockups/certificate.tsx:48`

**Step 1: Replace "Dr. S. Thompson" with "Your GP"**

This mockup is still used on the `/medical-certificate` landing page. The individual doctor name violates the no-individual-names rule.

Change line 48:
```typescript
// Before:
<span className="text-[8px] font-medium text-foreground/70">Dr. S. Thompson</span>
// After:
<span className="text-[8px] font-medium text-foreground/70">Your GP</span>
```

**Step 2: Commit**

```bash
git add components/marketing/mockups/certificate.tsx
git commit -m "fix(mockups): replace individual doctor name with 'Your GP' per brand rules"
```

---

## Task 11: Typecheck and Build Verification

**Step 1: Run typecheck**

```bash
pnpm typecheck
```

Fix any type errors.

**Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint issues.

**Step 3: Run build**

```bash
pnpm build
```

Verify clean build with no errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(homepage): resolve typecheck and lint issues from overhaul"
```

---

## Task 12: Visual Verification

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Verify homepage at localhost:3000**

Check:
- Hero renders with outcome mockup (desktop) — no form fields visible
- Hero trust pills: exactly 3 (social_proof, no_call, refund)
- 6 service cards in 3-col grid: 4 active + 2 coming soon
- Coming soon cards show "Coming Soon" badge + "Notify me" CTA
- Waitlist form expands on click, submits successfully
- How It Works section renders correctly
- Social proof section shows stats row + testimonials
- FAQ accordion works
- CTA banner renders
- No floating trust badge sidebar
- No regulator logo marquee
- No wait time strip
- No browse-by-topic section
- Mobile responsive: cards stack to 1-col, hero text centers

**Step 3: Take screenshots and present to user for review**

---

## Post-Implementation Notes

- **Do not delete** `components/marketing/hero-product-mockup.tsx`, `mockups/ed-hero-mockup.tsx`, `mockups/hair-loss-hero-mockup.tsx` — they may still be used on service landing pages. Verify before removing.
- **Do not delete** `components/marketing/service-picker.tsx` — verify it's not imported elsewhere first.
- **Do not delete** `components/marketing/live-wait-time.tsx` — used on service landing pages.
- **Migration 197** needs `supabase db push` to deploy the waitlist table.
- Update CLAUDE.md migration count after push.
