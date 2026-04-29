"use client"

import { useEffect } from "react"

/**
 * Captures ?ref=<code> from the URL and persists it as a 30-day cookie.
 * The cookie is read server-side in lib/stripe/checkout.ts when building
 * the Stripe session metadata, enabling referral attribution at payment time.
 *
 * Non-sensitive value - no need for HttpOnly.
 */
export function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")
    if (!ref) return
    // Validate: referral codes are 8 uppercase alphanumeric chars
    if (!/^[A-Z0-9]{8}$/.test(ref)) return
    // 30-day expiry; SameSite=Lax so it survives link redirects
    document.cookie = `instantmed_ref=${ref}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`
  }, [])

  return null
}
