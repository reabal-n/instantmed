import { createHash } from "node:crypto"

const CHECKOUT_BUCKET_MS = 10 * 60 * 1000
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function hash(value: string, length: number): string {
  return createHash("sha256").update(value).digest("hex").slice(0, length)
}

function isCheckoutDraftSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

function buildDraftSubmissionKey(
  serverDraftSessionId: string | null | undefined,
  category: string,
  subtype: string,
): string | null {
  if (!isCheckoutDraftSessionId(serverDraftSessionId)) return null

  return `draft-${hash(`${serverDraftSessionId}:${category}:${subtype}`, 26)}`
}

export function buildAuthenticatedCheckoutSubmissionKey({
  answers,
  category,
  now = Date.now(),
  patientId,
  serverDraftSessionId,
  serviceType,
  subtype,
}: {
  answers: Record<string, unknown>
  category: string
  now?: number
  patientId: string
  serverDraftSessionId?: string
  serviceType: string
  subtype: string
}): string {
  const draftKey = buildDraftSubmissionKey(serverDraftSessionId, category, subtype)
  if (draftKey) return draftKey

  return hash(
    `${patientId}:${serviceType}:${subtype}:${Math.floor(now / CHECKOUT_BUCKET_MS)}:${JSON.stringify(answers)}`,
    32,
  )
}

export function buildGuestCheckoutSubmissionKey({
  answers,
  category,
  email,
  now = Date.now(),
  serverDraftSessionId,
  subtype,
}: {
  answers: Record<string, unknown>
  category: string
  email: string
  now?: number
  serverDraftSessionId?: string
  subtype: string
}): string {
  const draftKey = buildDraftSubmissionKey(serverDraftSessionId, category, subtype)
  if (draftKey) return draftKey

  return `guest-${hash(
    `${email.trim().toLowerCase()}:${category}:${subtype}:${Math.floor(now / CHECKOUT_BUCKET_MS)}:${JSON.stringify(answers)}`,
    24,
  )}`
}
