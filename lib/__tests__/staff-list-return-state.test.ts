import type { Page } from '@playwright/test'
import { describe, expect, it, vi } from 'vitest'

import { loginAsOperator } from '@/e2e/helpers/auth'
import { commitReturnedSelection, createListReturnState, createSessionDocumentBoundary, resolveReturnedSelection, sessionScope, testSessionScope } from '@/lib/operator/cases/list-return-state'

const snapshot = { origin: 'queue' as const, href: '/dashboard?status=review&page=2&q=private', query: 'E2E Navigation Patient', page: 2, selectedId: 'request-a', focusId: 'queue-row-request-a', scrollTop: 30, windowY: 0 }
const token = (id: string) => `a.${btoa(JSON.stringify({ session_id: id }))}.c`
describe('staff list return intent', () => {
  it('keeps only safe public navigation values in copied URLs', () => {
    const state = createListReturnState(); state.setScope('a:s1')
    state.write('a:s1', snapshot)
    expect(state.read('a:s1', 'queue')?.href).toBe('/dashboard?status=review&page=2')
    for (const href of ['//evil.test?q=private', '/dashboard?status=private&page=NaN&returnTo=https://evil.test']) {
      state.write('a:s1', { ...snapshot, href, page: 1 })
      expect(state.read('a:s1', 'queue')?.href).toBe('/dashboard')
    }
  })
  it('retains same-session refresh and clears account changes and new logins', () => {
    const state = createListReturnState()
    state.setScope('a:s1'); state.write('a:s1', snapshot)
    state.setScope('a:s1'); expect(state.read('a:s1', 'queue')?.query).toBe(snapshot.query)
    state.setScope('a:s2'); expect(state.read('a:s2', 'queue')).toBeNull()
    state.write('a:s2', snapshot); state.setScope('b:s2'); expect(state.read('b:s2', 'queue')).toBeNull()
  })
  it('rejects late writes and results after signout or unknown sessions', () => {
    const state = createListReturnState(); state.setScope('a:s1'); state.write('a:s1', snapshot)
    state.setScope(null); state.write('a:s1', snapshot)
    expect(state.read('a:s1', 'queue')).toBeNull(); expect(state.isCurrent('a:s1')).toBe(false)
    expect(sessionScope({ user: { id: 'a' }, access_token: 'invalid' })).toBeNull()
    expect(sessionScope({ user: { id: 'a' }, access_token: token('s1') })).toBe('a:s1')
  })
  it('binds return intent to its exact destination and excludes clinical payloads', () => {
    const state = createListReturnState(); state.setScope('a:s1')
    state.write('a:s1', { ...snapshot, notes: 'private note', rows: ['clinical'] } as typeof snapshot)
    state.bind('a:s1', 'queue', '/doctor/intakes/request-a')
    expect(state.destination('a:s1', '/doctor/intakes/request-b')).toBeNull()
    expect(state.destination('a:s1', '/doctor/intakes/request-a')?.origin).toBe('queue')
    expect(state.read('a:s1', 'queue')).not.toHaveProperty('notes')
    expect(state.read('a:s1', 'queue')).not.toHaveProperty('rows')
  })
  it('never silently selects another patient when the original has moved', () => {
    expect(resolveReturnedSelection('a', ['b'])).toEqual({ selectedId: null, announcement: 'The previous request is no longer in this view. The list is up to date.' })
    expect(resolveReturnedSelection('a', ['a', 'b']).selectedId).toBe('a')
  })
  it('requires both compiled test mode and loopback for cookie-based test scopes', () => {
    expect(testSessionScope(false, 'localhost', 'run', 'doctor', false)).toBeNull()
    expect(testSessionScope(true, 'instantmed.com.au', 'run', 'doctor', false)).toBeNull()
    expect(testSessionScope(true, 'localhost', '', 'doctor', false)).toBeNull()
    expect(testSessionScope(true, 'localhost', 'run', 'doctor', false)).not.toBe(testSessionScope(true, 'localhost', 'run', 'doctor', true))
  })
})

describe('asynchronous session ownership', () => {
  it('does not apply an old search when its response arrives after signout', async () => {
    const state = createListReturnState(); state.setScope('a:s1')
    let complete!: (value: string[]) => void
    const response = new Promise<string[]>(resolve => { complete = resolve })
    let rows: string[] = []
    const apply = response.then(result => { if (state.isCurrent('a:s1')) rows = result })
    state.setScope(null); complete(['old patient']); await apply
    expect(rows).toEqual([])
  })
  it('partitions a new same-account session but keeps refreshed access tokens', () => {
    expect(sessionScope({ user: { id: 'a' }, access_token: token('session-one') })).toBe(sessionScope({ user: { id: 'a' }, access_token: `${token('session-one')}new-signature` }))
    expect(sessionScope({ user: { id: 'a' }, access_token: token('session-one') })).not.toBe(sessionScope({ user: { id: 'a' }, access_token: token('session-two') }))
  })
})

