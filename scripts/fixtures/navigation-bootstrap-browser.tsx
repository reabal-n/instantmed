import { createContext, useContext, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { StaffListNavigationBoundary } from '@/components/operator/staff-list-navigation-boundary'
import { createListReturnState, createSessionDocumentBoundary } from '@/lib/operator/cases/list-return-state'

const documentBoundary = createSessionDocumentBoundary()
const navigationStore = createListReturnState()
const FixtureAuth = createContext({ navigationStore, navigationScope: null as string | null,
  navigationDocumentReady: true, navigationDocumentGeneration: 0 })
export function useFixtureAuth() { return useContext(FixtureAuth) }

const counters = { mounts: 0, unmounts: 0 }
function Child() {
  const [value, setValue] = useState('')
  useEffect(() => { counters.mounts++; return () => { counters.unmounts++ } }, [])
  return <input aria-label="Synthetic draft" value={value} onChange={event => setValue(event.target.value)} />
}
function Fixture() {
  const [auth, setAuth] = useState({ navigationStore, navigationScope: null as string | null,
    navigationDocumentReady: true, navigationDocumentGeneration: 0, transition: 0 })
  useEffect(() => {
    Object.assign(window, { navigationFixture: {
      counters,
      resolve(scope: string | null) {
        documentBoundary.observe(scope)
        navigationStore.setScope(scope)
        setAuth(previous => ({ navigationStore, navigationScope: scope, navigationDocumentReady: documentBoundary.canRender(),
          navigationDocumentGeneration: documentBoundary.generation(), transition: previous.transition + 1 }))
      },
    } })
  }, [])
  return <FixtureAuth.Provider value={auth}><div data-fixture-transition={auth.transition}><StaffListNavigationBoundary><Child /></StaffListNavigationBoundary></div></FixtureAuth.Provider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
