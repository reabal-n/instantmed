import type { ConsultSubtype, UnifiedServiceType } from "@/types/services"

const PRESCRIBING_CONSULT_SUBTYPES = new Set<ConsultSubtype>(["ed", "hair_loss"])

export function requiresPrescribingIdentityForRequest({
  category,
  serviceType,
  subtype,
}: {
  category?: string | null
  serviceType?: UnifiedServiceType | string | null
  subtype?: string | null
}): boolean {
  const normalizedServiceType = serviceType ?? ""
  const normalizedCategory = category ?? ""
  const isPrescribingConsult = (
    normalizedCategory === "consult" ||
    normalizedServiceType === "consult" ||
    normalizedServiceType === "consults"
  ) && PRESCRIBING_CONSULT_SUBTYPES.has((subtype ?? "") as ConsultSubtype)

  return (
    normalizedCategory === "prescription" ||
    normalizedServiceType === "common_scripts" ||
    normalizedServiceType === "repeat_rx" ||
    normalizedServiceType === "prescription" ||
    normalizedServiceType === "repeat-script" ||
    isPrescribingConsult
  )
}
