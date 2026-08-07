/**
 * Soft-keyboard visible-viewport math for full-screen fixed sheets.
 *
 * iOS Safari keeps the layout viewport (and therefore `100dvh`, `position:
 * fixed`, and `window.innerHeight`) full-size while the software keyboard is
 * up — the keyboard is an overlay, and only `window.visualViewport` reports
 * the shrunken visible band. A full-height sheet with a body scroll lock
 * therefore renders its bottom third underneath the keyboard with no way to
 * scroll it into view. Same failure class the intake flow's
 * `--keyboard-offset` handling solves for the mobile action bar
 * (components/request/request-flow.tsx); this is the shared, unit-testable
 * form of that formula for sheets that must resize rather than pad.
 */

export type KeyboardInset = {
  /** Distance from the layout-viewport top to the visible band (px). */
  top: number
  /** Height of the visible band above the keyboard (px). */
  height: number
}

export type ViewportMetrics = {
  innerHeight: number
  offsetTop: number
  height: number
  scale: number
}

/**
 * Occlusions smaller than this are browser chrome (iOS URL-bar collapse is
 * ~60-100px, input accessory bars ~55px), not a keyboard (~260-400px).
 * Resizing the sheet for chrome churn would make the layout jump on scroll.
 * Boundary pinned by lib/__tests__/keyboard-inset.test.ts — update both.
 */
const KEYBOARD_INSET_MIN_PX = 150

/**
 * Pinch-zoom shrinks `visualViewport.height` exactly the way a keyboard
 * does, so the two are indistinguishable once zoomed. Never resize the
 * sheet under zoom — the doctor may be zooming Parchment's dense layout
 * deliberately, and a wrongly shrunken prescribing surface is worse than a
 * temporarily occluded one.
 * Boundary pinned by lib/__tests__/keyboard-inset.test.ts — update both.
 */
const KEYBOARD_INSET_MAX_NATURAL_SCALE = 1.1

export function computeKeyboardInset(metrics: ViewportMetrics): KeyboardInset | null {
  if (metrics.scale > KEYBOARD_INSET_MAX_NATURAL_SCALE) return null

  const occlusion = metrics.innerHeight - (metrics.offsetTop + metrics.height)
  if (occlusion < KEYBOARD_INSET_MIN_PX) return null

  return {
    top: Math.max(0, Math.round(metrics.offsetTop)),
    height: Math.max(0, Math.round(metrics.height)),
  }
}
