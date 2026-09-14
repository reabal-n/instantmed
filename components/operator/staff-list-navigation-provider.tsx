import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

import type { ListOrigin, ListReturnSnapshot, ListReturnState } from '@/lib/operator/cases/list-return-state'

type Guard = () => Promise<boolean>
interface NavigationContext {
  store: ListReturnState
  scope: string | null
  register: (guard: Guard) => () => void
  permit: () => Promise<boolean>
}
export const StaffNavigationContext = createContext<NavigationContext | null>(null)

export function useStaffNavigation() { return useContext(StaffNavigationContext) }
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

export function findVisibleRow(id: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="queue-row-${CSS.escape(id)}"], [data-row-id="${CSS.escape(id)}"]`)).find(row => row.getClientRects().length > 0) ?? null
}
export function initiatingListAction(id: string): string {
  const row = findVisibleRow(id)
  const actions = row ? Array.from(row.querySelectorAll<HTMLElement>('button, a, [tabindex]')).filter(element => element.getClientRects().length > 0) : []
  return `action:${Math.max(0, actions.indexOf(document.activeElement as HTMLElement))}`
}
