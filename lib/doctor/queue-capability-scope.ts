import {
  type DoctorCapability,
  doctorHasCapability,
  hasAdminAccess,
} from "@/lib/auth/staff-capabilities"
import type { Profile } from "@/types/db"

type QueueCapabilityProfile = Pick<Profile, "role"> & Partial<
  Pick<
    Profile,
    | "can_review_med_certs"
    | "can_review_repeat_rx"
    | "can_review_consults"
    | "can_review_ed"
    | "can_review_hair_loss"
  >
>

export interface QueueCapabilityService {
  id: string
  type: string | null
}

const REPEAT_RX_SERVICE_TYPES = new Set([
  "common_scripts",
  "repeat_rx",
  "repeat_script",
  "repeat-script",
  "prescription",
])

function safeUuidList(ids: string[]): string {
  return ids
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .join(",")
}

function idsForTypes(services: QueueCapabilityService[], predicate: (type: string | null) => boolean): string[] {
  return services
    .filter((service) => predicate(service.type))
    .map((service) => service.id)
}

function serviceIdInFilter(ids: string[]): string | null {
  const list = safeUuidList(ids)
  return list ? `service_id.in.(${list})` : null
}

function has(profile: QueueCapabilityProfile, capability: DoctorCapability): boolean {
  return doctorHasCapability(profile, capability)
}

/**
 * Builds the PostgREST `or(...)` body for the queue service lines a doctor is
 * allowed to see. Admins are unrestricted. Ordinary doctors only receive cases
 * for service lines they can clinically review.
 */
export function buildDoctorQueueServiceFilter(
  profile: QueueCapabilityProfile,
  services: QueueCapabilityService[],
): string | null {
  if (hasAdminAccess(profile)) return null

  const terms: string[] = []
  const medCertFilter = serviceIdInFilter(idsForTypes(services, (type) => type === "med_certs"))
  const repeatRxFilter = serviceIdInFilter(idsForTypes(services, (type) => REPEAT_RX_SERVICE_TYPES.has(type ?? "")))
  const consultIds = idsForTypes(services, (type) => type === "consult" || type === "consults")
  const consultFilter = serviceIdInFilter(consultIds)

  if (medCertFilter && has(profile, "review_med_certs")) terms.push(medCertFilter)
  if (repeatRxFilter && has(profile, "review_repeat_rx")) terms.push(repeatRxFilter)

  if (consultFilter) {
    if (has(profile, "review_consults")) {
      terms.push(`and(${consultFilter},subtype.is.null)`)
      terms.push(`and(${consultFilter},subtype.not.in.(ed,hair_loss))`)
    }
    if (has(profile, "review_ed")) {
      terms.push(`and(${consultFilter},subtype.eq.ed)`)
    }
    if (has(profile, "review_hair_loss")) {
      terms.push(`and(${consultFilter},subtype.eq.hair_loss)`)
    }
  }

  return terms.length > 0 ? terms.join(",") : "id.is.null"
}
