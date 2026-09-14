'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, type ReactNode,useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import type { ListOrigin, ListReturnSnapshot, ListReturnState } from '@/lib/operator/cases/list-return-state'
import { createGuardedHistoryTraversal, preserveStaffHistoryEntry } from '@/lib/operator/cases/list-return-state'
import { useAuth } from '@/lib/supabase/auth-provider'

type Guard = () => Promise<boolean>
interface NavigationContext {
  store: ListReturnState
  scope: string | null
  register: (guard: Guard) => () => void
  permit: () => Promise<boolean>
}
const Context = createContext<NavigationContext | null>(null)

/** Navigation metadata only. Page-local authenticated reads still own every row. */
function StaffListNavigationProvider({ children, store, scope }: { children: ReactNode; store: ListReturnState; scope: string | null }) {
  const guards = useRef(new Set<Guard>())
  const router = useRouter()
  const pathname = usePathname()
  const register = useCallback((guard: Guard) => {
    guards.current.add(guard)
    return () => { guards.current.delete(guard) }
  }, [])
  const permit = useCallback(async () => {
    const expected = scope
    if (!guards.current.size) return true
    for (const guard of Array.from(guards.current)) {
      try { if (!await guard()) return false } catch { return false }
    }
    return store.isCurrent(expected)
  }, [scope, store])

  useEffect(() => {
    const rememberDestination = (path: string) => {
      const origin = pathname === '/dashboard' ? 'queue' : pathname === '/admin/intakes' ? 'requests' : null
      if (!origin) return
      const snapshot = store.read(scope, origin)
      if (!snapshot) return
      const row = snapshot.selectedId ? findVisibleRow(snapshot.selectedId) : null
      let host = row?.parentElement ?? null
      while (host && host.scrollHeight <= host.clientHeight) host = host.parentElement
      store.write(scope, { ...snapshot, scrollTop: host?.scrollTop ?? 0, windowY: window.scrollY })
      store.bind(scope, origin, path)
    }
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.dataset.staffLocalAction === 'true' || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      rememberDestination(destination.pathname)
      if (!guards.current.size) return
      event.preventDefault()
      event.stopImmediatePropagation()
      void permit().then(allowed => { if (allowed) router.push(`${destination.pathname}${destination.search}${destination.hash}`) })
    }
    document.addEventListener('click', click, true)
    return () => {
      document.removeEventListener('click', click, true)
    }
  }, [pathname, permit, router, scope, store])

  useEffect(() => {
    const marker = '__imStaffHistoryIndex'
    const indexOf = (state: unknown): number | null => {
      const index = state && typeof state === 'object' ? (state as Record<string, unknown>)[marker] : null
      return typeof index === 'number' && Number.isSafeInteger(index) ? index : null
    }
    const controller = createGuardedHistoryTraversal({
      initialIndex: indexOf(window.history.state) ?? 0,
      traverse: delta => window.history.go(delta),
      permit,
    })
    const push = window.history.pushState
    const replace = window.history.replaceState
    let active = true
    const withIndex = (data: unknown, index: number) => ({ ...(data && typeof data === 'object' ? data : {}), [marker]: index })
    const pushTracked: History['pushState'] = function (data, unused, url) {
      if (!active) { push.call(window.history, data, unused, url); return }
      const index = controller.currentIndex() + 1
      push.call(window.history, withIndex(data, index), unused, url)
      controller.commit(index)
    }
    const replaceTracked: History['replaceState'] = function (data, unused, url) {
      replace.call(window.history, active ? preserveStaffHistoryEntry(data, window.history.state, controller.currentIndex()) : data, unused, url)
    }
    window.history.pushState = pushTracked
    window.history.replaceState = replaceTracked
    replaceTracked.call(window.history, window.history.state, '', window.location.href)
    const pop = (event: PopStateEvent) => {
      const index = indexOf(event.state)
      // Entries outside this document use the existing beforeunload protection.
      if (index !== null && controller.pop(index, guards.current.size > 0)) event.stopImmediatePropagation()
    }
    window.addEventListener('popstate', pop, true)
    return () => {
      active = false
      if (window.history.pushState === pushTracked) window.history.pushState = push
      if (window.history.replaceState === replaceTracked) window.history.replaceState = replace
      window.removeEventListener('popstate', pop, true)
    }
  }, [permit])

  const value = useMemo(() => ({ store, scope, register, permit }), [store, scope, register, permit])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useStaffNavigation() { return useContext(Context) }