describe('normalized return queries', () => {
  it.each(['queue', 'requests'] as const)('restores %s search identity and page after whitespace and punctuation normalization', origin => {
    const state = createListReturnState(); state.setScope('a:s1')
    state.write('a:s1', { ...snapshot, origin, href: origin === 'queue' ? '/dashboard?page=2' : '/admin/intakes?page=2', query: '  E2E   Navigation !! Patient  ' })
    const returned = state.read('a:s1', origin)
    expect(returned?.query).toBe('E2E Navigation Patient')
    expect(returned?.page).toBe(2)
    expect(returned?.href).toContain('page=2')
  })
  it('recognizes an input that normalizes to empty as an unsearched return', () => {
    const state = createListReturnState(); state.setScope('a:s1')
    state.write('a:s1', { ...snapshot, query: ' !!! ' })
    expect(state.read('a:s1', 'queue')?.query).toBe('')
  })
})


describe('session document authority', () => {
  it('preserves the initial subtree generation but changes it after established sessions end', () => {
    const boundary = createSessionDocumentBoundary()
    expect(boundary.generation()).toBe(0)
    for (const scope of [null, null, 'a:one', 'a:one']) {
      boundary.observe(scope)
      expect(boundary.generation()).toBe(0)
      expect(boundary.canRender()).toBe(true)
    }
    boundary.observe('a:two')
    expect(boundary.generation()).toBe(1)
    expect(boundary.canRender()).toBe(false)
    boundary.observe(null)
    expect(boundary.generation()).toBe(2)
    boundary.observe('b:three')
    expect(boundary.generation()).toBe(2)
    expect(boundary.canRender()).toBe(false)
  })
  it('never republishes unchanged old RSC rows during account or session replacement', () => {
    const boundary = createSessionDocumentBoundary()
    const oldServerRows = ['previous account clinical row']
    boundary.observe('a:one')
    expect(boundary.canRender()).toBe(true)
    boundary.observe('b:two')
    expect(boundary.canRender() ? oldServerRows : []).toEqual([])
    boundary.observe('b:two')
    expect(boundary.canRender() ? oldServerRows : []).toEqual([])
  })
  it('retains bootstrap and same-session refresh but blocks signout and same-account new login', () => {
    const boundary = createSessionDocumentBoundary()
    boundary.observe(null); expect(boundary.canRender()).toBe(true)
    boundary.observe('a:one'); boundary.observe('a:one'); expect(boundary.canRender()).toBe(true)
    boundary.observe(null); expect(boundary.canRender()).toBe(false)
    boundary.observe('a:two'); expect(boundary.canRender()).toBe(false)
    const sameAccount = createSessionDocumentBoundary()
    sameAccount.observe('a:one'); sameAccount.observe('a:two'); expect(sameAccount.canRender()).toBe(false)
    const freshDocument = createSessionDocumentBoundary()
    freshDocument.observe('a:two'); expect(freshDocument.canRender()).toBe(true)
  })
})

// A restored selection schedules React state; the old null render must not
// overwrite authenticated return metadata before the new render commits.
describe('return selection commit', () => {
  it('retains the complete snapshot across the asynchronous null render', async () => {
    const state = createListReturnState(); state.setScope('a:s1'); state.write('a:s1', snapshot)
    let rendered: string | null = null
    let requested: string | null = null
    const select = async (id: string | null) => { await Promise.resolve(); requested = id }
    if (commitReturnedSelection('request-a', rendered, select)) state.write('a:s1', { ...snapshot, selectedId: rendered })
    expect(state.read('a:s1', 'queue')?.selectedId).toBe('request-a')
    await Promise.resolve(); rendered = requested
    expect(commitReturnedSelection('request-a', rendered, select)).toBe(true)
  })
  it('does not release the snapshot when selection is refused', () => {
    expect(commitReturnedSelection('request-a', null, () => {})).toBe(false)
  })
})


describe('browser fixture session ownership', () => {
  it.each([undefined, 'ci-run'])('passes a navigation session to the separately started test server (%s)', async runId => {
    vi.stubEnv('E2E_RUN_ID', runId)
    const cookies: { name: string; value: string }[] = []
    const page = {
      request: {
        post: async (_url: string, options: { data: { e2eRunId?: string } }) => {
          cookies.push({ name: '__e2e_auth_user_id', value: 'operator' })
          if (options.data.e2eRunId) cookies.push({ name: '__e2e_run_id', value: options.data.e2eRunId })
          return { ok: () => true }
        },
        storageState: async () => ({ cookies }),
      },
      context: () => ({ clearCookies: async () => {}, addCookies: async () => {}, cookies: async () => cookies }),
    } as unknown as Page
    try {
      expect(await loginAsOperator(page)).toEqual({ success: true })
      const run = cookies.find(cookie => cookie.name === '__e2e_run_id')?.value ?? null
      const scope = testSessionScope(true, 'localhost', run, 'doctor', true)
      const store = createListReturnState()
      store.setScope(scope)
      expect(store.isCurrent(scope)).toBe(true)
      if (runId) expect(run).toBe(runId)
    } finally { vi.unstubAllEnvs() }
  })
})
