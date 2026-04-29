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

export function isConsultServiceType(type?: string | null): boolean {
  return type === SERVICE_TYPES.CONSULT || type === SERVICE_TYPES.CONSULTS
}

export function isKnownDoctorServiceType(type?: string | null): boolean {
  return Boolean(
    type &&
      (Object.values(SERVICE_TYPES) as string[]).includes(type),
  )
}
