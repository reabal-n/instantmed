import { readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it, vi } from "vitest"

// Execute the production callbacks, including the real leave guard and decision
// wrapper. The Node suite does not mount React or duplicate their state machine.
const source = ts.createSourceFile("review-actions.tsx", readFileSync(join(process.cwd(), "components/doctor/review-actions.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const callbacks = new Map<string, string>()
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.initializer) callbacks.set(node.name.getText(source), node.initializer.getText(source))
  ts.forEachChild(node, visit)
}
visit(source)
function callback(name: string, scope: Record<string, unknown>) {
  const code = ts.transpileModule(`return ${callbacks.get(name)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(scope), code)(...Object.values(scope))
}

function harness() {
  const pending = { current: false }
  let open = true
  let allowed = true
  const events: string[] = []
  const toast = { info: vi.fn(), error: vi.fn(), success: vi.fn() }
  const scope: Record<string, unknown> = {
    useCallback: (fn: unknown) => fn,
    decisionPendingRef: pending,
    setIsPending: (value: boolean) => { events.push(`pending:${value}`) },
    flushCurrentNotes: vi.fn(async () => allowed),
    toast,
    onActionComplete: vi.fn(() => events.push("advance")),
    router: { refresh: vi.fn() },
  }
  const flushNotes = callback("flushNotes", scope) as () => Promise<boolean>
  scope.closePanel = async () => {
    if (!await flushNotes()) return false
    open = false
    events.push("close")
    return true
  }
  scope.closeAndRefresh = callback("closeAndRefresh", scope)
  scope.runReviewDecision = callback("runReviewDecision", scope)
  Object.assign(scope, {
    intake: { id: "owned-synthetic-request" }, hasRedFlags: false, redFlagsAcknowledged: false,
    resolveDecisionNote: () => null,
    updateStatusAction: vi.fn(async () => { events.push("durable-success"); return { success: true } }),
  })
  return {
    scope, events, pending, toast, flushNotes,
    open: () => open,
    deny: () => { allowed = false },
    status: () => callback("handleStatusChange", scope)("completed") as Promise<void>,
  }
}

describe("review decision navigation", () => {
  it("closes and advances successful completion only after the decision settles", async () => {
    const h = harness()
    await h.status()
    expect(h.open()).toBe(false)
    expect(h.events).toEqual(["pending:true", "durable-success", "pending:false", "close", "advance"])
    expect(h.toast.info).not.toHaveBeenCalled()
  })

  it("retains the review when notes cannot save or the decision fails", async () => {
    const h = harness()
    h.deny()
    await h.status()
    expect(h.scope.updateStatusAction).not.toHaveBeenCalled()
    expect(h.open()).toBe(true)
    const failed = harness()
    failed.scope.updateStatusAction = async () => ({ success: false, error: "Synthetic refusal" })
    await failed.status()
    expect(failed.open()).toBe(true)
    expect(failed.scope.onActionComplete).not.toHaveBeenCalled()
  })

  it("still rejects user navigation while the durable decision is pending", async () => {
    const h = harness()
    let settle: ((result: { success: boolean }) => void) | undefined
    h.scope.updateStatusAction = () => new Promise(resolve => { settle = resolve })
    const action = h.status()
    await Promise.resolve()
    expect(h.pending.current).toBe(true)
    expect(await h.flushNotes()).toBe(false)
    expect(h.open()).toBe(true)
    settle!({ success: true })
    await action
    expect(h.open()).toBe(false)
  })

  it("does not advance if another leave guard denies the completion close", async () => {
    const h = harness()
    h.scope.closePanel = async () => false
    h.scope.closeAndRefresh = callback("closeAndRefresh", h.scope)
    h.scope.runReviewDecision = callback("runReviewDecision", h.scope)
    await h.status()
    expect(h.open()).toBe(true)
    expect(h.scope.onActionComplete).not.toHaveBeenCalled()
  })

  it.each(["handleCertPreviewConfirm", "handleApprovePrescribedScript", "handleDecline"])("settles %s before its successful close", async name => {
    const h = harness()
    let editor = ""
    const decisionNote = "Synthetic supported clinical note."
    Object.assign(h.scope, {
      resolveDecisionNote: () => decisionNote,
      persistNotes: async () => ({ success: true }),
      approveWithPreviewDataAction: async () => ({ success: true }),
      approvePrescribedScriptAction: async () => ({ success: true }),
      declineIntakeAction: async () => ({ success: true }),
      declineReason: "Synthetic closure", declineReasonCode: "other",
      validateDeclineReason: () => null, isAdministrativeClosure: () => false,
      setShowDeclineDialog: vi.fn(), setShowCertPreview: vi.fn(), playApprovalSound: vi.fn(),
      setDoctorNotes: (notes: string) => { editor = notes },
      lastSavedNotesRef: { current: "" }, setNoteSaved: vi.fn(), setSavedAt: vi.fn(), setAutoSaveError: vi.fn(), setIsAiPrefilled: vi.fn(),
    })
    await callback(name, h.scope)({})
    expect(h.open()).toBe(false)
    expect(h.events).toEqual(["pending:true", "pending:false", "close", "advance"])
    if (name !== "handleDecline") expect(editor).toBe(decisionNote)
  })
})
