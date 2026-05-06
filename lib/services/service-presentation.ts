import { normalizeServiceType } from "@/lib/constants/service-types"
import type { ServiceType } from "@/types/db"

export interface ServicePresentationInput {
  type?: string | null
  category?: string | null
  name?: string | null
  shortName?: string | null
}

export interface ServicePresentation {
  key: string
  label: string
  shortLabel: string
  adminFilterValue: AdminServiceFilterValue
}

export const ADMIN_SERVICE_FILTER_OPTIONS = [
  { value: "all", label: "All services" },
  { value: "med_certs", label: "Medical certificates" },
  { value: "repeat_rx", label: "Repeat scripts" },
  { value: "consults", label: "Consults" },
] as const

export type AdminServiceFilterValue = (typeof ADMIN_SERVICE_FILTER_OPTIONS)[number]["value"]

const SERVICE_PRESENTATION: Record<string, ServicePresentation> = {
  med_certs: {
    key: "med_certs",
    label: "Medical certificate",
    shortLabel: "Med cert",
    adminFilterValue: "med_certs",
  },
  common_scripts: {
    key: "common_scripts",
    label: "Repeat prescription",
    shortLabel: "Script",
    adminFilterValue: "repeat_rx",
  },
  repeat_rx: {
    key: "repeat_rx",
    label: "Repeat prescription",
    shortLabel: "Script",
    adminFilterValue: "repeat_rx",
  },
  consults: {
    key: "consults",
    label: "Consultation",
    shortLabel: "Consult",
    adminFilterValue: "consults",
  },
  consult: {
    key: "consult",
    label: "Consultation",
    shortLabel: "Consult",
    adminFilterValue: "consults",
  },
  mens_health: {
    key: "mens_health",
    label: "Men's health",
    shortLabel: "Men's health",
    adminFilterValue: "consults",
  },
  womens_health: {
    key: "womens_health",
    label: "Women's health",
    shortLabel: "Women's",
    adminFilterValue: "consults",
  },
  weight_loss: {
    key: "weight_loss",
    label: "Weight management",
    shortLabel: "Weight",
    adminFilterValue: "consults",
  },
}

const PRESENTATION_ALIASES: Record<string, string> = {
  med_cert: "med_certs",
  medcert: "med_certs",
  medical_certificate: "med_certs",
  prescription: "common_scripts",
  repeat_script: "repeat_rx",
  repeat_scripts: "repeat_rx",
  script: "repeat_rx",
  scripts: "repeat_rx",
  ed: "mens_health",
  erectile_dysfunction: "mens_health",
  hair_loss: "mens_health",
  general_consult: "consults",
  consultation: "consults",
}

function titleCaseFallback(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizePresentationKey(value?: string | null): string | null {
  if (!value) return null

  const normalized = value.toLowerCase().replace(/[-\s]/g, "_")
  const canonical = normalizeServiceType(normalized)
  if (canonical) return canonical

  if (normalized in SERVICE_PRESENTATION) return normalized
  return PRESENTATION_ALIASES[normalized] ?? null
}

export function getServicePresentation(input: ServicePresentationInput): ServicePresentation {
  const key =
    normalizePresentationKey(input.type) ??
    normalizePresentationKey(input.category)

  if (key && SERVICE_PRESENTATION[key]) {
    return SERVICE_PRESENTATION[key]
  }

  const fallbackLabel =
    input.shortName?.trim() ||
    input.name?.trim() ||
    input.type?.trim() ||
    input.category?.trim() ||
    "Request"

  return {
    key: key ?? "unknown",
    label: titleCaseFallback(fallbackLabel),
    shortLabel: titleCaseFallback(fallbackLabel),
    adminFilterValue: "all",
  }
}

export function matchesAdminServiceFilter(
  input: ServicePresentationInput,
  filterValue: string,
): boolean {
  if (filterValue === "all") return true

  const presentation = getServicePresentation(input)
  return presentation.adminFilterValue === filterValue
}

export function isKnownServiceType(value: string): value is ServiceType {
  return Boolean(normalizeServiceType(value))
}