export function useStaffLeaveGuard(guard: Guard | undefined) {
  const navigation = useStaffNavigation()
  useEffect(() => guard ? navigation?.register(guard) : undefined, [guard, navigation])
}
export function useStaffReturnDestination() {
  const navigation = useStaffNavigation()
  const path = usePathname()
  return navigation?.store.destination(navigation.scope, path) ?? null
}

export function useStaffListReturn(origin: ListOrigin) {
  const navigation = useStaffNavigation()
  const initial = useRef(navigation?.store.read(navigation.scope, origin) ?? null)
  const capture = useCallback((snapshot: Omit<ListReturnSnapshot, 'origin'>) => {
    navigation?.store.write(navigation.scope, { ...snapshot, origin })
  }, [navigation, origin])
  const bind = useCallback((path: string) => navigation?.store.bind(navigation.scope, origin, path), [navigation, origin])
  return { restored: initial.current, capture, bind, navigation }
}

export function restoreListFocus(snapshot: ListReturnSnapshot, exists: boolean, fallback: HTMLElement | null) {
  requestAnimationFrame(() => {
    const id = snapshot.selectedId ?? ''
    const row = exists ? findVisibleRow(id) : null
    const actions = row ? Array.from(row.querySelectorAll<HTMLElement>('button, a, [tabindex]')).filter(element => element.getClientRects().length > 0) : []
    const index = snapshot.focusId?.startsWith('action:') ? Number(snapshot.focusId.slice(7)) : 0
    const target = actions[index] ?? actions[0] ?? row ?? fallback
    if (target) { if (!target.hasAttribute('tabindex') && (target === row || target === fallback)) target.tabIndex = -1; target.focus({ preventScroll: true }) }
    let host = row?.parentElement ?? fallback
    while (host && host.scrollHeight <= host.clientHeight) host = host.parentElement
    host?.scrollTo({ top: snapshot.scrollTop })
    window.scrollTo({ top: snapshot.windowY })
  })
}

export function StaffListNavigationBoundary({ children }: { children: ReactNode }) {
  const { navigationStore, navigationScope, navigationDocumentReady } = useAuth()
  const pathname = usePathname()
  const protectedWorkspace = /^\/(dashboard|doctor|admin)(?:\/|$)/.test(pathname)
  const needsFreshDocument = protectedWorkspace && !navigationDocumentReady
  useEffect(() => {
    if (needsFreshDocument && navigationScope) window.location.replace(window.location.href)
  }, [needsFreshDocument, navigationScope])
  if (needsFreshDocument) return <div role="status" className="p-6 text-sm text-muted-foreground">Session changed. Reloading workspace…</div>
  return <StaffListNavigationProvider key={navigationScope ?? 'anonymous'} store={navigationStore} scope={navigationScope}>{children}</StaffListNavigationProvider>
}

function findVisibleRow(id: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="queue-row-${CSS.escape(id)}"], [data-row-id="${CSS.escape(id)}"]`)).find(row => row.getClientRects().length > 0) ?? null
}
export function initiatingListAction(id: string): string {
  const row = findVisibleRow(id)
  const actions = row ? Array.from(row.querySelectorAll<HTMLElement>('button, a, [tabindex]')).filter(element => element.getClientRects().length > 0) : []
  return `action:${Math.max(0, actions.indexOf(document.activeElement as HTMLElement))}`
}
