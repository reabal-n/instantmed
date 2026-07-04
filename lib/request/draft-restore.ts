import { canonicalizeServiceType, type CanonicalServiceType } from "./draft-storage"
import type { UnifiedServiceType, UnifiedStepId } from "./step-registry"

const DRAFT_RESTORE_WINDOW_HOURS = 24
const LEGACY_DRAFT_KEY = "instantmed-request-draft"
const SERVICE_DRAFT_KEYS: Record<CanonicalServiceType, string> = {
  "med-cert": "instantmed-draft-med-cert",
  prescription: "instantmed-draft-prescription",
  consult: "instantmed-draft-consult",
}

interface DraftRestoreInput {
  lastSavedAt: string | null | undefined
  serviceType: UnifiedServiceType | null | undefined
  currentStepId: UnifiedStepId | null | undefined
  now?: number
}

type DraftRestoreCandidate = Omit<DraftRestoreInput, "now"> & {
  serviceType: UnifiedServiceType
  lastSavedAt: string
  currentStepId: UnifiedStepId
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseDraftCandidate(raw: string | null, envelope: boolean): DraftRestoreCandidate | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    const candidate = envelope && isPlainRecord(parsed) ? parsed.state : parsed
    if (!isPlainRecord(candidate)) return null

    const serviceType = canonicalizeServiceType(
      typeof candidate.serviceType === "string" ? candidate.serviceType : null,
    )
    const currentStepId = candidate.currentStepId
    const lastSavedAt = candidate.lastSavedAt

    if (!serviceType || typeof currentStepId !== "string" || typeof lastSavedAt !== "string") {
      return null
    }

    return {
      serviceType,
      currentStepId: currentStepId as UnifiedStepId,
      lastSavedAt,
    }
  } catch {
    return null
  }
}

function getCandidateTime(candidate: DraftRestoreCandidate): number {
  return new Date(candidate.lastSavedAt).getTime()
}

export function getStoredDraftRestoreCandidate(
  preferredService: UnifiedServiceType | null | undefined,
): DraftRestoreCandidate | null {
  if (typeof localStorage === "undefined") return null

  const candidates: DraftRestoreCandidate[] = []

  const legacyCandidate = parseDraftCandidate(localStorage.getItem(LEGACY_DRAFT_KEY), true)
  if (legacyCandidate) candidates.push(legacyCandidate)

  for (const key of Object.values(SERVICE_DRAFT_KEYS)) {
    const candidate = parseDraftCandidate(localStorage.getItem(key), false)
    if (candidate) candidates.push(candidate)
  }

  if (candidates.length === 0) return null

  const preferredCanonical = canonicalizeServiceType(preferredService)
  const scopedCandidates = preferredCanonical
    ? candidates.filter((candidate) => candidate.serviceType === preferredCanonical)
    : candidates

  return [...(scopedCandidates.length > 0 ? scopedCandidates : candidates)].sort(
    (a, b) => getCandidateTime(b) - getCandidateTime(a),
  )[0]
}

export function shouldOfferDraftRestore({
  lastSavedAt,
  serviceType,
  currentStepId,
  now = Date.now(),
}: DraftRestoreInput): boolean {
  if (!lastSavedAt || !serviceType || currentStepId === "review") {
    return false
  }

  const savedTime = new Date(lastSavedAt).getTime()
  if (!Number.isFinite(savedTime)) {
    return false
  }

  const hoursSinceSave = (now - savedTime) / (1000 * 60 * 60)
  return hoursSinceSave < DRAFT_RESTORE_WINDOW_HOURS
}
