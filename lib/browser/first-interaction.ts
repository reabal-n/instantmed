// Keep this to intentional input only. Treating passive scroll as "first
// interaction" pulls telemetry/replay chunks onto the mobile intake critical
// path during Lighthouse and during low-intent browsing.
const FIRST_INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart"] as const
const FIRST_INTERACTION_CALLBACK_DELAY_MS = 200
const FIRST_INTERACTION_IGNORE_SELECTOR = '[data-first-interaction-ignore="true"]'

let hasInteracted = false
const callbacks = new Set<FirstInteractionCallback>()
let listening = false

type FirstInteractionCallback = {
  active: boolean
  callback: () => void
}

function removeListeners() {
  FIRST_INTERACTION_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, fire)
  })
  listening = false
}

function shouldIgnoreFirstInteraction(event: Event): boolean {
  return event.target instanceof Element && event.target.closest(FIRST_INTERACTION_IGNORE_SELECTOR) !== null
}

function fire(event: Event) {
  if (hasInteracted) return
  if (shouldIgnoreFirstInteraction(event)) return

  hasInteracted = true
  removeListeners()

  const pendingCallbacks = Array.from(callbacks)
  callbacks.clear()
  window.setTimeout(() => {
    pendingCallbacks.forEach((entry) => {
      if (entry.active) entry.callback()
    })
  }, FIRST_INTERACTION_CALLBACK_DELAY_MS)
}

function ensureListeners() {
  if (listening) return

  FIRST_INTERACTION_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, fire, { passive: true })
  })
  listening = true
}

export function onFirstInteraction(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  if (hasInteracted) {
    callback()
    return () => {}
  }

  ensureListeners()
  const entry: FirstInteractionCallback = {
    active: true,
    callback,
  }

  callbacks.add(entry)

  return () => {
    entry.active = false
    callbacks.delete(entry)
  }
}
