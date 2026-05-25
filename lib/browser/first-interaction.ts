// Keep this to intentional input only. Treating passive scroll as "first
// interaction" pulls telemetry/replay chunks onto the mobile intake critical
// path during Lighthouse and during low-intent browsing.
const FIRST_INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart"] as const

let hasInteracted = false
const callbacks = new Set<() => void>()
let listening = false

function removeListeners() {
  FIRST_INTERACTION_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, fire)
  })
  listening = false
}

function fire() {
  if (hasInteracted) return

  hasInteracted = true
  removeListeners()

  const pendingCallbacks = Array.from(callbacks)
  callbacks.clear()
  pendingCallbacks.forEach((callback) => callback())
}

function ensureListeners() {
  if (listening) return

  FIRST_INTERACTION_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, fire, { once: true, passive: true })
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
  callbacks.add(callback)

  return () => {
    callbacks.delete(callback)
  }
}
