import { isConsultSubtypeAvailable, isConsultSubtypeKey } from "@/lib/request/consult-subtypes"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidDraftSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

export function buildDraftResumePath({
  serviceType,
  consultSubtype,
  sessionId,
}: {
  serviceType: string
  consultSubtype?: string | null
  sessionId?: string | null
}): string | null {
  if (sessionId !== undefined && sessionId !== null && !isValidDraftSessionId(sessionId)) {
    return null
  }

  const params = new URLSearchParams()

  if (serviceType === "med-cert") {
    params.set("service", "med-cert")
  } else if (serviceType === "prescription") {
    params.set("service", "repeat-script")
  } else if (
    serviceType === "consult" &&
    consultSubtype &&
    isConsultSubtypeKey(consultSubtype) &&
    isConsultSubtypeAvailable(consultSubtype)
  ) {
    params.set("service", "consult")
    params.set("subtype", consultSubtype)
  } else {
    return null
  }

  if (sessionId) params.set("d", sessionId)
  return `/request?${params.toString()}`
}
