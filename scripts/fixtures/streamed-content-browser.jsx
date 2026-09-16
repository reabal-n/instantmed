import React, { lazy, useEffect } from 'react'
import { StreamedContent } from '@/components/shared/streamed-content'
import { hydrateRoot } from 'react-dom/client'

const root = document.getElementById('root')
const originalLabel = root.querySelector('label')
const originalInput = root.querySelector('input')
originalInput.value = 'Edited before hydration'
const errors = []
const mode = new URL(location.href).searchParams.get('mode')
window.probe = { mode, errors, done: false, version: React.version }
function Finished() {
  useEffect(() => {
    window.probe.done = true
    window.probe.sameLabel = originalLabel === root.querySelector('label')
    window.probe.sameInput = originalInput === root.querySelector('input')
    window.probe.value = root.querySelector('input').value
    window.probe.html = root.innerHTML
  }, [])
  return null
}
const lazyContent = lazy(() => {
  let complete
  const promise = new Promise(resolve => { complete = resolve })
  // Flight chunks expose status/value; this makes React's immediate replay path observable.
  promise.status = 'pending'
  queueMicrotask(() => {
    promise.status = 'fulfilled'
    promise.value = { default: <>{'value'}<input aria-label="Synthetic edit" defaultValue="Initial" /><Finished /></> }
    complete(promise.value)
  })
  return promise
})

function App() {
  return <React.Suspense><label>{mode === 'wrapped' ? <StreamedContent>{lazyContent}</StreamedContent> : lazyContent}</label></React.Suspense>
}
React.startTransition(() => {
  hydrateRoot(root, <App />, { onRecoverableError(error) { errors.push(error.message) } })
})
