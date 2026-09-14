import { expect, it } from 'vitest'

import { createGuardedHistoryTraversal } from '@/lib/operator/cases/list-return-state'

function historyHarness() {
  const entries = ['before', 'queue', 'request', 'after']
  let index = 2
  let rendered = entries[index]
  let guarded = true
  let allow = true
  let settle: ((result: boolean) => void) | undefined
  let deferred = false
  const controller = createGuardedHistoryTraversal({
    initialIndex: index,
    traverse(delta) { index += delta; if (!controller.pop(index, guarded)) rendered = entries[index] },
    permit: () => deferred ? new Promise<boolean>(resolve => { settle = resolve }) : Promise.resolve(allow),
  })
  return {
    entries,
    go(delta: number) { index += delta; if (!controller.pop(index, guarded)) rendered = entries[index] },
    view: () => ({ index, rendered }),
    guard(value: boolean) { guarded = value },
    defer() { deferred = true },
    resolve(value: boolean) { settle?.(value) },
    deny() { allow = false },
  }
}
it('keeps repeated allowed Back and Forward on the original entries and indices', async () => {
  const history = historyHarness()
  history.go(-1); await Promise.resolve()
  expect(history.view()).toEqual({ index: 1, rendered: 'queue' })
  history.go(-1); await Promise.resolve()
  expect(history.view()).toEqual({ index: 0, rendered: 'before' })
  history.go(1); await Promise.resolve()
  expect(history.view()).toEqual({ index: 1, rendered: 'queue' })
  history.go(1); await Promise.resolve()
  expect(history.view()).toEqual({ index: 2, rendered: 'request' })
  expect(history.entries).toEqual(['before', 'queue', 'request', 'after'])
})
it('restores the original index and preserves editor and forward entries when save fails', async () => {
  const history = historyHarness(); history.defer()
  history.go(-1)
  expect(history.view()).toEqual({ index: 2, rendered: 'request' })
  history.resolve(false); await Promise.resolve()
  expect(history.view()).toEqual({ index: 2, rendered: 'request' })
  history.go(1)
  expect(history.view()).toEqual({ index: 2, rendered: 'request' })
  history.resolve(true); await Promise.resolve()
  expect(history.view()).toEqual({ index: 3, rendered: 'after' })
  expect(history.entries).toHaveLength(4)
})
it('restores multi-entry traversal without pushing a replacement destination', async () => {
  const history = historyHarness(); history.go(-2); await Promise.resolve()
  expect(history.view()).toEqual({ index: 0, rendered: 'before' })
  history.go(2); await Promise.resolve()
  expect(history.view()).toEqual({ index: 2, rendered: 'request' })
})
it('keeps the same pending save during repeated Back attempts and preserves Forward', async () => {
  const history = historyHarness(); history.defer()
  history.go(-1); history.go(-1)
  expect(history.view()).toEqual({ index: 2, rendered: 'request' })
  history.resolve(false); await Promise.resolve()
  history.guard(false); history.go(1)
  expect(history.view()).toEqual({ index: 3, rendered: 'after' })
  expect(history.entries).toEqual(['before', 'queue', 'request', 'after'])
})
