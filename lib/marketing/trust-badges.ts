import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  CalendarX,
  CreditCard,
  DoorOpen,
  Eye,
  FileCheck,
  FileText,
  Lock,
  MessageSquare,
  PhoneOff,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Timer,
  UserCheck,
  Users,
  VideoOff,
} from 'lucide-react'

import { getApprovedClaim } from "@/lib/marketing/approved-claims"

export type BadgeId =
  | 'ahpra' | 'tga' | 'documented_protocols' | 'medical_director' | 'refund' | 'privacy'
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
    id: 'tga', label: 'TGA advertising-aware', icon: FileCheck,
    iconColor: 'text-blue-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Public prescription-medicine promotion is restricted; prescribing is handled only after doctor review',
  },
  documented_protocols: {
    id: 'documented_protocols', label: 'Documented protocols', icon: FileText,
    iconColor: 'text-indigo-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Clear service scope, clinical checks, and review rules are documented before a request reaches the doctor',
  },
  medical_director: {
    id: 'medical_director', label: 'Clinical oversight', icon: UserCheck,
    iconColor: 'text-primary', pillClass: null, hasStyledTier: false,
    tooltip: 'AHPRA-registered medical leadership maintains the clinical governance framework',
  },
  refund: {
    id: 'refund', label: getApprovedClaim("refund_guarantee_label"), icon: ShieldCheck,
    iconColor: 'text-emerald-600',
    pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("refund_guarantee"),
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
    tooltip: "Payments are handled by Stripe. InstantMed does not store your card details",
  },
  ssl: {
    id: 'ssl', label: 'Encrypted connection', icon: Lock,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'TLS protects information while it travels between your browser and InstantMed',
  },
  pci: {
    id: 'pci', label: 'Stripe-hosted payment', icon: ShieldCheck,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'Card details are handled by Stripe rather than stored by InstantMed',
  },
  au_data: {
    id: 'au_data', label: 'Australian health-record storage', icon: Server,
    iconColor: 'text-blue-600',
    pillClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
    hasStyledTier: true,
    tooltip: 'Primary health records are stored on Australian-hosted infrastructure',
  },

  // ── Friction-free ─────────────────────────────────────────────────────
  no_call: {
    id: 'no_call', label: getApprovedClaim("trust_simple_cert_label"), icon: PhoneOff,
    iconColor: 'text-green-600',
    pillClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_simple_cert_tooltip"),
  },
  no_speaking: {
    id: 'no_speaking', label: getApprovedClaim("trust_talk_if_needed_label"), icon: MessageSquare,
    iconColor: 'text-green-600',
    pillClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_talk_if_needed_tooltip"),
  },
  form_only: {
    id: 'form_only', label: getApprovedClaim("trust_form_first_label"), icon: FileText,
    iconColor: 'text-sky-600',
    pillClass: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_form_first_tooltip"),
  },
  no_waiting_room: {
    id: 'no_waiting_room', label: getApprovedClaim("trust_no_waiting_room_label"), icon: DoorOpen,
    iconColor: 'text-amber-600',
    pillClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_no_waiting_room_tooltip"),
  },
  no_appointment: {
    id: 'no_appointment', label: getApprovedClaim("trust_no_appointment_label"), icon: CalendarX,
    iconColor: 'text-orange-600',
    pillClass: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_no_appointment_tooltip"),
  },
  from_your_phone: {
    id: 'from_your_phone', label: 'Start from your phone', icon: Smartphone,
    iconColor: 'text-primary',
    pillClass: 'bg-primary/5 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/30',
    hasStyledTier: true,
    tooltip: 'Start the secure form from your phone; the doctor may contact you if needed',
  },
  no_face_to_face: {
    id: 'no_face_to_face', label: 'No booked video appointment', icon: VideoOff,
    iconColor: 'text-slate-500', pillClass: null, hasStyledTier: false,
    tooltip: getApprovedClaim("form_first_wedge"),
  },
  fast_form: {
    id: 'fast_form', label: 'About 3-minute form', icon: Timer,
    iconColor: 'text-teal-600', pillClass: null, hasStyledTier: false,
    tooltip: 'The secure intake form is designed to take about 3 minutes',
  },
  same_day: {
    id: 'same_day', label: getApprovedClaim("trust_digital_delivery_label"), icon: Send,
    iconColor: 'text-cyan-600',
    pillClass: 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_digital_delivery_tooltip"),
  },

  // ── Outcome ───────────────────────────────────────────────────────────
  legally_valid: {
    id: 'legally_valid', label: getApprovedClaim("trust_doctor_issued_label"), icon: ShieldCheck,
    iconColor: 'text-indigo-600',
    pillClass: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("trust_doctor_issued_tooltip"),
  },
  no_medicare: {
    id: 'no_medicare', label: 'No Medicare required', icon: CreditCard,
    iconColor: 'text-amber-600',
    pillClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
    hasStyledTier: true,
    tooltip: 'Medicare card optional for medical certificates - pay privately',
  },
  real_gp: {
    id: 'real_gp', label: 'Doctor-owned clinical pathway', icon: BadgeCheck,
    iconColor: 'text-teal-600',
    pillClass: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("clinical_decision_model"),
  },
  instant_pdf: {
    id: 'instant_pdf', label: 'PDF if approved', icon: Send,
    iconColor: 'text-sky-600',
    pillClass: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300',
    hasStyledTier: true,
    tooltip: 'If approved, the certificate is delivered as a PDF to your email and dashboard',
  },

  // ── Social proof ──────────────────────────────────────────────────────
  social_proof: {
    id: 'social_proof',
    label: 'Australia-wide service',
    icon: Users,
    iconColor: 'text-primary',
    pillClass: 'bg-primary/5 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/30',
    hasStyledTier: true,
    tooltip: 'Available to eligible adults located in Australia',
  },

  // ── Third-party certifications ────────────────────────────────────────
  legitscript: {
    id: 'legitscript',
    label: getApprovedClaim("legitscript_label"),
    icon: BadgeCheck,
    iconColor: 'text-[#00A651]',
    pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("legitscript_tooltip"),
    tooltipHref: 'https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au',
  },
  google_pharmacy: {
    id: 'google_pharmacy',
    label: getApprovedClaim("google_healthcare_ads_label"),
    icon: ShieldCheck,
    iconColor: 'text-[#4285F4]',
    pillClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300',
    hasStyledTier: true,
    tooltip: getApprovedClaim("google_healthcare_ads_tooltip"),
  },
}

