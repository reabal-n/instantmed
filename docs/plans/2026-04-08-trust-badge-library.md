# Trust Badge Primitive Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all ad-hoc inline trust badge implementations with a single-source-of-truth registry, a composable badge primitive with plain + styled tiers, two scrolling logo marquees, and a sticky float — distributed strategically across the scroll journey so the user discovers trust signals, not a wall of them.

**Architecture:** `lib/trust-badges.ts` defines 21 badge atoms + named placement presets. `components/shared/trust-badge.tsx` exports `TrustBadge` (atom), `TrustBadgeRow` (flex row), `TrustBadgeGrid` (card grid). Styled tiers use Framer Motion for mount animations and CSS `@keyframes` for continuous idle animations. Plain tiers are icon + label only — zero JS cost. All existing components either become thin shims or are removed.

**Tech Stack:** React 18, Framer Motion v11 (pinned), Tailwind v4, Lucide React, `useReducedMotion` from `@/components/ui/motion`, `SOCIAL_PROOF` + `getPatientCount` from `@/lib/social-proof`

---

## Homepage Scroll Journey — Where Each Badge Lives

This is the strategic placement map. Follow it exactly — don't add badges outside these positions.

| # | Section | Component | Badges | Tier |
|---|---------|-----------|--------|------|
| 1 | Hero | `<Hero>` | `social_proof`, `no_call`, `refund`, `ahpra` | styled, styled, plain, plain |
| 2 | Logo strip | Replaces `TrustBadgeSlider` | `<RegulatorLogoMarquee />` | — |
| 3 | How It Works step 1 | `<HowItWorks>` | `form_only` | styled |
| 4 | Doctor credibility | `<DoctorCredibility>` | `ahpra`, `real_gp` | styled, styled |
| 5 | Employer logos | NEW after DoctorCredibility | `<EmployerLogoMarquee />` | — |
| 6 | Before final CTA | Below `<CTABanner>` | `no_appointment`, `no_speaking`, `from_your_phone` | styled, plain, plain |
| 7 | Footer strip | `<Footer>` | `ahpra`, `tga`, `medical_director`, `refund`, `privacy` | all plain |
| 8 | Compliance marquee | `<ComplianceMarquee>` | 6 trimmed text items | — |

**Rule:** Max 2 styled badges per row. Never put `no_call` + `no_speaking` in the same row (same claim). Styled badges are punctuation — they should feel discovered, not broadcast.

**Not on homepage (service-page only):**
- `no_medicare` + `legally_valid` → med cert landing pricing section
- `stripe` + `ssl` + `au_data` → checkout flow
- `same_day`, `instant_pdf` → med cert landing outcome section

---

## Badge Registry — 21 Atoms

### Credential (6) — all have plain tier; ahpra + refund also have styled

| ID | Label | Icon | Tint | Styled? |
|----|-------|------|------|---------|
| `ahpra` | AHPRA-registered doctors | BadgeCheck | emerald | ✓ shimmer sweep + verify link |
| `tga` | TGA compliant | FileCheck | blue | — |
| `racgp` | RACGP protocols | BookOpen | indigo | — |
| `medical_director` | Medical Director oversight | UserCheck | violet | — |
| `refund` | Full refund if declined | ShieldCheck | emerald | ✓ hexagonal stamp, -3°→0° snap |
| `privacy` | Privacy Act protected | Eye | slate | — |

### Payment / Security (4) — stripe + au_data have styled

| ID | Label | Styled? |
|----|-------|---------|
| `stripe` | Secured by Stripe | ✓ Stripe wordmark card (always, no plain fallback) |
| `ssl` | 256-bit encrypted | — |
| `pci` | PCI compliant | — |
| `au_data` | Data stored in Australia | ✓ trailing dot pulse after text |

### Friction-Free (9) — no_call, no_speaking, form_only, no_waiting_room, no_appointment, from_your_phone, same_day have styled

| ID | Label | Styled? |
|----|-------|---------|
| `no_call` | No call required | ✓ pulsing green dot left of icon |
| `no_speaking` | No need to speak to anyone | ✓ silence ripple on icon |
| `form_only` | Just fill out a form | ✓ document lines fill in sequentially |
| `no_waiting_room` | No waiting room | ✓ clock icon, diagonal line draws through on mount |
| `no_appointment` | No appointment needed | ✓ CalendarX — the ✕ stroke-draws on mount |
| `from_your_phone` | Done from your phone | ✓ smartphone screen inner glow |
| `no_face_to_face` | No face-to-face needed | — |
| `fast_form` | 2-minute form | — |
| `same_day` | Same-day delivery | ✓ Send icon nudges right on hover |

### Outcome (4) — legally_valid, no_medicare, real_gp, instant_pdf have styled

| ID | Label | Styled? |
|----|-------|---------|
| `legally_valid` | Legally valid certificate | ✓ indigo hexagonal stamp, mounts from -3° |
| `no_medicare` | No Medicare required | ✓ CreditCard with SVG strikethrough overlay |
| `real_gp` | Reviewed by a real GP | ✓ ECG line draws after label on mount |
| `instant_pdf` | Instant PDF to your inbox | ✓ envelope nudges right + fades on hover |

### Social Proof (1)

| ID | Label | Styled? |
|----|-------|---------|
| `social_proof` | `{n} Australians helped` | ✓ counter increments from n-30 → n on mount |

---

## Task 1: Unit Tests for lib/trust-badges.ts

**Files:**
- Create: `lib/__tests__/trust-badges.test.ts`

**What to test:** Registry completeness, preset validity, no badge ID typos, styled tier flags consistent with implementations.

