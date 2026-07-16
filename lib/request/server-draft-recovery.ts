import {
  isConsultSubtypeAvailable,
  isConsultSubtypeKey,
  isWomensHealthOptionLive,
  normalizeConsultSubtypeParam,
} from "@/lib/request/consult-subtypes"
import { isValidDraftSessionId } from "@/lib/request/draft-resume-route"
import { canonicalizeServiceType } from "@/lib/request/draft-storage"
import type { ServerDraftRecord } from "@/lib/request/server-draft"
import type { ConsultSubtype } from "@/types/services"

type RecoveryFailureReason = "expired" | "malformed" | "route_mismatch" | "unresumable"

export type ServerDraftRecoveryDecision =
  | {
      ok: true
      serviceType: "med-cert" | "repeat-script" | "consult"
      consultSubtype: ConsultSubtype | undefined
    }
  | { ok: false; reason: RecoveryFailureReason }

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Validate an explicit recovery record against the route that carried its
 * bearer token. Recovery links fail closed instead of silently opening a
 * different local draft or a gated consult pathway.
 */
export function getServerDraftRecoveryDecision({
  draft,
  initialService,
  initialSubtype,
  now = Date.now(),
}: {
  draft: ServerDraftRecord
  initialService: string | null | undefined
  initialSubtype?: string | null
  now?: number
}): ServerDraftRecoveryDecision {
  const expiresAt = Date.parse(draft.expiresAt)
  const updatedAt = Date.parse(draft.updatedAt)

  if (
    !isValidDraftSessionId(draft.sessionId) ||
    !isPlainRecord(draft.answers) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(updatedAt)
  ) {
    return { ok: false, reason: "malformed" }
  }

  if (expiresAt <= now) {
    return { ok: false, reason: "expired" }
  }

  const draftService = canonicalizeServiceType(draft.serviceType)
  if (!draftService || draftService !== draft.serviceType) {
    return { ok: false, reason: "unresumable" }
  }

  const routeService = canonicalizeServiceType(initialService)
  if (!routeService || routeService !== draftService) {
    return { ok: false, reason: "route_mismatch" }
  }

  if (draftService === "med-cert") {
    return { ok: true, serviceType: "med-cert", consultSubtype: undefined }
  }

  if (draftService === "prescription") {
    return { ok: true, serviceType: "repeat-script", consultSubtype: undefined }
  }

  const recoveredSubtype = draft.answers.consultSubtype
  if (
    !isConsultSubtypeKey(recoveredSubtype) ||
    !isConsultSubtypeAvailable(recoveredSubtype)
  ) {
    return { ok: false, reason: "unresumable" }
  }

  const routeSubtype = normalizeConsultSubtypeParam(initialSubtype)
  if (routeSubtype !== recoveredSubtype) {
    return { ok: false, reason: "route_mismatch" }
  }

  if (
    recoveredSubtype === "womens_health" &&
    !isWomensHealthOptionLive(draft.answers.womensHealthOption)
  ) {
    return { ok: false, reason: "unresumable" }
  }

  return {
    ok: true,
    serviceType: "consult",
    consultSubtype: recoveredSubtype,
  }
}

/** Remove only the draft bearer token while retaining route and attribution. */
export function stripDraftSessionFromUrl(url: string): string {
  const parsed = new URL(url, "https://instantmed.com.au")
  parsed.searchParams.delete("d")
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}
