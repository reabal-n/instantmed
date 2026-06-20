import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Stripe webhook handlers parity contract.
 *
 * Asserts that every file in `app/api/stripe/webhook/handlers/` (other than
 * the framework files index.ts / types.ts / utils.ts and shared helper modules
 * that are imported BY handlers rather than dispatched) is actually imported
 * and dispatched from `index.ts`, AND vice versa.
 *
 * Why this exists:
 *
 * 2026-05-23 cleanup found 4 zombie handler files for subscription and
 * invoice events (customer-subscription-deleted, customer-subscription-
 * updated, invoice-payment-failed, invoice-payment-succeeded). They were
 * never imported into the handlers Map in index.ts, so the dispatcher
 * silently no-op'd any incoming events. But the files survived on disk
 * for weeks, untracked but present, masking the operator's intent that
 * subscription/invoice handlers are RETIRED per the one-off business
 * model (CLAUDE.md OPERATIONS.md: "Do not enable invoice or
 * customer.subscription.* events while the one-off model is active;
 * those runtime handlers are retired.").
 *
 * Future class of bug this catches:
 *
 * - PR introduces a new handler file but forgets to wire it into the Map
 *   → handler never fires for the live webhook → silent payment data loss.
 * - PR removes a handler from the Map but forgets to delete the file
 *   → file rots in the codebase as a misleading artifact (the 2026-05-23
 *   class of bug).
 * - PR adds a handler file for an event type the platform shouldn't support
 *   yet (e.g. reintroducing subscription handlers) → caught at PR review
 *   when the test fails and the operator has to explicitly add the wire-up.
 *
 * This is a pure static-analysis test. No runtime behaviour change.
 */

const HANDLERS_DIR = join(process.cwd(), "app/api/stripe/webhook/handlers")
const FRAMEWORK_FILES = new Set(["index.ts", "types.ts", "utils.ts"])
// Shared helpers that live in the handlers dir but are imported BY handlers
// (payment-failure-recovery.ts is used by both checkout.session.async_payment_failed
// and payment_intent.payment_failed) rather than dispatched from the Map. They
// are not event handlers, so they are exempt from the parity check. They are NOT
// zombies: typecheck/build fails if a real handler stops importing them, which is
// the safety property that actually matters for a helper.
const SHARED_HELPER_FILES = new Set(["payment-failure-recovery.ts"])
const NON_HANDLER_FILES = new Set([...FRAMEWORK_FILES, ...SHARED_HELPER_FILES])

function listHandlerFiles(): string[] {
  return readdirSync(HANDLERS_DIR)
    .filter((f) => f.endsWith(".ts") && !NON_HANDLER_FILES.has(f))
    .sort()
}

function parseImportedHandlerFiles(): string[] {
  const indexSource = readFileSync(join(HANDLERS_DIR, "index.ts"), "utf8")
  // Match: import { ... } from "./<basename>"
  const matches = [...indexSource.matchAll(/from\s+["']\.\/([\w-]+)["']/g)]
  return matches
    .map((m) => `${m[1]}.ts`)
    .filter((f) => !NON_HANDLER_FILES.has(f))
    .sort()
}

describe("stripe webhook handler parity contract", () => {
  it("every handler file is imported by index.ts (no orphan files)", () => {
    const filesOnDisk = listHandlerFiles()
    const filesImported = parseImportedHandlerFiles()

    const orphans = filesOnDisk.filter((f) => !filesImported.includes(f))
    expect(orphans, `Orphan handler files (on disk, not imported by index.ts): ${orphans.join(", ")}`).toEqual([])
  })

  it("every imported handler file exists on disk (no broken imports)", () => {
    const filesOnDisk = listHandlerFiles()
    const filesImported = parseImportedHandlerFiles()

    const missing = filesImported.filter((f) => !filesOnDisk.includes(f))
    expect(missing, `Imported handler files missing from disk: ${missing.join(", ")}`).toEqual([])
  })

  it("imports and disk files are an exact match", () => {
    expect(parseImportedHandlerFiles()).toEqual(listHandlerFiles())
  })
})
