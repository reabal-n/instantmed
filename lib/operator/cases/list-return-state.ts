import { ADMIN_LEDGER_QUICK_FILTER_OPTIONS } from '@/lib/dashboard/admin-ledger-filters'
import { ADMIN_INTAKE_STATUS_FILTER_OPTIONS, ADMIN_WORK_LANE_FILTER_OPTIONS } from '@/lib/dashboard/admin-work-lanes'
import { QUEUE_STATUS_FILTERS, STAFF_DASHBOARD_HREF, STAFF_LEDGER_HREF } from '@/lib/dashboard/routes'
import { ADMIN_SERVICE_FILTER_OPTIONS } from '@/lib/services/service-presentation'

export type ListOrigin = 'queue' | 'requests'
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
export function safeListHref(origin: ListOrigin, href: string): string {
  const base = origin === 'queue' ? STAFF_DASHBOARD_HREF : STAFF_LEDGER_HREF
  if (!href.startsWith(`${base}?`) && href !== base && !href.startsWith(`${base}#`)) return base
  const input = new URL(href, 'https://navigation.invalid')
  const params = new URLSearchParams()
  for (const [key, value] of input.searchParams) {
    if ((key === 'page' || key === 'pageSize') && /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 100000) params.set(key, value)
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
  let intent: { origin: ListOrigin; path: string } | null = null
  return {
    setScope(next: string | null) { if (next !== scope || !next) { entries = {}; intent = null }; scope = next },
    isCurrent(expected: string | null) { return !!expected && scope === expected },
    read(expected: string | null, origin: ListOrigin) { return expected && scope === expected ? entries[origin] ?? null : null },
    write(expected: string | null, data: ListReturnSnapshot) {
      if (!expected || scope !== expected || !['queue', 'requests'].includes(data.origin)) return
      // Explicit projection: never retain caller objects, rows, notes or clinical payloads.
      const href = new URL(safeListHref(data.origin, data.href), 'https://navigation.invalid')
      if (data.page > 1) href.searchParams.set('page', String(data.page))
      else href.searchParams.delete('page')
      entries[data.origin] = { origin: data.origin, href: `${href.pathname}${href.search}${href.hash}`, query: data.query.slice(0, 200), page: Math.max(1, data.page), selectedId: data.selectedId, focusId: data.focusId, scrollTop: data.scrollTop, windowY: data.windowY }
    },
    bind(expected: string | null, origin: ListOrigin, path: string) {
      if (!expected || scope !== expected || !entries[origin] || !/^\/(doctor\/(patients|intakes)|admin\/intakes)\/[^/?#]+$/.test(path)) return
      intent = { origin, path }
    },
    destination(expected: string | null, path: string) {
      return expected && scope === expected && intent?.path === path ? entries[intent.origin] ?? null : null
    },
  }
}
export type ListReturnState = ReturnType<typeof createListReturnState>

export async function guardHistoryReturn({ restore, permit, leave }: {
  restore: () => void
  permit: () => Promise<boolean>
  leave: () => void
}): Promise<void> {
  restore()
  try { if (await permit()) leave() } catch { /* Keep the current editor on save failure. */ }
}
