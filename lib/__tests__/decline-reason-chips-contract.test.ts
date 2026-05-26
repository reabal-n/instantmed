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

  it("decline dialog renders a chip per reason that sets declineReason and declineReasonCode", () => {
    expect(dialogSource).toMatch(/setDeclineReason\(reason\.template\)/)
    expect(dialogSource).toMatch(/setDeclineReasonCode\(reason\.code\)/)
  })

  it("decline dialog renders a Common reasons quick-pick row with top 4 reasons", () => {
    expect(dialogSource).toMatch(/Common reasons/)
    expect(dialogSource).toMatch(/DECLINE_REASONS\.filter\(.*r\.code !== "other".*\)\.slice\(0,\s*4\)/)
  })
})
