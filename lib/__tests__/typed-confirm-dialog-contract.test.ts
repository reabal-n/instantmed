import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("typed-confirm dialog contract", () => {
  it("ships the reusable TypedConfirmDialog primitive", () => {
    const path = "components/ui/typed-confirm-dialog.tsx"
    expect(existsSync(join(root, path))).toBe(true)
    const source = read(path)

    // The primitive must expose props that drive the typed-confirm contract.
    expect(source).toContain("export function TypedConfirmDialog")
    expect(source).toContain("requiredText")
    expect(source).toContain('disabled={!matches')
    expect(source).toContain("data-testid=\"typed-confirm-input\"")
    expect(source).toContain("data-testid=\"typed-confirm-action\"")
  })

  it("gates intake refunds behind the typed-confirm primitive", () => {
    const source = read("app/doctor/intakes/[id]/intake-refund-dialog.tsx")
    expect(source).toContain("import { TypedConfirmDialog }")
    expect(source).toContain("<TypedConfirmDialog")
    // Refund button must require typing the REFUND token, not the
    // generic "are you sure" double-click pattern.
    expect(source).toContain('requiredText="REFUND"')
    // The refund handler must never bypass the primitive by reaching
    // back to the raw AlertDialog action.
    expect(source).not.toContain("AlertDialogAction")
  })
})
