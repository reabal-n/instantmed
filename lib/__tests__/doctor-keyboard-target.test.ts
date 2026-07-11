import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

type KeyboardTargetGuard = (target: EventTarget | null) => boolean

function fakeTarget({
  tagName = "DIV",
  isContentEditable = false,
  closest = () => null,
}: {
  tagName?: string
  isContentEditable?: boolean
  closest?: (selector: string) => unknown
} = {}): EventTarget {
  return { tagName, isContentEditable, closest } as unknown as EventTarget
}

describe("doctor keyboard shortcut target safety", () => {
  it("recognises editable and interactive targets, including nested descendants", async () => {
    const shortcutModule = await import("@/lib/hooks/use-doctor-shortcuts")
    const guard = (shortcutModule as unknown as {
      isEditableOrInteractiveKeyboardTarget?: KeyboardTargetGuard
    }).isEditableOrInteractiveKeyboardTarget

    expect(guard).toBeTypeOf("function")
    if (!guard) return

    expect(guard(null)).toBe(false)
    expect(guard(fakeTarget())).toBe(false)
    expect(guard(fakeTarget({ tagName: "INPUT" }))).toBe(true)
    expect(guard(fakeTarget({ tagName: "textarea" }))).toBe(true)
    expect(guard(fakeTarget({ tagName: "SELECT" }))).toBe(true)
    expect(guard(fakeTarget({ tagName: "BUTTON" }))).toBe(true)
    expect(guard(fakeTarget({ isContentEditable: true }))).toBe(true)
    expect(guard(fakeTarget({ closest: () => ({ role: "textbox" }) }))).toBe(true)
  })

  it("routes every global doctor queue shortcut through the shared guard", () => {
    const root = process.cwd()
    const sources = [
      "app/doctor/queue/queue-client.tsx",
      "app/doctor/queue/queue-filters.tsx",
      "components/doctor/intake-review-panel.tsx",
    ].map((path) => readFileSync(join(root, path), "utf8"))

    for (const source of sources) {
      expect(source).toContain("isEditableOrInteractiveKeyboardTarget")
      expect(source).toContain("isEditableOrInteractiveKeyboardTarget(e.target)")
    }
  })
})
