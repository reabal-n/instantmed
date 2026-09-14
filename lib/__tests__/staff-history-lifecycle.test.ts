import { readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { expect, it, vi } from "vitest"

import { createGuardedHistoryTraversal, preserveStaffHistoryEntry } from "@/lib/operator/cases/list-return-state"

const source = ts.createSourceFile("boundary.tsx", readFileSync(join(process.cwd(), "components/operator/staff-list-navigation-boundary.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let adapter = ""
let rekeysAdapter = false
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.arguments[0]?.getText(source).includes("const marker = '__imStaffHistoryIndex'")) adapter = node.getText(source)
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "StaffListNavigationProvider") rekeysAdapter = node.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === "key")
  ts.forEachChild(node, visit)
}
visit(source)

it("keeps the history guard ahead of Next through authenticated bootstrap and later permit changes", async () => {
  const entries: Record<string, unknown>[] = [{}]
  let pointer = 0
  const traversals: number[] = []
  const listeners: Array<(event: PopStateEvent) => void> = []
  const guards = { current: new Set<() => Promise<boolean>>() }
  const denied = vi.fn(async () => false)
  const nextRestore = vi.fn(() => { guards.current.clear() })
  const history = {
    get state() { return entries[pointer] },
    pushState(data: Record<string, unknown>) { entries.splice(pointer + 1); entries.push(data); pointer++ },
    replaceState(data: Record<string, unknown>) { entries[pointer] = data },
    go(delta: number) { traversals.push(delta) },
  }
  const window = {
    history, location: { href: "https://local.invalid/admin/intakes" },
    // Chromium Window-target events invoke listeners in registration order:
    // a later capture:true listener does not run before an earlier bubble one.
    addEventListener(_name: string, listener: (event: PopStateEvent) => void) { listeners.push(listener) },
    removeEventListener(_name: string, listener: (event: PopStateEvent) => void) { const index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1) },
  }
  let dependencies: unknown[] | undefined
  let cleanup: (() => void) | undefined
  const effect = (install: () => () => void, next: unknown[]) => {
    if (dependencies && next.length === dependencies.length && next.every((value, index) => value === dependencies![index])) return
    cleanup?.(); cleanup = install(); dependencies = next
  }
  const permitRef = { current: async () => true }
  const passiveEffects: Array<() => void> = []
  const compiled = ts.transpileModule(adapter, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const render = (permit: () => Promise<boolean>) => {
    permitRef.current = permit
    const scope = { window, guards, permit, permitRef, useEffect: (install: () => () => void, deps: unknown[]) => passiveEffects.push(() => effect(install, deps)), useLayoutEffect: effect, createGuardedHistoryTraversal, preserveStaffHistoryEntry }
    new Function(...Object.keys(scope), compiled)(...Object.values(scope))
  }
  // Initial adapter mounts, then Next adds its own passive-effect listener.
  render(async () => true)
  listeners.push(nextRestore)
  passiveEffects.splice(0).forEach(install => install())
  // Auth bootstrap used to re-key the adapter and install it after Next.
  if (rekeysAdapter) { cleanup?.(); cleanup = undefined; dependencies = undefined }
  render(async () => { for (const guard of guards.current) if (!await guard()) return false; return true })
  passiveEffects.splice(0).forEach(install => install())
  history.pushState({ __NA: true })
  guards.current.add(denied)
  const pop = (delta: number) => {
    pointer += delta
    let stopped = false
    const event = { state: entries[pointer], stopImmediatePropagation() { stopped = true } } as unknown as PopStateEvent
    for (const listener of [...listeners]) { listener(event); if (stopped) break }
  }
  pop(-1)
  while (traversals.length) { pop(traversals.shift()!); await Promise.resolve() }
  await Promise.resolve()
  expect(denied).toHaveBeenCalledOnce()
  expect(nextRestore).not.toHaveBeenCalled()
  expect(pointer).toBe(1)
  expect(guards.current.size).toBe(1)
  expect(entries.map(entry => entry.__imStaffHistoryIndex)).toEqual([0, 1])
  render(async () => true)
  passiveEffects.splice(0).forEach(install => install())
  pop(-1)
  while (traversals.length) { pop(traversals.shift()!); await Promise.resolve() }
  await Promise.resolve()
  expect(pointer).toBe(0)
  expect(nextRestore).toHaveBeenCalledOnce()
  cleanup?.()
})
