import "server-only"

import { createHash, randomBytes } from "crypto"

const REVIEW_CLICK_KEY_BYTES = 32
const REVIEW_CLICK_KEY_LENGTH = 43
// 32 bytes encode to 43 unpadded base64url characters. The final character
// has only four meaningful bits, so accepting the wider alphabet there would
// allow multiple textual capabilities to decode to the same byte sequence.
const REVIEW_CLICK_KEY_PATTERN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/

export const REVIEW_CLICK_KEY_HASH_METADATA_KEY = "review_click_key_hash"

export interface ReviewClickKey {
  raw: string
  hash: string
}

/**
 * Create a non-PHI capability used only to count the first traversal of one
 * review-request link. The raw key belongs in the frozen email payload; only
 * its SHA-256 hash may be persisted or sent to an analytics boundary.
 */
export function createReviewClickKey(): ReviewClickKey {
  const raw = randomBytes(REVIEW_CLICK_KEY_BYTES).toString("base64url")
  return {
    raw,
    hash: hashReviewClickKey(raw)!,
  }
}

/** Strictly validate the 32-byte base64url form before hashing. */
export function hashReviewClickKey(value: string | null | undefined): string | null {
  if (
    typeof value !== "string" ||
    value.length !== REVIEW_CLICK_KEY_LENGTH ||
    !REVIEW_CLICK_KEY_PATTERN.test(value)
  ) {
    return null
  }

  return createHash("sha256").update(value, "utf8").digest("hex")
}