```ts
import { BADGE_REGISTRY, BADGE_PRESETS, type BadgeId } from '@/lib/trust-badges'

describe('BADGE_REGISTRY', () => {
  it('contains all 21 expected badge IDs', () => {
    const expected: BadgeId[] = [
      'ahpra','tga','racgp','medical_director','refund','privacy',
      'stripe','ssl','pci','au_data',
      'no_call','no_speaking','form_only','no_waiting_room','no_appointment',
      'from_your_phone','no_face_to_face','fast_form','same_day',
      'legally_valid','no_medicare','real_gp','instant_pdf',
      'social_proof',
    ]
    expect(Object.keys(BADGE_REGISTRY)).toEqual(expect.arrayContaining(expected))
    expect(Object.keys(BADGE_REGISTRY)).toHaveLength(expected.length)
  })

  it('every badge has required fields', () => {
    for (const [id, config] of Object.entries(BADGE_REGISTRY)) {
      expect(config.id).toBe(id)
      expect(typeof config.label).toBe('string')
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.icon).toBeDefined()
      expect(typeof config.tooltip).toBe('string')
    }
  })

  it('hasStyledTier is true only for badges with known styled implementations', () => {
    const styledIds: BadgeId[] = [
      'ahpra','refund','stripe','au_data',
      'no_call','no_speaking','form_only','no_waiting_room','no_appointment',
      'from_your_phone','same_day',
      'legally_valid','no_medicare','real_gp','instant_pdf',
      'social_proof',
    ]
    for (const id of styledIds) {
      expect(BADGE_REGISTRY[id].hasStyledTier).toBe(true)
    }
    // Explicitly plain-only
    const plainOnly: BadgeId[] = ['tga','racgp','medical_director','privacy','ssl','pci','no_face_to_face','fast_form']
    for (const id of plainOnly) {
      expect(BADGE_REGISTRY[id].hasStyledTier).toBe(false)
    }
  })
})

describe('BADGE_PRESETS', () => {
  it('all preset entries reference valid badge IDs', () => {
    const validIds = new Set(Object.keys(BADGE_REGISTRY))
    for (const [presetName, entries] of Object.entries(BADGE_PRESETS)) {
      for (const entry of entries) {
        const id = typeof entry === 'string' ? entry : entry.id
        expect(validIds.has(id)).toBe(true, `Preset "${presetName}" references unknown id "${id}"`)
      }
    }
  })

  it('hero presets have no more than 4 badges', () => {
    expect(BADGE_PRESETS.hero_medcert.length).toBeLessThanOrEqual(4)
    expect(BADGE_PRESETS.hero_rx.length).toBeLessThanOrEqual(4)
    expect(BADGE_PRESETS.hero_consult.length).toBeLessThanOrEqual(4)
  })

  it('no preset has both no_call and no_speaking', () => {
    for (const [name, entries] of Object.entries(BADGE_PRESETS)) {
      const ids = entries.map(e => typeof e === 'string' ? e : e.id)
      const hasBoth = ids.includes('no_call') && ids.includes('no_speaking')
      expect(hasBoth).toBe(false, `Preset "${name}" has both no_call and no_speaking`)
    }
  })
})
```

