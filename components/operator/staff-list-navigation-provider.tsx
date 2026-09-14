'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, type ReactNode,useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import type { ListOrigin, ListReturnSnapshot, ListReturnState } from '@/lib/operator/cases/list-return-state'
import { guardHistoryReturn } from '@/lib/operator/cases/list-return-state'
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
export function StaffListNavigationProvider({ children, store, scope }: { children: ReactNode; store: ListReturnState; scope: string | null }) {
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
    let currentHref = window.location.href
    let currentState: unknown = window.history.state
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
      currentHref = window.location.href
      currentState = window.history.state
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
    const pop = (event: PopStateEvent) => {
      if (!guards.current.size) { currentHref = window.location.href; currentState = window.history.state; return }
      // Cancel Next's pop handler before it can unmount the editor. Replace the
      // destination entry with the current editor while its durable save settles.
      event.stopImmediatePropagation()
      const destination = window.location.href
      void guardHistoryReturn({
        restore: () => window.history.pushState(currentState, '', currentHref),
        permit,
        leave: () => router.push(destination),
      })
    }
    document.addEventListener('click', click, true)
    window.addEventListener('popstate', pop, true)
    return () => {
      document.removeEventListener('click', click, true)
      window.removeEventListener('popstate', pop, true)
    }
  }, [pathname, permit, router, scope, store])

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
  const { navigationStore, navigationScope } = useAuth()
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
