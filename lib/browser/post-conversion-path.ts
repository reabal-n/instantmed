/**
 * Post-conversion pages where measurement matters more than mobile LCP.
 *
 * Everywhere else, analytics/telemetry init is gated behind the first user
 * interaction (see `onFirstInteraction`) to protect LCP/TBT on acquisition and
 * /request pages. That gate actively BREAKS measurement on confirmation pages:
 * a user who lands on the success page and never clicks would never fire the
 * `purchase_completed` / gtag purchase events. These prefixes bypass the gate.
 *
 * Single source of truth — consumed by instrumentation-client.ts (PostHog init),
 * components/providers/google-tags.tsx, and components/providers/global-deferred-clients.tsx.
 */
export const POST_CONVERSION_PATH_PREFIXES = [
  "/patient/intakes/success",
] as const

export function isPostConversionPathname(pathname: string): boolean {
  return POST_CONVERSION_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isPostConversionPath(): boolean {
  if (typeof window === "undefined") return false
  return isPostConversionPathname(window.location.pathname)
}
