import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Parity contract between the email dispatcher and the reconstructor.
 *
 * The dispatcher's SUPPORTED_EMAIL_TYPES means "I can reconstruct + resend this".
 * If a type is listed there but reconstruct.ts has no branch for it, an
 * interrupted inline send → the dispatcher claims the outbox row → reconstruct
 * fails on every retry → the email is dropped after MAX_RETRIES + Sentry-warned.
 * Cron-owned types dodge this only if they are OUT of SUPPORTED and IN the
 * shared cron-owned quiet-failure list (so they quiet-fail; their cron owns the resend).
 *
 * This pins the relationship so the bug class cannot silently grow. Mirrors
 * stripe-webhook-handler-parity-contract.test.ts. Source-parsed (no heavy server
 * imports) so it runs in the node test env.
 */

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

/** Pull the double-quoted tokens out of a named array/set literal block. */
function quotedTokensInBlock(src: string, startMarker: string, endMarker: string): string[] {
  const start = src.indexOf(startMarker)
  if (start === -1) throw new Error(`marker not found: ${startMarker}`)
  const end = src.indexOf(endMarker, start)
  if (end === -1) throw new Error(`end marker not found after: ${startMarker}`)
  const block = src.slice(start + startMarker.length, end)
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

const dispatcherSrc = read("lib/email/email-dispatcher.ts")
const quietFailureSrc = read("lib/email/quiet-failures.ts")
const reconstructSrc = read("lib/email/send/reconstruct.ts")

const SUPPORTED = quotedTokensInBlock(dispatcherSrc, "SUPPORTED_EMAIL_TYPES = [", "] as const")
const CRON_OWNED = quotedTokensInBlock(
  quietFailureSrc,
  "CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES = [",
  "] as const",
)
// Types reconstruct.ts can actually rebuild = the email_type values it branches on.
const RECONSTRUCTABLE = new Set(
  [...reconstructSrc.matchAll(/row\.email_type === "([^"]+)"/g)].map((m) => m[1]),
)

// Known parity debt: SUPPORTED types reconstruct.ts cannot yet rebuild that are
// NOT cron-owned. Each is a transactional/lifecycle email that needs its own
// reconstruct branch (or removal from SUPPORTED) in focused follow-up. The
// 2026-07-06 email Wave 2 cleanup shrank this by deleting the dead
// intake_submitted / referral_credit / verification_code templates outright.
// DO NOT add new types here; fix the gap.
const KNOWN_RECONSTRUCT_GAP = [
  "refund_issued",
  "request_approved",
].sort()

describe("email dispatcher <-> reconstruct parity", () => {
  it("parses non-empty sets from source (guards against marker drift)", () => {
    expect(SUPPORTED.length).toBeGreaterThan(10)
    expect(CRON_OWNED.length).toBeGreaterThan(3)
    expect(RECONSTRUCTABLE.size).toBeGreaterThan(10)
  })

  it("never lists a type as BOTH supported and cron-owned (STEP 3 quiet-fail would be skipped)", () => {
    const both = SUPPORTED.filter((t) => CRON_OWNED.includes(t))
    expect(both).toEqual([])
  })

  it("every supported type is reconstructable, except the pinned known gap", () => {
    const gap = SUPPORTED.filter((t) => !RECONSTRUCTABLE.has(t) && !CRON_OWNED.includes(t)).sort()
    // Fails if: a new SUPPORTED type lacks a reconstruct branch (add one or make
    // it cron-owned), OR a gap type got fixed (remove it from KNOWN_RECONSTRUCT_GAP).
    expect(gap).toEqual(KNOWN_RECONSTRUCT_GAP)
  })

  it("keeps the cron-owned quiet-fail list free of reconstructable types (dead config)", () => {
    const redundant = CRON_OWNED.filter((t) => RECONSTRUCTABLE.has(t))
    expect(redundant).toEqual([])
  })
})
