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
})