// ── Presets ────────────────────────────────────────────────────────────
// Max 2 styled badges per row. Never put no_call + no_speaking together.

export const BADGE_PRESETS: Record<string, PresetEntry[]> = {
  // Hero rows - 2 styled, rest plain
  hero_medcert: [
    { id: 'no_appointment', variant: 'styled' },
    { id: 'no_call', variant: 'styled' },
    'refund',
    'ahpra',
  ],
  hero_rx: [
    { id: 'no_appointment', variant: 'styled' },
    { id: 'form_only', variant: 'styled' },
    'refund',
    'google_pharmacy',
  ],
  hero_consult: [
    { id: 'form_only', variant: 'styled' },
    { id: 'no_waiting_room', variant: 'styled' },
    'refund',
    'no_face_to_face',
  ],
  hero_generic: [
    { id: 'no_waiting_room', variant: 'styled' },
    { id: 'form_only', variant: 'styled' },
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
    'no_waiting_room',
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

  // Checkout - compact conversion row only. Keep heavier proof off the pay/review step.
  checkout: [
    { id: 'stripe', variant: 'styled' },
    'ahpra',
    'refund',
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
    'documented_protocols',
    'privacy',
  ],

  // Sticky float sidebar
  float: [
    { id: 'no_appointment', variant: 'styled' },
    'form_only',
  ],
}

/** Resolve a preset entry to { id, variant } */
export function resolveEntry(entry: PresetEntry): { id: BadgeId; variant: BadgeVariant } {
  if (typeof entry === 'string') return { id: entry, variant: 'plain' }
  return entry
}
