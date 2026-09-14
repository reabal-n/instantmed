import { expect, it } from 'vitest'

import { guardHistoryReturn } from '@/lib/operator/cases/list-return-state'

it('restores the current URL before awaiting a rejected note flush, without leaving the editor', async () => {
  const history = ['/dashboard', '/doctor/intakes/a']
  let editor = 'unsaved synthetic note'
  let settle!: (allowed: boolean) => void
  history.pop()
  const pending = guardHistoryReturn({
    restore: () => { history.push('/doctor/intakes/a') },
    permit: () => new Promise<boolean>(resolve => { settle = resolve }),
    leave: () => { history.push('/dashboard'); editor = '' },
  })
  expect(history.at(-1)).toBe('/doctor/intakes/a')
  expect(editor).toBe('unsaved synthetic note')
  settle(false); await pending
  expect(history.at(-1)).toBe('/doctor/intakes/a')
  expect(editor).toBe('unsaved synthetic note')
})
it('permits the intended destination only after a successful flush', async () => {
  let destination = 'editor'
  await guardHistoryReturn({ restore: () => { destination = 'editor' }, permit: async () => true, leave: () => { destination = 'requests' } })
  expect(destination).toBe('requests')
})
