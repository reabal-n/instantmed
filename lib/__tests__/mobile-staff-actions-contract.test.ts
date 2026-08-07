import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ledgerSource = readFileSync(
  join(process.cwd(), "app/admin/intakes/intakes-ledger-client.tsx"),
  "utf8",
)
const actionRailSource = readFileSync(
  join(process.cwd(), "components/doctor/review/intake-action-buttons.tsx"),
  "utf8",
)
const parchmentPanelSource = readFileSync(
  join(process.cwd(), "components/doctor/parchment-prescribe-panel.tsx"),
  "utf8",
)

describe("mobile staff action contracts", () => {
  it("renders a touch-first ledger while preserving the desktop CaseTable", () => {
    expect(ledgerSource).toContain("CaseMobileList")
    expect(ledgerSource).toContain('className="sm:hidden"')
    expect(ledgerSource).toContain('className="hidden overflow-x-auto rounded-xl sm:block"')
    expect(ledgerSource).toContain('className="min-w-[760px]"')
    expect(ledgerSource).toContain("Copy payment reply")
    expect(ledgerSource).toContain("Issue refund")
  })

  it("moves manual fulfilment behind a compact mobile disclosure", () => {
    expect(actionRailSource).toContain('data-mobile-fulfilment-options="true"')
    expect(actionRailSource).toContain("Fulfilment options")
    expect(actionRailSource).toContain(
      'className="hidden pt-2 group-open:block sm:block sm:pt-0" data-desktop-fulfilment-fallback="true"',
    )
    expect(parchmentPanelSource).toContain("Sent outside Parchment")
  })

  it("keeps completion locked to durable script evidence", () => {
    expect(actionRailSource).toContain(
      "const canApproveAfterPrescribe = intake.script_sent === true",
    )
    expect(actionRailSource).toContain(
      "const completionDisabledReason = isPrescribingWorkflow",
    )
    expect(actionRailSource).toContain(
      "disabled={isActionDisabled || Boolean(completionDisabledReason)}",
    )
    expect(actionRailSource).toContain("handleApprovePrescribedScript")
  })

  // 2026-08-07: prescribing from a phone was "basically impossible" — iOS keeps
  // the layout viewport (and 100dvh) full-size when the soft keyboard opens, so
  // the bottom of the Parchment iframe (where medicine search results render)
  // sat underneath the keyboard with body scroll locked and nothing scrollable.
  // The sheet must track window.visualViewport and shrink to the visible band.
  it("keeps the Parchment sheet above the soft keyboard while typing", () => {
    expect(parchmentPanelSource).toContain("computeKeyboardInset")
    expect(parchmentPanelSource).toContain("window.visualViewport")
    expect(parchmentPanelSource).toContain('visualViewport.addEventListener("resize"')
    expect(parchmentPanelSource).toContain('visualViewport.addEventListener("scroll"')
    expect(parchmentPanelSource).toContain('window.addEventListener("orientationchange"')
    // The inset is inline-style only — at rest the class-driven full-height
    // sheet (pinned by doctor-review-ui-contract) still owns layout.
    expect(parchmentPanelSource).toContain("h-[100dvh] w-full")
    expect(parchmentPanelSource).toContain("style={keyboardInset ? { height: keyboardInset.height } : undefined}")
    // While typing, chrome yields to the iframe: the phone medicine-context
    // disclosure and the footer collapse instead of eating keyboard-shortened
    // viewport, and the long header instruction never renders on phones at all
    // (the footer carries the same confirmation rule).
    expect(parchmentPanelSource).toContain('keyboardInset && "hidden"')
    expect(parchmentPanelSource).toContain('className="mt-0.5 hidden text-xs text-muted-foreground sm:block sm:text-sm"')
  })
})
