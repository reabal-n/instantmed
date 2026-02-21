/**
 * Centralized Service Type Definitions
 * 
 * CANONICAL NAMING CONVENTION:
 * - Database/API: snake_case (e.g., "med_certs", "common_scripts")
 * - URL slugs: kebab-case (e.g., "medical-certificate", "repeat-prescription")
 * - Display: Title Case (e.g., "Medical Certificate", "Repeat Prescription")
 * 
 * This file is the single source of truth for service type mappings.
 * Import from here instead of defining service types inline.
 */

import type { ServiceType } from "@/types/db"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

// ============================================================================
// CANONICAL SERVICE TYPES (Database format - snake_case)
// ============================================================================

export const SERVICE_TYPES = {
  MED_CERTS: "med_certs",
  COMMON_SCRIPTS: "common_scripts",
  WEIGHT_LOSS: "weight_loss",
  MENS_HEALTH: "mens_health",
  WOMENS_HEALTH: "womens_health",
  REFERRALS: "referrals",
  PATHOLOGY: "pathology",
} as const satisfies Record<string, ServiceType>

// ============================================================================
// URL SLUG MAPPINGS (for routing)
// ============================================================================

export const SERVICE_URL_SLUGS: Record<ServiceType, string> = {
  med_certs: "medical-certificate",
  common_scripts: "repeat-prescription",
  weight_loss: "weight-loss",
  mens_health: "mens-health",
  womens_health: "womens-health",
  referrals: "referrals",
  pathology: "pathology",
}

export const URL_SLUG_TO_SERVICE: Record<string, ServiceType> = {
  "medical-certificate": "med_certs",
  "med-cert": "med_certs",
  "med-certs": "med_certs",
  "repeat-prescription": "common_scripts",
  "repeat-script": "common_scripts",
  "prescription": "common_scripts",
  "weight-loss": "weight_loss",
  "mens-health": "mens_health",
  "womens-health": "womens_health",
  "referrals": "referrals",
  "pathology": "pathology",
}

// ============================================================================
// DISPLAY NAMES
// ============================================================================

export const SERVICE_DISPLAY_NAMES: Record<ServiceType, string> = {
  med_certs: "Medical Certificate",
  common_scripts: "Repeat Prescription",
  weight_loss: "Weight Management",
  mens_health: "Men's Health",
  womens_health: "Women's Health",
  referrals: "Specialist Referral",
  pathology: "Pathology Request",
}

export const SERVICE_SHORT_NAMES: Record<ServiceType, string> = {
  med_certs: "Med Cert",
  common_scripts: "Script",
  weight_loss: "Weight",
  mens_health: "Men's",
  womens_health: "Women's",
  referrals: "Referral",
  pathology: "Pathology",
}

// ============================================================================
// SERVICE METADATA
// ============================================================================

export interface ServiceMetadata {
  type: ServiceType
  displayName: string
  shortName: string
  urlSlug: string
  description: string
  estimatedTime: string
  price: string
  priceInCents: number
  requiresConsult: boolean
  icon: string // Lucide icon name
}

