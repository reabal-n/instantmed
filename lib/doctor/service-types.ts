/**
 * Canonical service type strings used in doctor portal logic.
 * Matches the `service.type` field on intake rows.
 */
export const SERVICE_TYPES = {
  MED_CERTS: "med_certs",
  REPEAT_RX: "repeat_rx",
  COMMON_SCRIPTS: "common_scripts",
  CONSULTS: "consults",
} as const

export type ServiceTypeValue = (typeof SERVICE_TYPES)[keyof typeof SERVICE_TYPES]
