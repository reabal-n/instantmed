import { ADMIN_LEDGER_QUICK_FILTER_OPTIONS, sanitizeAdminLedgerSearchTerm } from '@/lib/dashboard/admin-ledger-filters'
import { ADMIN_INTAKE_STATUS_FILTER_OPTIONS, ADMIN_WORK_LANE_FILTER_OPTIONS } from '@/lib/dashboard/admin-work-lanes'
import { QUEUE_STATUS_FILTERS, sanitizeQueueSearchQuery, STAFF_DASHBOARD_HREF, STAFF_LEDGER_HREF } from '@/lib/dashboard/routes'
import { ADMIN_SERVICE_FILTER_OPTIONS } from '@/lib/services/service-presentation'

export type ListOrigin = 'queue' | 'requests' | 'patients'
export interface ListReturnSnapshot {
  origin: ListOrigin
  href: string
  query: string
  page: number
  selectedId: string | null
  focusId: string | null
  scrollTop: number
  windowY: number
}
const values: Record<string, readonly string[]> = {
  status: [...QUEUE_STATUS_FILTERS, ...ADMIN_INTAKE_STATUS_FILTER_OPTIONS.map(option => option.value)],
  service: ADMIN_SERVICE_FILTER_OPTIONS.map(option => option.value),
  workLane: ADMIN_WORK_LANE_FILTER_OPTIONS.map(option => option.value),
  chips: ADMIN_LEDGER_QUICK_FILTER_OPTIONS.map(option => option.value),
  showTestData: ['1'], onlyTestData: ['1'],
}
function safeListHref(origin: ListOrigin, href: string): string {
  const base = origin === 'patients'
    ? (href === '/admin/patients' || href.startsWith('/admin/patients?') ? '/admin/patients' : '/doctor/patients')
    : origin === 'queue' ? STAFF_DASHBOARD_HREF : STAFF_LEDGER_HREF
  if (!href.startsWith(`${base}?`) && href !== base && !href.startsWith(`${base}#`)) return base
  const input = new URL(href, 'https://navigation.invalid')
  const params = new URLSearchParams()
  for (const [key, value] of input.searchParams) {
    if ((key === 'page' || key === 'pageSize') && /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 100000) params.set(key, value)
    else if (origin === 'patients' && key === 'sort' && ['newest', 'name'].includes(value)) params.set(key, value)
    else if (origin === 'patients' && key === 'exception' && ['all', 'needs_details', 'sync_needed', 'duplicates'].includes(value)) params.set(key, value)
    else if (values[key] && value.split(',').every(item => values[key].includes(item))) params.set(key, value)
  }
  return `${base}${params.size ? `?${params}` : ''}${input.hash === '#doctor-queue' ? input.hash : ''}`
}
export function sessionScope(session: { user: { id: string }; access_token: string } | null): string | null {
  if (!session) return null
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { session_id?: unknown }
    return typeof payload.session_id === 'string' && payload.session_id ? `${session.user.id}:${payload.session_id}` : null
  } catch { return null }
}
export function testSessionScope(compiled: boolean, hostname: string, run: string | null, role: string | null, admin: boolean): string | null {
  if (!compiled || !['localhost', '127.0.0.1', '[::1]'].includes(hostname) || !run || !role) return null
  return `test:${run}:${role}:${admin}`
}
export function resolveReturnedSelection(selectedId: string | null, freshIds: readonly string[]) {
  return selectedId && !freshIds.includes(selectedId)
    ? { selectedId: null, announcement: 'The previous request is no longer in this view. The list is up to date.' }
    : { selectedId, announcement: '' }
}
export function createListReturnState() {
  let scope: string | null = null
  let entries: Partial<Record<ListOrigin, ListReturnSnapshot>> = {}
  const intents = new Map<string, ListOrigin>()
  return {
    setScope(next: string | null) { if (next !== scope || !next) { entries = {}; intents.clear() }; scope = next },
    isCurrent(expected: string | null) { return !!expected && scope === expected },
    read(expected: string | null, origin: ListOrigin) { return expected && scope === expected ? entries[origin] ?? null : null },
    write(expected: string | null, data: ListReturnSnapshot) {
      if (!expected || scope !== expected || !['queue', 'requests', 'patients'].includes(data.origin)) return
      // Explicit projection: never retain caller objects, rows, notes or clinical payloads.
      const href = new URL(safeListHref(data.origin, data.href), 'https://navigation.invalid')
      if (data.page > 1) href.searchParams.set('page', String(data.page))
      else href.searchParams.delete('page')
      entries[data.origin] = { origin: data.origin, href: `${href.pathname}${href.search}${href.hash}`, query: data.origin === 'patients' ? data.query.replace(/\s+/g, ' ').trim() : data.origin === 'queue' ? sanitizeQueueSearchQuery(data.query) : sanitizeAdminLedgerSearchTerm(data.query), page: Math.max(1, data.page), selectedId: data.selectedId, focusId: data.focusId, scrollTop: data.scrollTop, windowY: data.windowY }
    },
    bind(expected: string | null, origin: ListOrigin, path: string) {
      if (!expected || scope !== expected || !entries[origin] || !/^\/(doctor\/(patients|intakes)|admin\/intakes)\/[^/?#]+$/.test(path)) return
      intents.delete(path)
      intents.set(path, origin)
      // Bound metadata retained for multi-hop Back/Forward journeys.
      if (intents.size > 50) intents.delete(intents.keys().next().value!)
    },
    destination(expected: string | null, path: string) {
      const origin = intents.get(path)
      return expected && scope === expected && origin ? entries[origin] ?? null : null
    },
  }
}
export type ListReturnState = ReturnType<typeof createListReturnState>

/** A new authenticated document is required after a post-bootstrap transition.
 * Re-keying unchanged RSC children cannot make their previous rows authoritative. */
export function createSessionDocumentBoundary() {
  let priorScope: string | null = null
  let ready = true
  let generation = 0
  return {
    observe(next: string | null) {
      if (priorScope && priorScope !== next) { ready = false; generation++ }
      priorScope = next
    },
    canRender() { return ready },
    // Initial auth resolution must not remount the server-rendered subtree.
    generation() { return generation },
  }
}

/** Bounce a native traversal to the current entry while saving, then replay
 * the same delta. Never push or replace an entry to implement Back/Forward. */
export function createGuardedHistoryTraversal({ initialIndex, traverse, permit }: {
  initialIndex: number
  traverse: (delta: number) => void
  permit: () => Promise<boolean>
}) {
  let current = initialIndex
  let pending: { from: number; to: number; phase: 'restoring' | 'saving' | 'replaying' } | null = null
  return {
    currentIndex() { return current },
    commit(index: number) { current = index; pending = null },
    pop(index: number, guarded: boolean): boolean {
      if (pending) {
        if (pending.phase === 'replaying' && index === pending.to) {
          current = index; pending = null; return false
        }
        if (index !== pending.from) { traverse(pending.from - index); return true }
        if (pending.phase === 'restoring') {
          const attempt = pending
          attempt.phase = 'saving'
          void permit().then(allowed => {
            if (pending !== attempt) return
            if (!allowed) { pending = null; return }
            attempt.phase = 'replaying'
            traverse(attempt.to - attempt.from)
          }, () => { if (pending === attempt) pending = null })
        }
        return true
      }
      if (!guarded || index === current) { current = index; return false }
      pending = { from: current, to: index, phase: 'restoring' }
      traverse(current - index)
      return true
    },
  }
}

// Shared with the native history adapter so replacement ordering is testable.
export function preserveStaffHistoryEntry(data: unknown, currentEntry: unknown, fallbackIndex: number) {
  // Native traversal changes the selected entry before popstate consumers run.
  // Next may replace its RSC state in that gap; the controller still describes
  // the old rendered entry, so it must not relabel the newly selected one.
  const existing = currentEntry && typeof currentEntry === 'object'
    ? (currentEntry as Record<string, unknown>).__imStaffHistoryIndex
    : null
  const index = typeof existing === 'number' && Number.isSafeInteger(existing) ? existing : fallbackIndex
  return { ...(data && typeof data === 'object' ? data : {}), __imStaffHistoryIndex: index }
}

// State setters (including guarded async selection) do not change the current
// React render. Keep the saved metadata until that selection actually renders.
export function commitReturnedSelection(
  selectedId: string | null,
  renderedId: string | null,
  select: (id: string | null) => unknown,
): boolean {
  if (selectedId === renderedId) return true
  void select(selectedId)
  return false
}