export const SERVICE_METADATA: Record<ServiceType, ServiceMetadata> = {
  med_certs: {
    type: "med_certs",
    displayName: "Medical Certificate",
    shortName: "Med Cert",
    urlSlug: "medical-certificate",
    description: "Get a medical certificate for work or study",
    estimatedTime: "15 minutes",
    price: PRICING_DISPLAY.MED_CERT,
    priceInCents: PRICING.MED_CERT * 100,
    requiresConsult: false,
    icon: "FileText",
  },
  common_scripts: {
    type: "common_scripts",
    displayName: "Repeat Prescription",
    shortName: "Script",
    urlSlug: "repeat-prescription",
    description: "Renew your regular medication",
    estimatedTime: "30 minutes",
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    priceInCents: PRICING.REPEAT_SCRIPT * 100,
    requiresConsult: false,
    icon: "Pill",
  },
  weight_loss: {
    type: "weight_loss",
    displayName: "Weight Management",
    shortName: "Weight",
    urlSlug: "weight-loss",
    description: "Medical weight management consultation",
    estimatedTime: "1-2 hours",
    price: PRICING_DISPLAY.CONSULT,
    priceInCents: PRICING.CONSULT * 100,
    requiresConsult: true,
    icon: "Scale",
  },
  mens_health: {
    type: "mens_health",
    displayName: "Men's Health",
    shortName: "Men's",
    urlSlug: "mens-health",
    description: "Confidential men's health consultation",
    estimatedTime: "1-2 hours",
    price: PRICING_DISPLAY.MENS_HEALTH,
    priceInCents: PRICING.MENS_HEALTH * 100,
    requiresConsult: true,
    icon: "User",
  },
  womens_health: {
    type: "womens_health",
    displayName: "Women's Health",
    shortName: "Women's",
    urlSlug: "womens-health",
    description: "Women's health consultation",
    estimatedTime: "1-2 hours",
    price: PRICING_DISPLAY.WOMENS_HEALTH,
    priceInCents: PRICING.WOMENS_HEALTH * 100,
    requiresConsult: true,
    icon: "Heart",
  },
  referrals: {
    type: "referrals",
    displayName: "Specialist Referral",
    shortName: "Referral",
    urlSlug: "referrals",
    description: "Get a referral to a specialist",
    estimatedTime: "1-2 hours",
    price: PRICING_DISPLAY.REFERRAL,
    priceInCents: PRICING.REFERRAL * 100,
    requiresConsult: true,
    icon: "FileCheck",
  },
  pathology: {
    type: "pathology",
    displayName: "Pathology Request",
    shortName: "Pathology",
    urlSlug: "pathology",
    description: "Request blood tests or pathology",
    estimatedTime: "1-2 hours",
    price: PRICING_DISPLAY.PATHOLOGY,
    priceInCents: PRICING.PATHOLOGY * 100,
    requiresConsult: true,
    icon: "TestTube",
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert any service type format to canonical database format
 */
export function normalizeServiceType(input: string): ServiceType | null {
  const normalized = input.toLowerCase().replace(/[-_\s]/g, "_")
  
  // Direct match
  if (normalized in SERVICE_METADATA) {
    return normalized as ServiceType
  }
  
  // URL slug match
  const fromSlug = URL_SLUG_TO_SERVICE[input.toLowerCase()]
  if (fromSlug) return fromSlug
  
  // Common variations
  const variations: Record<string, ServiceType> = {
    med_cert: "med_certs",
    medical_certificate: "med_certs",
    medcert: "med_certs",
    script: "common_scripts",
    scripts: "common_scripts",
    repeat_script: "common_scripts",
    repeat_scripts: "common_scripts",
    prescription: "common_scripts",
    weight: "weight_loss",
    weightloss: "weight_loss",
    mens: "mens_health",
    men: "mens_health",
    womens: "womens_health",
    women: "womens_health",
    referral: "referrals",
    pathology_request: "pathology",
  }
  
  return variations[normalized] || null
}

/**
 * Get display name for any service type format
 */
export function getServiceDisplayName(input: string): string {
  const normalized = normalizeServiceType(input)
  if (normalized) {
    return SERVICE_DISPLAY_NAMES[normalized]
  }
  // Fallback: title case the input
  return input
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Get URL slug for a service type
 */
export function getServiceUrlSlug(serviceType: ServiceType): string {
  return SERVICE_URL_SLUGS[serviceType] || serviceType.replace(/_/g, "-")
}

/**
 * Get service type from URL slug
 */
export function getServiceFromSlug(slug: string): ServiceType | null {
  return URL_SLUG_TO_SERVICE[slug.toLowerCase()] || null
}

/**
 * Get full metadata for a service
 */
export function getServiceMetadata(serviceType: ServiceType): ServiceMetadata {
  return SERVICE_METADATA[serviceType]
}

/**
 * Check if a service requires a phone consultation
 */
export function serviceRequiresConsult(serviceType: ServiceType): boolean {
  return SERVICE_METADATA[serviceType]?.requiresConsult ?? true
}

// ============================================================================
// DRAFT GENERATION MAPPING
// ============================================================================

/**
 * Draft category for AI draft generation
 * Maps canonical service types to the type of draft to generate
 */
export type DraftCategory = "med_cert" | "repeat_rx" | "consult"

/**
 * Map canonical service type to draft category
 * Used by generate-drafts.ts to determine which draft type to generate
 */
export function getDraftCategory(serviceType: ServiceType): DraftCategory {
  switch (serviceType) {
    case "med_certs":
      return "med_cert"
    case "common_scripts":
      return "repeat_rx"
    // All other service types get a consult draft
    case "weight_loss":
    case "mens_health":
    case "womens_health":
    case "referrals":
    case "pathology":
    default:
      return "consult"
  }
}

/**
 * Check if a service type supports AI draft generation
 * Returns true for all known service types
 */
export function supportsDraftGeneration(serviceType: ServiceType): boolean {
  return serviceType in SERVICE_METADATA
}