**Run:** `pnpm test lib/__tests__/trust-badges.test.ts`
Expected: FAIL (file doesn't exist yet)

**Commit:** `test(trust-badges): failing tests for registry and presets`

---

## Task 2: Create lib/trust-badges.ts

**Files:**
- Create: `lib/trust-badges.ts`

```ts
import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck, FileCheck, BookOpen, UserCheck, ShieldCheck, Eye,
  Lock, Server, PhoneOff, MessageSquareOff, FileText, DoorOpen,
  CalendarX, Smartphone, VideoOff, Timer, Send, CreditCard, Users,
} from 'lucide-react'

export type BadgeId =
  | 'ahpra' | 'tga' | 'racgp' | 'medical_director' | 'refund' | 'privacy'
  | 'stripe' | 'ssl' | 'pci' | 'au_data'
  | 'no_call' | 'no_speaking' | 'form_only' | 'no_waiting_room' | 'no_appointment'
  | 'from_your_phone' | 'no_face_to_face' | 'fast_form' | 'same_day'
  | 'legally_valid' | 'no_medicare' | 'real_gp' | 'instant_pdf'
  | 'social_proof'

export type BadgeVariant = 'plain' | 'styled'

export interface BadgeConfig {
  id: BadgeId
  label: string
  icon: LucideIcon
  /** Plain tier icon color class */
  iconColor: string
  /** Plain tier pill classes — null means icon+label only, no pill bg */
  pillClass: string | null
  hasStyledTier: boolean
  tooltip: string
  tooltipHref?: string
}

export type PresetEntry = BadgeId | { id: BadgeId; variant: BadgeVariant }

export const BADGE_REGISTRY: Record<BadgeId, BadgeConfig> = {
  // ── Credential ────────────────────────────────────────────────────────
  ahpra: {
    id: 'ahpra', label: 'AHPRA-registered doctors', icon: BadgeCheck,
    iconColor: 'text-emerald-600',
    pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
    hasStyledTier: true,
    tooltip: 'All doctors hold current AHPRA registration — independently verifiable',
    tooltipHref: 'https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx',
  },
  tga: {
    id: 'tga', label: 'TGA compliant', icon: FileCheck,
    iconColor: 'text-blue-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Prescribing and processes meet TGA regulatory requirements',
  },
  racgp: {
    id: 'racgp', label: 'RACGP protocols', icon: BookOpen,
    iconColor: 'text-indigo-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Clinical protocols aligned with RACGP Standards for General Practices',
  },
  medical_director: {
    id: 'medical_director', label: 'Medical Director oversight', icon: UserCheck,
    iconColor: 'text-violet-600', pillClass: null, hasStyledTier: false,
    tooltip: 'FRACGP-qualified Medical Director reviews all clinical protocols',
  },
  refund: {
    id: 'refund', label: 'Full refund if declined', icon: ShieldCheck,
    iconColor: 'text-emerald-600',
    pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
    hasStyledTier: true,
    tooltip: 'If your request cannot be approved, you get a full refund',
  },
  privacy: {
    id: 'privacy', label: 'Privacy Act protected', icon: Eye,
    iconColor: 'text-slate-500', pillClass: null, hasStyledTier: false,
    tooltip: 'Your health data is handled under the Australian Privacy Act 1988',
  },

  // ── Payment / Security ───────────────────────────────────────────────
  stripe: {
    id: 'stripe', label: 'Secured by Stripe', icon: Lock,
    iconColor: 'text-[#635BFF]',
    pillClass: 'bg-white border-[#635BFF]/20 text-slate-700 dark:bg-card dark:border-[#635BFF]/30',
    hasStyledTier: true, // always renders Stripe wordmark — no plain fallback
    tooltip: "Payments processed by Stripe — world's leading payment infrastructure",
  },
  ssl: {
    id: 'ssl', label: '256-bit encrypted', icon: Lock,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'All data encrypted in transit with 256-bit TLS',
  },
  pci: {
    id: 'pci', label: 'PCI compliant', icon: ShieldCheck,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Payment Card Industry Data Security Standard compliant',
  },
  au_data: {
    id: 'au_data', label: 'Data stored in Australia', icon: Server,
    iconColor: 'text-blue-600',
    pillClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
    hasStyledTier: true,
    tooltip: 'Your health records never leave Australian servers',
  },

  // ── Friction-free ─────────────────────────────────────────────────────
  no_call: {
    id: 'no_call', label: 'No call required', icon: PhoneOff,
    iconColor: 'text-green-600',
    pillClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
    hasStyledTier: true,
    tooltip: 'No phone call or video call — 100% async review',
  },
  no_speaking: {
    id: 'no_speaking', label: 'No need to speak to anyone', icon: MessageSquareOff,
    iconColor: 'text-green-600',
    pillClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
    hasStyledTier: true,
    tooltip: 'Fully asynchronous — the doctor reviews your form, no conversation needed',
  },
  form_only: {
    id: 'form_only', label: 'Just fill out a form', icon: FileText,
    iconColor: 'text-sky-600',
    pillClass: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300',
    hasStyledTier: true,
    tooltip: "Answer a few questions about your situation — that's the entire process",
  },
  no_waiting_room: {
    id: 'no_waiting_room', label: 'No waiting room', icon: DoorOpen,
    iconColor: 'text-amber-600',
    pillClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
    hasStyledTier: true,
    tooltip: 'No clinic, no queue, no 45-minute wait',
  },
  no_appointment: {
    id: 'no_appointment', label: 'No appointment needed', icon: CalendarX,
    iconColor: 'text-orange-600',
    pillClass: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300',
    hasStyledTier: true,
    tooltip: 'Submit any time — no booking, no scheduling',
  },
  from_your_phone: {
    id: 'from_your_phone', label: 'Done from your phone', icon: Smartphone,
    iconColor: 'text-primary',
    pillClass: 'bg-primary/5 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/30',
    hasStyledTier: true,
    tooltip: 'Complete the entire process from your phone in minutes',
  },
  no_face_to_face: {
    id: 'no_face_to_face', label: 'No face-to-face needed', icon: VideoOff,
    iconColor: 'text-slate-500', pillClass: null, hasStyledTier: false,
    tooltip: 'No video consultation required — all assessments are text-based',
  },
  fast_form: {
    id: 'fast_form', label: '2-minute form', icon: Timer,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Most intake forms take under 2 minutes to complete',
  },
  same_day: {
    id: 'same_day', label: 'Same-day delivery', icon: Send,
    iconColor: 'text-cyan-600',
    pillClass: 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300',
    hasStyledTier: true,
    tooltip: '94% of certificates delivered same day',
  },

  // ── Outcome ───────────────────────────────────────────────────────────
  legally_valid: {
    id: 'legally_valid', label: 'Legally valid certificate', icon: ShieldCheck,
    iconColor: 'text-indigo-600',
    pillClass: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
    hasStyledTier: true,
    tooltip: 'Valid under the Fair Work Act — accepted by all Australian employers',
  },
  no_medicare: {
    id: 'no_medicare', label: 'No Medicare required', icon: CreditCard,
    iconColor: 'text-amber-600',
    pillClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
    hasStyledTier: true,
    tooltip: 'Medicare card optional for medical certificates — pay privately',
  },
  real_gp: {
    id: 'real_gp', label: 'Reviewed by a real GP', icon: BadgeCheck,
    iconColor: 'text-teal-600',
    pillClass: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300',
    hasStyledTier: true,
    tooltip: 'Every request is assessed by a human AHPRA-registered GP — no AI makes clinical decisions',
  },
  instant_pdf: {
    id: 'instant_pdf', label: 'Instant PDF to your inbox', icon: Send,
    iconColor: 'text-sky-600',
    pillClass: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300',
    hasStyledTier: true,
    tooltip: 'Certificate delivered as a PDF to your email and stored in your account',
  },

  // ── Social proof ──────────────────────────────────────────────────────
  social_proof: {
    id: 'social_proof',
    label: 'Australians helped', // dynamic count prepended at render time
    icon: Users,
    iconColor: 'text-primary',
    pillClass: 'bg-primary/5 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/30',
    hasStyledTier: true, // counter increments on mount
    tooltip: 'Real patients across Australia — number grows daily',
  },
}

// ── Presets ────────────────────────────────────────────────────────────
// Max 2 styled badges per row. Never put no_call + no_speaking together.

export const BADGE_PRESETS: Record<string, PresetEntry[]> = {
  // Hero rows — 2 styled, rest plain
  hero_medcert: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_call', variant: 'styled' },
    'refund',
    'ahpra',
  ],
  hero_rx: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_call', variant: 'styled' },
    'refund',
    'no_speaking',
  ],
  hero_consult: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_speaking', variant: 'styled' },
    'refund',
    'no_face_to_face',
  ],
  hero_generic: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_call', variant: 'styled' },
    'refund',
    'ahpra',
  ],

  // Mid-page — credential authority section
  doctor_credibility: [
    { id: 'ahpra', variant: 'styled' },
    { id: 'real_gp', variant: 'styled' },
  ],

  // Pre-CTA — friction removal, just before conversion
  pre_cta: [
    { id: 'no_appointment', variant: 'styled' },
    'no_speaking',
    'from_your_phone',
  ],

  // Service-specific
  medcert_pricing: [
    { id: 'no_medicare', variant: 'styled' },
    { id: 'legally_valid', variant: 'styled' },
    'refund',
  ],
  medcert_outcome: [
    { id: 'same_day', variant: 'styled' },
    { id: 'instant_pdf', variant: 'styled' },
    'legally_valid',
  ],

  // Checkout
  checkout: [
    { id: 'stripe', variant: 'styled' },
    'ssl',
    { id: 'au_data', variant: 'styled' },
    'ahpra',
  ],

  // Footer strip — all plain
  footer: ['ahpra', 'tga', 'medical_director', 'refund', 'privacy'],

  // Sticky float sidebar
  float: [
    { id: 'no_call', variant: 'styled' },
    'ahpra',
  ],
}

/** Resolve a preset entry to { id, variant } */
export function resolveEntry(entry: PresetEntry): { id: BadgeId; variant: BadgeVariant } {
  if (typeof entry === 'string') return { id: entry, variant: 'plain' }
  return entry
}
```

**Run tests:** `pnpm test lib/__tests__/trust-badges.test.ts`
Expected: PASS

**Commit:** `feat(trust-badges): registry with 21 badge atoms and placement presets`

---

## Task 3: TrustBadge Atom — Plain Tier

**Files:**
- Create: `components/shared/trust-badge.tsx`

Build the plain tier only first. No animations — just icon + label + optional pill.

```tsx
'use client'

/**
 * TrustBadge primitive library
 *
 * Usage:
 *   <TrustBadge id="ahpra" />                       // plain (default)
 *   <TrustBadge id="no_call" variant="styled" />     // styled tier
 *   <TrustBadgeRow preset="hero_medcert" />          // preset row
 *   <TrustBadgeGrid preset="credential_grid" />      // 4-col card grid
 */

import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { BADGE_REGISTRY, BADGE_PRESETS, resolveEntry, type BadgeId, type BadgeVariant, type PresetEntry } from '@/lib/trust-badges'

// ── Shared pill wrapper ──────────────────────────────────────────────

function PlainBadge({
  id,
  className,
}: {
  id: BadgeId
  className?: string
}) {
  const config = BADGE_REGISTRY[id]
  const Icon = config.icon
  const hasPill = config.pillClass !== null

  const inner = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        hasPill && cn(
          'px-2.5 py-1 rounded-full border',
          config.pillClass,
        ),
        !hasPill && 'text-muted-foreground',
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  )

  if (!config.tooltip) return inner

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{inner}</div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
        {config.tooltip}
        {config.tooltipHref && (
          <a
            href={config.tooltipHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-1 text-primary underline underline-offset-2"
          >
            Verify →
          </a>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ── Main TrustBadge export ───────────────────────────────────────────
// Styled implementations added in Task 4.

export function TrustBadge({
  id,
  variant = 'plain',
  className,
}: {
  id: BadgeId
  variant?: BadgeVariant
  className?: string
}) {
  const config = BADGE_REGISTRY[id]

  // Fallback: if styled requested but not implemented yet, render plain
  if (variant === 'styled' && config.hasStyledTier) {
    // StyledBadge added in Task 4
    return <PlainBadge id={id} className={className} />
  }

  return <PlainBadge id={id} className={className} />
}

// ── TrustBadgeRow ────────────────────────────────────────────────────

interface TrustBadgeRowProps {
  /** Named preset from BADGE_PRESETS */
  preset?: string
  /** Or pass entries directly */
  badges?: PresetEntry[]
  className?: string
}

export function TrustBadgeRow({ preset, badges, className }: TrustBadgeRowProps) {
  const entries = badges ?? (preset ? BADGE_PRESETS[preset] : [])
  if (!entries?.length) return null

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
        {entries.map((entry) => {
          const { id, variant } = resolveEntry(entry)
          return <TrustBadge key={id} id={id} variant={variant} />
        })}
      </div>
    </TooltipProvider>
  )
}

// ── TrustBadgeGrid ───────────────────────────────────────────────────
// 4-col card grid — replaces TrustBadgeSlider

interface TrustBadgeGridProps {
  preset?: string
  badges?: PresetEntry[]
  className?: string
}

export function TrustBadgeGrid({ preset, badges, className }: TrustBadgeGridProps) {
  const entries = badges ?? (preset ? BADGE_PRESETS[preset] : [])
  if (!entries?.length) return null

  return (
    <TooltipProvider>
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {entries.map((entry) => {
          const { id, variant } = resolveEntry(entry)
          const config = BADGE_REGISTRY[id]
          const Icon = config.icon
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/30 shadow-md shadow-primary/[0.06] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-help">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    config.pillClass ? config.pillClass.split(' ').slice(0, 2).join(' ') : 'bg-muted'
                  )}>
                    <Icon className={cn('w-5 h-5', config.iconColor)} />
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{config.label}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                {config.tooltip}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
```

**Run tests:** `pnpm typecheck`
Expected: no errors

**Commit:** `feat(trust-badge): plain tier atom, TrustBadgeRow, TrustBadgeGrid`

---

## Task 4: Styled Tiers — All Animation Implementations

**Files:**
- Modify: `components/shared/trust-badge.tsx` (add styled implementations)

### Animation implementation guide

**Tool selection:**
- CSS `@keyframes` / Tailwind `animate-pulse` → continuous idle animations (no mount trigger, no JS)
- Framer `motion.*` + `initial/animate` → mount-triggered, one-shot draw animations
- CSS `transition` + Tailwind `hover:` → hover-only (zero runtime cost)
- All Framer animations must check `useReducedMotion()` from `@/components/ui/motion`

### Styled implementations per badge

Add a `StyledBadge` component and update `TrustBadge` to dispatch to it. Implement each case:

**`no_call`** — pulsing green dot + icon + label
```tsx
// Pill with a pulsing green dot to the LEFT of the icon
// dot: w-2 h-2 rounded-full bg-green-500 animate-pulse
// Same pill classes as plain, adds the dot
```

**`no_speaking`** — silence ripple
```tsx
// Icon wrapper: relative. After icon: 2 expanding opacity rings
// ring1: absolute inset-0 rounded-full border border-green-400 animate-ping opacity-0
// ring2: same with animation-delay 0.3s
// Use CSS, not Framer — continuous idle animation
```

**`form_only`** — document lines fill in
```tsx
// Render a tiny inline SVG (3 horizontal lines) to the right of label
// Each line: motion.rect with scaleX: 0 → 1, staggered by 0.15s
// Framer + useReducedMotion
```

**`no_waiting_room`** — clock strikethrough
```tsx
// Custom SVG: clock circle + hands + diagonal line
// On mount: motion.line strokeDashoffset: 20 → 0 (draws the strikethrough)
// Framer + useReducedMotion
```

**`no_appointment`** — CalendarX stroke draws
```tsx
// Render CalendarX icon in pill + the X strokes draw via pathLength animation
// Use inline SVG for the X paths only, wrap in motion
// pathLength: 0 → 1 on mount, stagger 0.1s between the two strokes
```

**`from_your_phone`** — screen glow
```tsx
// Smartphone icon with a subtle radial gradient overlay on the screen area
// On hover: brightness increases (CSS hover:brightness-110 on the icon wrapper)
// Light-weight CSS only
```

**`same_day`** — send nudge
```tsx
// Plain pill + hover: icon translates right 3px + opacity dip
// CSS: hover:translate-x-0.5 on the icon
```

**`ahpra`** — shimmer sweep + verify link on hover
```tsx
// Pill with overflow-hidden + ::after pseudo shimmer (CSS @keyframes shimmer)
// On hover: a light diagonal gradient sweeps across the pill (once, not loop)
// Add CSS via className with a custom Tailwind keyframe defined in globals
// Tooltip shows "Verify on AHPRA register →" with tooltipHref
```

**`refund`** + **`legally_valid`** — hexagonal stamp seal
```tsx
// Not a standard pill — render a custom clip-path hexagon div
// Initial: rotate(-3deg), animate to rotate(0deg) on mount
// refund: emerald. legally_valid: indigo.
// clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)
// Framer motion.div with rotate: -3 → 0
```

**`au_data`** — trailing dot pulse
```tsx
// After the label text: three dots that fade in/out in sequence
// Pure CSS @keyframes: dot1 delay 0s, dot2 delay 0.3s, dot3 delay 0.6s
// opacity: 0 → 1 → 0 loop
```

**`stripe`** — wordmark card (always styled, ignores variant prop)
```tsx
// Not a pill — a small card: bg-white border border-[#635BFF]/20 shadow-sm
// Lock icon in #635BFF + "Secured by" text + actual Stripe wordmark SVG
// On hover: border sharpens to border-[#635BFF]/60
// Stripe wordmark SVG: <text fill="#635BFF" font-family="..." font-size="16" font-weight="600">stripe</text>
// Or use the existing stripe.png from /public/logos/stripe.png as <Image>
```

**`real_gp`** — ECG line draws after label
```tsx
// After the label text: inline SVG of a simplified ECG pulse shape
// SVG path: M0,8 L8,8 L10,2 L14,14 L18,2 L22,8 L30,8 (simplified heartbeat)
// Framer motion.path: pathLength 0 → 1 on mount, duration 0.8s
// Color: text-teal-600, stroke-width 1.5
```

**`no_medicare`** — CreditCard with SVG strikethrough
```tsx
// Render CreditCard icon normally in the pill
// Overlay a thin diagonal line SVG (absolute positioned) across the icon
// Line draws on mount: Framer pathLength 0 → 1, duration 0.4s
// Line: top-left to bottom-right of the icon bounding box
```

**`instant_pdf`** — envelope fly on hover
```tsx
// CSS: group hover on pill wrapper
// Icon: group-hover:translate-x-1 group-hover:opacity-0 transition-all duration-200
// On hover-out: snaps back
```

**`social_proof`** — counter increments on mount
```tsx
// Pulls from usePatientCount() from @/lib/use-patient-count (existing hook)
// Renders: "{count} Australians helped"
// On mount: useMotionValue(count - 30), animate to count over 1.2s with easeOut
// useTransform to round to integer, display via motion.span
// Falls back to plain number if useReducedMotion
```

**After implementing all styled cases, update TrustBadge:**
```tsx
export function TrustBadge({ id, variant = 'plain', className }: ...) {
  const config = BADGE_REGISTRY[id]
  if (variant === 'styled' && config.hasStyledTier) {
    return <StyledBadge id={id} className={className} />
  }
  return <PlainBadge id={id} className={className} />
}
```

**Run:** `pnpm typecheck && pnpm build`

**Commit:** `feat(trust-badge): styled tier animations for all 16 styled badges`

---

## Task 5: SVG Logo Assets

**Files:**
- Create: `public/logos/qantas.svg`
- Create: `public/logos/deloitte.svg`
- Create: `public/logos/pwc.svg`
- Create: `public/logos/kpmg.svg`
- Create: `public/logos/bupa.svg`

These are wordmark SVGs for use in the employer marquee. All will be displayed grayscale at ~28px height, so keep them simple.

**`public/logos/deloitte.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 36" width="110" height="36">
  <text x="2" y="26" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#222222" letter-spacing="-0.5">Deloitte</text>
  <circle cx="105" cy="22" r="4" fill="#86BC25"/>
</svg>
```

**`public/logos/pwc.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" width="60" height="36">
  <text x="2" y="27" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#D04A02" letter-spacing="-1">PwC</text>
</svg>
```

**`public/logos/kpmg.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 36" width="80" height="36">
  <text x="2" y="27" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#00338D" letter-spacing="1">KPMG</text>
</svg>
```

**`public/logos/bupa.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 36" width="72" height="36">
  <text x="2" y="27" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#003087" letter-spacing="0">bupa</text>
</svg>
```

**`public/logos/qantas.svg`** — wordmark only (kangaroo is too complex for inline SVG at this size)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 36" width="100" height="36">
  <text x="2" y="27" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#EE0000" letter-spacing="2">QANTAS</text>
</svg>
```

Note: These are functional wordmarks that match brand colors. They render well at 28px height in grayscale.

**Commit:** `feat(logos): wordmark SVGs for Deloitte, PwC, KPMG, Bupa, Qantas`

---

## Task 6: RegulatorLogoMarquee

**Files:**
- Create: `components/shared/regulator-logo-marquee.tsx`

Replaces `RegulatoryPartners` on homepage. Uses existing logo images from `/public/logos/`.

```tsx
'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/components/ui/motion'

const REGULATOR_LOGOS = [
  { name: 'AHPRA', src: '/logos/AHPRA.png', width: 120, height: 40 },
  { name: 'TGA', src: '/logos/TGA.png', width: 80, height: 40 },
  { name: 'Medicare', src: '/logos/medicare.png', width: 110, height: 40 },
  { name: 'RACGP', src: '/logos/RACGP.png', width: 90, height: 40 },
  { name: 'NATA', src: '/logos/NATA.png', width: 80, height: 40 },
  { name: 'ADHA', src: '/logos/adha.png', width: 110, height: 40 },
]

interface RegulatorLogoMarqueeProps {
  className?: string
  label?: string
}

export function RegulatorLogoMarquee({
  className,
  label = 'Regulated by',
}: RegulatorLogoMarqueeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('py-8', className)}>
      {label && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
          {label}
        </p>
      )}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex">
          <div className={cn(
            'flex items-center gap-12 px-8',
            !prefersReducedMotion && 'animate-marquee-slow',
          )}>
            {/* Duplicate for seamless loop */}
            {[...REGULATOR_LOGOS, ...REGULATOR_LOGOS].map((logo, i) => (
              <div key={i} className="shrink-0 flex items-center justify-center h-10 w-28">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={logo.width}
                  height={logo.height}
                  className="object-contain h-8 w-auto opacity-50 grayscale hover:opacity-80 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Check that `animate-marquee-slow` exists in Tailwind config (used by existing `ComplianceMarquee`). If not, add it to `app/globals.css`:
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.animate-marquee-slow { animation: marquee 40s linear infinite; }
.animate-marquee { animation: marquee 25s linear infinite; }
.animate-marquee-fast { animation: marquee 15s linear infinite; }
```

**Commit:** `feat(regulator-logo-marquee): scrolling regulator logos with fade edges`

---

## Task 7: EmployerLogoMarquee

**Files:**
- Create: `components/shared/employer-logo-marquee.tsx`

Same pattern as `RegulatorLogoMarquee` but faster scroll, more logos. Uses all 18 employer images (13 existing PNGs + 5 new SVGs).

```tsx
'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/components/ui/motion'

const EMPLOYER_LOGOS = [
  { name: 'Woolworths', src: '/logos/woolworths.png' },
  { name: 'Coles', src: '/logos/coles.png' },
  { name: 'Commonwealth Bank', src: '/logos/commonwealthbank.png' },
  { name: 'ANZ', src: '/logos/ANZ.png' },
  { name: 'NAB', src: '/logos/nab.png' },
  { name: 'Westpac', src: '/logos/westpac.png' },
  { name: 'BHP', src: '/logos/BHP.png' },
  { name: 'Telstra', src: '/logos/telstra.png' },
  { name: 'JB Hi-Fi', src: '/logos/jbhifi.png' },
  { name: "McDonald's", src: '/logos/mcdonalds.png' },
  { name: 'Sonic Healthcare', src: '/logos/sonichealthcare.png' },
  { name: 'Bunnings', src: '/logos/bunnings.png' },
  { name: 'Amazon', src: '/logos/amazon.png' },
  { name: 'Qantas', src: '/logos/qantas.svg' },
  { name: 'Deloitte', src: '/logos/deloitte.svg' },
  { name: 'PwC', src: '/logos/pwc.svg' },
  { name: 'KPMG', src: '/logos/kpmg.svg' },
  { name: 'Bupa', src: '/logos/bupa.svg' },
]

interface EmployerLogoMarqueeProps {
  className?: string
}

export function EmployerLogoMarquee({ className }: EmployerLogoMarqueeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('py-8', className)}>
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
        Accepted by employees at
      </p>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex">
          <div className={cn(
            'flex items-center gap-10 px-8',
            !prefersReducedMotion && 'animate-marquee',  // faster than regulator
          )}>
            {[...EMPLOYER_LOGOS, ...EMPLOYER_LOGOS].map((logo, i) => (
              <div key={i} className="shrink-0 h-8 w-24 flex items-center justify-center">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={96}
                  height={32}
                  className="object-contain h-6 w-auto opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Commit:** `feat(employer-logo-marquee): scrolling employer logos, 18 companies`

---

## Task 8: TrustBadgeFloat (Sticky Sidebar)

**Files:**
- Create: `components/shared/trust-badge-float.tsx`

Desktop-only sticky element. Mobile: renders nothing. Shows `LiveWaitTime` dot + 2 badges.

```tsx
'use client'

import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { TrustBadge } from '@/components/shared/trust-badge'
import { TooltipProvider } from '@/components/ui/tooltip'

interface TrustBadgeFloatProps {
  className?: string
  /** Show after this many px of scroll (default: 400) */
  showAfter?: number
}

export function TrustBadgeFloat({ className, showAfter = 400 }: TrustBadgeFloatProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [showAfter])

  if (!visible) return null

  return (
    <TooltipProvider>
      <div className={cn(
        // Hidden on mobile — only desktop
        'hidden xl:flex flex-col gap-2',
        'fixed right-6 top-1/2 -translate-y-1/2 z-40',
        'p-3 rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 shadow-lg shadow-primary/[0.08]',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}>
        <TrustBadge id="no_call" variant="styled" />
        <div className="h-px bg-border/50" />
        <TrustBadge id="ahpra" />
      </div>
    </TooltipProvider>
  )
}
```

**Commit:** `feat(trust-badge-float): sticky desktop sidebar with no_call + ahpra`

---

## Task 9: Update Footer

**Files:**
- Modify: `components/shared/footer.tsx`
- Modify: `components/shared/compliance-marquee.tsx`

**In footer.tsx:**

1. Delete the `FooterTrustBadges` inline function entirely.
2. Import `TrustBadgeRow` and replace usage:

```tsx
// Remove: import { Lock, Shield, Award, Eye, Pill } from "lucide-react"  (keep others)
import { TrustBadgeRow } from '@/components/shared/trust-badge'

// Replace <FooterTrustBadges /> with:
{isMarketing && (
  <div className="py-6 border-t border-border/30 dark:border-border/50">
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-4">
      <div className="flex flex-col items-center gap-2">
        <PaymentMethodIcons size="sm" />
        <StripeBadge variant="powered-by" />
      </div>
      <div className="hidden sm:block h-10 w-px bg-border/50" aria-hidden="true" />
      <LegitScriptSeal size="sm" />
    </div>
    <TrustBadgeRow preset="footer" className="text-xs" />
  </div>
)}
```

**In compliance-marquee.tsx:**

Trim `complianceItems` from 10 → 6. Remove items that now duplicate the footer badge strip above it. Keep items that add NEW information not covered by the strip:

```ts
const complianceItems = [
  { icon: FileCheck, text: 'Legally Valid Certificates' },      // not in footer strip
  { icon: Stethoscope, text: 'Real Australian Doctors' },       // not in footer strip
  { icon: Building2, text: 'Australian Owned & Operated' },     // not in footer strip
  { icon: Shield, text: 'AHPRA Registered Doctors', highlight: true },  // keep — hero credential
  { icon: Lock, text: 'Secure & Encrypted' },                   // not in footer strip
  { icon: CheckCircle2, text: 'Medicare Compliant' },           // not in footer strip
]
// Removed: Medical Director Oversight (in strip), TGA Compliant (in strip),
//          RACGP-Aligned Protocols (in strip), Privacy Act Protected (in strip)
```

**Run:** `pnpm build`

**Commit:** `refactor(footer): replace FooterTrustBadges with TrustBadgeRow, trim compliance marquee`

---

## Task 10: Update Hero + Med Cert Landing

**Files:**
- Modify: `components/marketing/hero.tsx`
- Modify: `components/marketing/med-cert-landing.tsx`

### hero.tsx

Find the inline pill badges section (around line 97–110). Replace the 3 manual spans with:

```tsx
import { TrustBadgeRow } from '@/components/shared/trust-badge'

// Replace the 3 inline pill spans with:
<TrustBadgeRow preset="hero_generic" className="mt-4" />
```

### med-cert-landing.tsx

Locate the inline badges near the hero CTA (around line 436–446). Replace with:

```tsx
import { TrustBadgeRow } from '@/components/shared/trust-badge'

// Below the CTA button:
<TrustBadgeRow preset="hero_medcert" className="mt-3" />

// In the pricing section (replace existing inline text):
<TrustBadgeRow preset="medcert_pricing" className="mt-4" />
```

Also remove the `trustBadges` array at the top of med-cert-intent-page.tsx and replace references to it with `TrustBadgeRow`.

**Run:** `pnpm typecheck`

**Commit:** `refactor(hero, med-cert): replace inline badges with TrustBadgeRow presets`

---

## Task 11: Update Homepage page.tsx — Integrate Scroll Journey

**Files:**
- Modify: `app/page.tsx`

Apply the scroll journey map from the top of this plan. Make these changes:

```tsx
// 1. Add imports
import { RegulatorLogoMarquee } from '@/components/shared/regulator-logo-marquee'
import { EmployerLogoMarquee } from '@/components/shared/employer-logo-marquee'
import { TrustBadgeRow } from '@/components/shared/trust-badge'
import { TrustBadgeFloat } from '@/components/shared/trust-badge-float'

// 2. Replace <TrustBadgeSlider /> with:
<RegulatorLogoMarquee className="px-4" />

// 3. After <DoctorCredibility> and before <StatsStrip>:
<EmployerLogoMarquee className="py-4" />

// 4. Replace <RegulatoryPartners variant="strip" /> with nothing
//    (RegulatorLogoMarquee above replaces it — remove the import too)

// 5. Below <CTABanner> (after the closing tag, before <MarketingFooter>):
<div className="flex justify-center pb-8">
  <TrustBadgeRow preset="pre_cta" />
</div>

// 6. Add <TrustBadgeFloat /> just before <MarketingFooter />:
<TrustBadgeFloat />
```

**Note on DoctorCredibility:** The `ahpra` styled + `real_gp` styled badges should be added INSIDE the `DoctorCredibility` component, not in page.tsx. Pass them via props or add directly to the component. Check `components/marketing/doctor-credibility.tsx` and add a `<TrustBadgeRow preset="doctor_credibility" className="mt-4" />` at the appropriate position inside the component.

**Run:** `pnpm build && pnpm typecheck`

**Commit:** `feat(homepage): integrate scroll journey — regulator marquee, employer marquee, pre-cta badges, float`

---

## Task 12: Consolidate Checkout + Onboarding

**Files:**
- Modify: `components/checkout/trust-badges.tsx`
- Modify: `app/patient/onboarding/onboarding-flow.tsx`
- Modify: `components/shared/inline-onboarding-step.tsx`

The goal: `CheckoutTrustStrip`, `CheckoutSecurityFooter`, `OnboardingTrustFooter` all become wrappers around `TrustBadgeRow`. `DataSecurityStrip` stays as-is for now (Medicare-specific layout).

In `checkout/trust-badges.tsx`, update the three exports to use `TrustBadgeRow` internally while keeping the same import names (so callers don't change):

```tsx
import { TrustBadgeRow } from '@/components/shared/trust-badge'

export function CheckoutTrustStrip({ className }: { className?: string }) {
  return <TrustBadgeRow preset="checkout" className={className} />
}

export function CheckoutSecurityFooter({ className }: { className?: string }) {
  return (
    <div className={cn('border-t border-border/50 pt-4 space-y-3', className)}>
      <div className="flex flex-col items-center gap-2">
        <PaymentMethodIcons />
        <StripeBadge variant="powered-by" />
      </div>
      <TrustBadgeRow preset="checkout" />
    </div>
  )
}

export function OnboardingTrustFooter({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 pt-4 border-t border-border/30', className)}>
      <TrustBadgeRow badges={['ssl', 'ahpra', 'privacy']} />
    </div>
  )
}
```

`DataSecurityStrip` — leave unchanged. It has a medicare-specific layout with custom copy that's better left as-is.

**Run:** `pnpm typecheck`

**Commit:** `refactor(checkout): CheckoutTrustStrip, CheckoutSecurityFooter, OnboardingTrustFooter delegate to TrustBadgeRow`

---

## Task 13: Cleanup + TrustStrip Shim

**Files:**
- Modify: `components/shared/trust-strip.tsx`
- Modify: `components/marketing/trust-badge-slider.tsx`

### trust-strip.tsx

Update existing callers (`profile-drawers.tsx`, `service-funnel-page.tsx`) to use `TrustBadgeRow` directly, OR keep `TrustStrip` as a shim that maps its old `badges` prop to `TrustBadgeRow`. The shim is cleaner since it doesn't require updating all callers.

Map old badge type names → new badge IDs:
```ts
const OLD_TO_NEW: Record<string, BadgeId> = {
  ahpra: 'ahpra',
  encrypted: 'ssl',
  private: 'privacy',
  refund: 'refund',
  tga: 'tga',
}
```

Replace the internals of `TrustStrip` with a delegating call to `TrustBadgeRow`.

### trust-badge-slider.tsx

Delete the internal `trustBadges` array and implementation. Replace the export body with:

```tsx
import { TrustBadgeGrid } from '@/components/shared/trust-badge'

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  return (
    <section className={cn('py-10 lg:py-14 relative', className)}>
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        <TrustBadgeGrid
          badges={['ahpra', 'racgp', 'medical_director', 'tga']}
        />
      </div>
    </section>
  )
}
```

Note: `TrustBadgeSlider` is only used in `app/page.tsx` and is being replaced by `RegulatorLogoMarquee` in Task 11 — so this shim is only needed if any other pages still import it. Grep for remaining usages after Task 11 and remove if zero.

**Run:** `pnpm build && pnpm test`

**Commit:** `refactor(trust-strip, trust-badge-slider): shim to TrustBadgeRow + TrustBadgeGrid`

---

## Final Verification

```bash
pnpm typecheck   # no errors
pnpm build       # clean build, no warnings about missing imports
pnpm test        # trust-badges.test.ts passes
```

Visual check:
1. Homepage scroll: see `social_proof` counter in hero, `no_call` pulsing dot, regulator logos scrolling, employer logos scrolling, `no_appointment` X drawing near CTA
2. Footer: 5 plain badge pills, 6-item compliance marquee (no duplicates)
3. Med cert landing: `no_medicare` strikethrough, `legally_valid` stamp
4. Checkout: Stripe wordmark card visible
5. Desktop (xl breakpoint): float sidebar appears on scroll

**Final commit:** `feat(trust-badges): complete primitive library — 21 atoms, styled tiers, 2 marquees, float`
