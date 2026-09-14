import { readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it, vi } from "vitest"

import { isEditableOrInteractiveKeyboardTarget } from "@/lib/hooks/use-doctor-shortcuts"

// Execute the actual queue callbacks without mounting its server/data readers in
// the Node unit environment. No shortcut switch or selection logic is duplicated.
const source = ts.createSourceFile("queue-client.tsx", readFileSync(join(process.cwd(), "app/doctor/queue/queue-client.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let keyboardEffect = ""
let selectCallback = ""
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect"
    && node.arguments[0]?.getText(source).includes('window.addEventListener("keydown", handleKeyDown)')) {
    keyboardEffect = node.getText(source)
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "selectReviewedIntake") {
    selectCallback = node.initializer!.getText(source)
  }
  ts.forEachChild(node, visit)
}
visit(source)

function execute(code: string, scope: Record<string, unknown>): unknown {
  const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(scope), compiled)(...Object.values(scope))
}

function queueHarness() {
  let selected: string | null = "case-b"
  let pending = false
  let listener: ((event: KeyboardEvent) => void) | undefined
  let dependencies: unknown[] = []
  let cleanup: (() => void) | undefined
  const beforeReviewLeaveRef = { current: vi.fn(async () => true) }
  const slideOverOpenRef = { current: false }
  const openReviewPanel = vi.fn()
  const handleApprove = vi.fn()
  const dialogs = { setDeclineDialog: vi.fn() }
  const filteredIntakes = [{ id: "case-a" }, { id: "case-b" }, { id: "case-c" }]
  const selectReviewedIntake = execute(`return ${selectCallback}`, {
    useCallback: (callback: unknown) => callback,
    beforeReviewLeaveRef,
    initiatingActionRef: { current: 0 },
    initiatingListAction: () => 0,
    setExpandedId: (id: string | null) => { selected = id },
  })
  const render = () => execute(keyboardEffect, {
    useEffect: (effect: () => (() => void), next: unknown[]) => {
      if (next.length === dependencies.length && next.every((value, i) => Object.is(value, dependencies[i]))) return
      cleanup?.()
      dependencies = next
      cleanup = effect()
    },
    window: {
      addEventListener: (_name: string, handler: typeof listener) => { listener = handler },
      removeEventListener: () => { listener = undefined },
    },
    isEditableOrInteractiveKeyboardTarget, slideOverOpenRef,
    expandedId: selected, filteredIntakes, queueSearchPending: pending,
    selectReviewedIntake, openReviewPanel, handleApprove, dialogs,
  })
  render()
  return {
    beforeReviewLeaveRef, slideOverOpenRef, openReviewPanel, handleApprove, dialogs,
    selected: () => selected,
    pending(value: boolean) { pending = value; render() },
    async press(key: string, options: Partial<KeyboardEvent> = {}) {
      const preventDefault = vi.fn()
      listener!({ key, target: null, preventDefault, ...options } as unknown as KeyboardEvent)
      await Promise.resolve()
      render()
      return preventDefault
    },
  }
}

describe("queue keyboard search boundary", () => {
  it.each(["j", "k", "ArrowDown", "ArrowUp", "Enter", "a", "d"])("denies %s after search becomes pending and resumes after settlement", async (key) => {
    const queue = queueHarness()
    queue.pending(true)
    await queue.press(key)
    expect(queue.selected()).toBe("case-b")
    expect(queue.beforeReviewLeaveRef.current).not.toHaveBeenCalled()
    expect(queue.openReviewPanel).not.toHaveBeenCalled()
    expect(queue.handleApprove).not.toHaveBeenCalled()
    expect(queue.dialogs.setDeclineDialog).not.toHaveBeenCalled()

    queue.pending(false)
    await queue.press(key)
    if (["j", "ArrowDown"].includes(key)) expect(queue.selected()).toBe("case-c")
    if (["k", "ArrowUp"].includes(key)) expect(queue.selected()).toBe("case-a")
    if (key === "Enter") expect(queue.openReviewPanel).toHaveBeenCalledWith("case-b")
    if (key === "a") expect(queue.handleApprove).toHaveBeenCalledWith("case-b", undefined, undefined)
    if (key === "d") expect(queue.dialogs.setDeclineDialog).toHaveBeenCalledWith("case-b")
  })

  it("preserves rejected note saves before selection and collapse", async () => {
    const queue = queueHarness()
    queue.beforeReviewLeaveRef.current.mockResolvedValue(false)
    for (const key of ["j", "k", "ArrowDown", "ArrowUp", "Escape"]) {
      await queue.press(key)
      expect(queue.selected()).toBe("case-b")
    }
    expect(queue.beforeReviewLeaveRef.current).toHaveBeenCalledTimes(5)
    queue.pending(true)
    await queue.press("Escape")
    expect(queue.selected()).toBe("case-b")
    queue.beforeReviewLeaveRef.current.mockResolvedValue(true)
    await queue.press("Escape")
    expect(queue.selected()).toBeNull()
  })

  it("leaves typing, native controls, modifier chords and slide-over focus untouched", async () => {
    const queue = queueHarness()
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT", "BUTTON"]) {
      expect(await queue.press("j", { target: { tagName } as unknown as EventTarget })).not.toHaveBeenCalled()
    }
    for (const modifier of ["metaKey", "ctrlKey", "altKey"]) {
      expect(await queue.press("j", { [modifier]: true })).not.toHaveBeenCalled()
    }
    queue.slideOverOpenRef.current = true
    expect(await queue.press("j")).not.toHaveBeenCalled()
    expect(queue.selected()).toBe("case-b")
    expect(queue.beforeReviewLeaveRef.current).not.toHaveBeenCalled()
  })
})
