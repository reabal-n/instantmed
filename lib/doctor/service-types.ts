/**
 * Canonical service type strings used in doctor portal logic.
 * Matches the `service.type` field on intake rows.
 */
export const SERVICE_TYPES = {
  MED_CERTS: "med_certs",
  REPEAT_RX: "repeat_rx",
  COMMON_SCRIPTS: "common_scripts",
  CONSULT: "consult",
  CONSULTS: "consults",
} as const

export type ServiceTypeValue = (typeof SERVICE_TYPES)[keyof typeof SERVICE_TYPES]

const PRESCRIBING_CONSULT_SUBTYPES = new Set(["ed", "hair_loss"])
const PRESCRIBING_SERVICE_TYPES = new Set([
  SERVICE_TYPES.COMMON_SCRIPTS,
  SERVICE_TYPES.REPEAT_RX,
  "prescription",
  "repeat-script",
])

export function isConsultServiceType(type?: string | null): boolean {
  return type === SERVICE_TYPES.CONSULT || type === SERVICE_TYPES.CONSULTS
}

export function isPrescribingConsultSubtype(subtype?: string | null): boolean {
  return PRESCRIBING_CONSULT_SUBTYPES.has(subtype ?? "")
}

export function isPrescribingServiceType(type?: string | null): boolean {
  return PRESCRIBING_SERVICE_TYPES.has(type ?? "")
}

export function isPrescribingServiceRequest(
  serviceType?: string | null,
  subtype?: string | null,
): boolean {
  return isPrescribingServiceType(serviceType) ||
    (isConsultServiceType(serviceType) && isPrescribingConsultSubtype(subtype))
}

export function isKnownDoctorServiceType(type?: string | null): boolean {
  return Boolean(
    type &&
      (Object.values(SERVICE_TYPES) as string[]).includes(type),
  )
}
