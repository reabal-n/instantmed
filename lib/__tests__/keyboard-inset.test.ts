import { describe, expect, it } from "vitest"

import { computeKeyboardInset } from "@/lib/browser/keyboard-inset"

// Boundary literals deliberately duplicate the module-private thresholds in
// lib/browser/keyboard-inset.ts (150px occlusion, 1.1 natural scale). If a
// change there breaks these, that's the test forcing acknowledgment that the
// prescribing sheet's keyboard behaviour is being retuned.
describe("computeKeyboardInset", () => {
  it("returns null when nothing occludes the viewport", () => {
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 0, height: 844, scale: 1 }),
    ).toBeNull()
  })

  it("returns the visible band when an iPhone keyboard is up", () => {
    // iPhone 14 Pro portrait: 844pt viewport, ~336pt keyboard.
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 0, height: 508, scale: 1 }),
    ).toEqual({ top: 0, height: 508 })
  })

  it("carries offsetTop when iOS scrolls the visual viewport to reveal a focused input", () => {
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 60, height: 448, scale: 1 }),
    ).toEqual({ top: 60, height: 448 })
  })

  it("ignores URL-bar and accessory-bar sized chrome churn", () => {
    // iOS Safari URL bar expand/collapse is ~60-100px; accessory bars ~55px.
    // 149px occlusion sits just under the 150px keyboard threshold.
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 0, height: 695, scale: 1 }),
    ).toBeNull()
  })

  it("engages exactly at the keyboard threshold", () => {
    // 150px occlusion: 844 - 694.
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 0, height: 694, scale: 1 }),
    ).toEqual({ top: 0, height: 694 })
  })

  it("never engages while pinch-zoomed — zoom shrinks visualViewport the same way a keyboard does", () => {
    // Pinch-zoomed to 2x: height halves without any keyboard being present.
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 120, height: 422, scale: 2 }),
    ).toBeNull()
    // Just past the 1.1 natural-scale allowance still refuses.
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 0, height: 500, scale: 1.11 }),
    ).toBeNull()
  })

  it("tolerates sub-pixel viewport reports and clamps negatives", () => {
    expect(
      computeKeyboardInset({ innerHeight: 844, offsetTop: 0.4, height: 507.6, scale: 1 }),
    ).toEqual({ top: 0, height: 508 })
  })
})
