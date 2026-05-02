import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck, BookOpen,   CalendarX, CreditCard, DoorOpen,
Eye,
FileCheck, FileText,   Lock, MessageSquareOff, PhoneOff, Send, Server, ShieldCheck, Smartphone, Timer, UserCheck, Users,
VideoOff, } from 'lucide-react'

export type BadgeId =
  | 'ahpra' | 'tga' | 'racgp' | 'medical_director' | 'refund' | 'privacy'
  | 'stripe' | 'ssl' | 'pci' | 'au_data'
  | 'no_call' | 'no_speaking' | 'form_only' | 'no_waiting_room' | 'no_appointment'
  | 'from_your_phone' | 'no_face_to_face' | 'fast_form' | 'same_day'
  | 'legally_valid' | 'no_medicare' | 'real_gp' | 'instant_pdf'
  | 'social_proof'
  | 'legitscript' | 'google_pharmacy'

export type BadgeVariant = 'plain' | 'styled'

export interface BadgeConfig {
  id: BadgeId
  label: string
  icon: LucideIcon
  /** Plain tier icon color class */
  iconColor: string
  /** Plain tier pill classes - null means icon+label only, no pill bg */
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
    tooltip: 'All doctors hold current AHPRA registration - independently verifiable',
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
    hasStyledTier: true,
    tooltip: "Payments processed by Stripe - world's leading payment infrastructure",
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
    tooltip: 'Med-cert requests can be reviewed without a call when clinically appropriate',
  },
  no_speaking: {
    id: 'no_speaking', label: 'Contact only if needed', icon: MessageSquareOff,
    iconColor: 'text-green-600',
    pillClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
    hasStyledTier: true,
    tooltip: 'Form-first review - the doctor contacts you if more information is clinically needed',
  },
  form_only: {
    id: 'form_only', label: 'Just fill out a form', icon: FileText,
    iconColor: 'text-sky-600',
    pillClass: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300',
    hasStyledTier: true,
    tooltip: "Answer a few questions about your situation - that's the entire process",
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
    tooltip: 'Submit any time - no booking, no scheduling',
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
    tooltip: 'No video consultation required - all assessments are text-based',
  },
  fast_form: {
    id: 'fast_form', label: '2-minute form', icon: Timer,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Most intake forms take under 2 minutes to complete',
  },
  same_day: {
    id: 'same_day', label: 'Certificate delivery', icon: Send,
    iconColor: 'text-cyan-600',
    pillClass: 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300',
    hasStyledTier: true,
    tooltip: '94% of certificates delivered after doctor approval',
  },

  // ── Outcome ───────────────────────────────────────────────────────────
  legally_valid: {
    id: 'legally_valid', label: 'Legally valid certificate', icon: ShieldCheck,
    iconColor: 'text-indigo-600',
    pillClass: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
    hasStyledTier: true,
    tooltip: 'Issued by an AHPRA-registered doctor. Employer policies may vary',
  },
  no_medicare: {
    id: 'no_medicare', label: 'No Medicare required', icon: CreditCard,
    iconColor: 'text-amber-600',
    pillClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
    hasStyledTier: true,
    tooltip: 'Medicare card optional for medical certificates - pay privately',
  },
  real_gp: {
    id: 'real_gp', label: 'Reviewed by a real GP', icon: BadgeCheck,
    iconColor: 'text-teal-600',
    pillClass: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300',
    hasStyledTier: true,
    tooltip: 'Every request is assessed by a human AHPRA-registered GP - no AI makes clinical decisions',
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
    label: 'Australians helped',
    icon: Users,
    iconColor: 'text-primary',
    pillClass: 'bg-primary/5 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/30',
    hasStyledTier: true,
    tooltip: 'Real patients across Australia - number grows daily',
  },

  // ── Third-party certifications ────────────────────────────────────────
  legitscript: {
    id: 'legitscript',
    label: 'LegitScript certified',
    icon: BadgeCheck,
    iconColor: 'text-[#00A651]',
    pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
    hasStyledTier: true,
    tooltip: 'LegitScript certified healthcare merchant - the global verification standard used by Google, Bing, Meta, and major payment processors for online pharmacies and telehealth providers',
    tooltipHref: 'https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au',
  },
  google_pharmacy: {
    id: 'google_pharmacy',
    label: 'Google certified',
    icon: ShieldCheck,
    iconColor: 'text-[#4285F4]',
    pillClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
    hasStyledTier: true,
    tooltip: 'Google Ads Online Pharmacy Certification - approved to advertise healthcare services on Google Search (Account: 920-501-0513)',
  },
}

// ── Presets ────────────────────────────────────────────────────────────
// Max 2 styled badges per row. Never put no_call + no_speaking together.

export const BADGE_PRESETS: Record<string, PresetEntry[]> = {
  // Hero rows - 2 styled, rest plain
  hero_medcert: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_call', variant: 'styled' },
    'refund',
    'ahpra',
  ],
  hero_rx: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_appointment', variant: 'styled' },
    'refund',
    'ahpra',
  ],
  hero_consult: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'form_only', variant: 'styled' },
    'refund',
    'no_face_to_face',
  ],
  hero_generic: [
    { id: 'social_proof', variant: 'styled' },
    { id: 'no_waiting_room', variant: 'styled' },
    'refund',
    'ahpra',
  ],

  // Mid-page credential authority
  doctor_credibility: [
    { id: 'ahpra', variant: 'styled' },
    { id: 'real_gp', variant: 'styled' },
  ],

  // Pre-CTA - friction removal
  pre_cta: [
    { id: 'no_appointment', variant: 'styled' },
    'form_only',
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
    { id: 'legitscript', variant: 'styled' },
    { id: 'google_pharmacy', variant: 'styled' },
  ],

  // Footer strip - 3 most consumer-relevant
  footer: ['ahpra', 'refund', 'privacy'],

  // Third-party certification logos - styled logo cards
  trust_certifications: [
    { id: 'legitscript', variant: 'styled' },
    { id: 'google_pharmacy', variant: 'styled' },
  ],

  // Trust Ribbon - the 4-badge authority row that sits under every hero.
  // Credential + independent cert + privacy framework + transport encryption.
  // Each badge has a tooltipHref where possible so the claim is verifiable.
  trust_ribbon: [
    { id: 'ahpra', variant: 'styled' },
    { id: 'legitscript', variant: 'styled' },
    'privacy',
    'ssl',
  ],

  // Sticky float sidebar
  float: [
    { id: 'no_appointment', variant: 'styled' },
    'ahpra',
  ],
}

/** Resolve a preset entry to { id, variant } */
export function resolveEntry(entry: PresetEntry): { id: BadgeId; variant: BadgeVariant } {
  if (typeof entry === 'string') return { id: entry, variant: 'plain' }
  return entry
}
