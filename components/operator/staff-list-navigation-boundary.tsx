'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { findVisibleRow, StaffNavigationContext as Context } from '@/components/operator/staff-list-navigation-provider'
import type { ListReturnState } from '@/lib/operator/cases/list-return-state'
import { createGuardedHistoryTraversal, preserveStaffHistoryEntry } from '@/lib/operator/cases/list-return-state'
import { useAuth } from '@/lib/supabase/auth-provider'

type Guard = () => Promise<boolean>

/** Navigation metadata only. Page-local authenticated reads still own every row. */
function StaffListNavigationProvider({ children, store, scope, generation }: { children: ReactNode; store: ListReturnState; scope: string | null; generation: number }) {
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
  const permitRef = useRef(permit)
  permitRef.current = permit

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

  // Window-target popstate listeners run in registration order, even when a
  // later listener requests capture. Install before Next's passive listener and
  // retain that position when auth bootstrap changes the permission callback.
  useLayoutEffect(() => {
    const marker = '__imStaffHistoryIndex'
    const indexOf = (state: unknown): number | null => {
      const index = state && typeof state === 'object' ? (state as Record<string, unknown>)[marker] : null
      return typeof index === 'number' && Number.isSafeInteger(index) ? index : null
    }
    const controller = createGuardedHistoryTraversal({
      initialIndex: indexOf(window.history.state) ?? 0,
      traverse: delta => window.history.go(delta),
      permit: () => permitRef.current(),
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
  }, [])

  const value = useMemo(() => ({ store, scope, register, permit }), [store, scope, register, permit])
  return <Context.Provider key={generation} value={value}>{children}</Context.Provider>
}

export function StaffListNavigationBoundary({ children }: { children: ReactNode }) {
  const { navigationStore, navigationScope, navigationDocumentReady, navigationDocumentGeneration } = useAuth()
  const pathname = usePathname()
  const protectedWorkspace = /^\/(dashboard|doctor|admin)(?:\/|$)/.test(pathname)
  const needsFreshDocument = protectedWorkspace && !navigationDocumentReady
  useEffect(() => {
    if (needsFreshDocument && navigationScope) window.location.replace(window.location.href)
  }, [needsFreshDocument, navigationScope])
  if (needsFreshDocument) return <div role="status" className="p-6 text-sm text-muted-foreground">Session changed. Reloading workspace…</div>
  return <StaffListNavigationProvider store={navigationStore} scope={navigationScope} generation={navigationDocumentGeneration}>{children}</StaffListNavigationProvider>
}
