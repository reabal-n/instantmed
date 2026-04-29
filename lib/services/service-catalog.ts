/**
 * Service Catalog — Single Source of Truth
 *
 * One canonical definition per service. Consumed by:
 *   - Home service grid (components/marketing/service-cards.tsx via lib/marketing/homepage.ts)
 *   - Intake service hub (components/request/service-hub-screen.tsx)
 *   - Pricing page (app/pricing/pricing-client.tsx)
 *   - Services dropdown (components/shared/navbar/services-dropdown.tsx)
 *   - Mobile menu (components/shared/navbar/mobile-menu-content.tsx)
 *
 * Adding/changing a service? Update this file, not the consumers.
 *
 * See: docs/plans/2026-04-20-design-system-95-sprint.md (Task 1.2)
 * See: docs/DESIGN_SYSTEM.md §1 (colour tokens), §7 (service icon tiles)
 */
import { PRICING_DISPLAY } from "@/lib/constants"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

// ─── Types ──────────────────────────────────────────────────────────────────

export type CanonicalServiceId =
  | "med-cert"
  | "repeat-rx"
  | "ed"
  | "hair-loss"
  | "general-consult"
  | "womens-health"
  | "weight-loss"

// Canonical icon key. Maps into ServiceIconTile's iconComponents + stickerMap.
export type ServiceIconKey =
  | "FileText"
  | "Pill"
  | "Lightning"
  | "Sparkles"
  | "Stethoscope"
  | "Heart"
  | "Flame"

// Canonical colour token. Maps into serviceColorConfig.
// Hair loss uses 'amber' per DESIGN_SYSTEM.md §1 (--service-hair: #F59E0B).
// NOTE: legacy `violet` token is preserved only for opt-in uses (none today).
export type ServiceColorToken =
  | "emerald"  // medical certificates
  | "cyan"     // repeat prescriptions
  | "blue"     // ED treatment
  | "amber"    // hair loss (was `violet`; fixed in Phase 1)
  | "sky"      // general consult
  | "pink"     // women's health (coming soon)
  | "rose"     // weight loss (coming soon)

export interface ServiceDef {
  /** Stable identifier, used in analytics and routing. */
  id: CanonicalServiceId
  /** Display title. Sentence case. */
  title: string
  /** Short descriptive subtitle. ~50 chars max. */
  subtitle: string
  /** Canonical marketing slug (matches app route directory). */
  slug: string
  /** Fully-qualified price display string ("$19.95", "From $49.95"). */
  price: string
  /** Optional price prefix ("From", "Starts at"). */
  pricePrefix?: string
  /** Lower-bound price as numeric for sort/display. */
  priceFrom: number
  /** Typical effort/time to complete intake. */
  effort: string
  /** Icon key. Must exist in ServiceIconTile iconComponents. */
  iconKey: ServiceIconKey
  /** Colour token. Must exist in serviceColorConfig. */
  colorToken: ServiceColorToken
  /** Intake flow service type. */
  serviceRoute: UnifiedServiceType
  /** Optional consult subtype for consult-flow services. */
  subtype?: string
  /** Marketing-only: marked as "most popular" on grids. */
  popular?: boolean
  /** Hidden from primary grids, surfaced in "Coming Soon" only. */
  comingSoon?: boolean
}

// ─── Canonical definitions ──────────────────────────────────────────────────

export const SERVICE_CATALOG: Record<CanonicalServiceId, ServiceDef> = {
  "med-cert": {
    id: "med-cert",
    title: "Medical certificate",
    subtitle: "No call for suitable requests",
    slug: "medical-certificate",
    price: PRICING_DISPLAY.MED_CERT,
    pricePrefix: "From",
    priceFrom: 19.95,
    effort: "~2 min",
    iconKey: "FileText",
    colorToken: "emerald",
    serviceRoute: "med-cert",
    popular: true,
  },
  "repeat-rx": {
    id: "repeat-rx",
    title: "Refill a prescription",
    subtitle: "Form-first medication review",
    slug: "prescriptions",
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    priceFrom: 29.95,
    effort: "~3 min",
    iconKey: "Pill",
    colorToken: "cyan",
    serviceRoute: "repeat-script",
  },
  ed: {
    id: "ed",
    title: "Erectile dysfunction",
    subtitle: "Discreet form-first assessment",
    slug: "erectile-dysfunction",
    price: PRICING_DISPLAY.MENS_HEALTH,
    priceFrom: 49.95,
    effort: "~4 min",
    iconKey: "Lightning",
    colorToken: "blue",
    serviceRoute: "consult",
    subtype: "ed",
  },
  "hair-loss": {
    id: "hair-loss",
    title: "Hair loss treatment",
    subtitle: "Private form-first assessment",
    slug: "hair-loss",
    price: PRICING_DISPLAY.HAIR_LOSS,
    priceFrom: 49.95,
    effort: "~2 min",
    iconKey: "Sparkles",
    colorToken: "amber", // was 'violet'; fixed per audit C1/C2
    serviceRoute: "consult",
    subtype: "hair_loss",
  },
  "general-consult": {
    id: "general-consult",
    title: "General consultation",
    subtitle: "Manual review for other concerns",
    slug: "consult",
    price: PRICING_DISPLAY.CONSULT,
    priceFrom: 49.95,
    effort: "~5 min",
    iconKey: "Stethoscope",
    colorToken: "sky",
    serviceRoute: "consult",
    subtype: "general",
  },
  "womens-health": {
    id: "womens-health",
    title: "Women's health",
    subtitle: "Contraception, UTI treatment & more",
    slug: "womens-health",
    price: "$59.95",
    priceFrom: 59.95,
    effort: "~4 min",
    iconKey: "Heart",
    colorToken: "pink",
    serviceRoute: "consult",
    subtype: "womens_health",
    comingSoon: true,
  },
  "weight-loss": {
    id: "weight-loss",
    title: "Weight management",
    subtitle: "Doctor-guided treatment plan",
    slug: "weight-loss",
    price: "$89.95",
    priceFrom: 89.95,
    effort: "~6 min",
    iconKey: "Flame",
    colorToken: "rose",
    serviceRoute: "consult",
    subtype: "weight_loss",
    comingSoon: true,
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getService(id: CanonicalServiceId): ServiceDef {
  return SERVICE_CATALOG[id]
}

export function getAllServices(): ServiceDef[] {
  return Object.values(SERVICE_CATALOG)
}

export function getActiveServices(): ServiceDef[] {
  return getAllServices().filter((s) => !s.comingSoon)
}

export function getComingSoonServices(): ServiceDef[] {
  return getAllServices().filter((s) => s.comingSoon)
}

export function getServiceBySlug(slug: string): ServiceDef | undefined {
  return getAllServices().find((s) => s.slug === slug)
}
