import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const reviewActionsSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review-actions.tsx"),
  "utf-8",
)

const dialogSource = readFileSync(
  resolve(process.cwd(), "components/doctor/review/decline-intake-dialog.tsx"),
  "utf-8",
)

describe("Decline reason chips contract", () => {
  it("review-actions imports DECLINE_REASONS so the chips have a source of truth", () => {
    expect(reviewActionsSource).toMatch(
      /import\s*\{[^}]*DECLINE_REASONS[^}]*\}\s*from\s*["']@\/lib\/doctor\/constants["']/,
    )
  })

  it("review-actions exposes setDeclineReasonCode so the chip click can lock the reasonCode", () => {
    expect(reviewActionsSource).toMatch(/setDeclineReasonCode/)
  })

  it("decline dialog imports DECLINE_REASONS so the chip row stays in sync", () => {
    expect(dialogSource).toMatch(
      /import\s*\{[^}]*DECLINE_REASONS[^}]*\}\s*from\s*["']@\/lib\/doctor\/constants["']/,
    )
  })

  it("decline dialog renders one button per reason via the canonical handler", () => {
    // Flattened single-grid layout (2026-06-08): one button per reason, each
    // routing through handleDeclineReasonCodeChange so the reason code and the
    // pre-filled template text can never drift apart.
    expect(dialogSource).toMatch(/DECLINE_REASONS\.map\(/)
    expect(dialogSource).toMatch(/handleDeclineReasonCodeChange\(reason\.code\)/)
  })

  it("decline dialog no longer splits into Common/All sections", () => {
    // With the reason list trimmed to 5, the two-section split was redundant.
    expect(dialogSource).not.toMatch(/Common reasons/)
    expect(dialogSource).not.toMatch(/All reasons/)
  })
})
