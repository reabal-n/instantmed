"use client"

import { useEffect } from "react"

import { captureAttribution } from "@/lib/analytics/attribution"

/**
 * Initializes Google Consent Mode v2 and loads Google Analytics/Ads (gtag.js).
 *
 * Uses useEffect + DOM APIs instead of next/script to avoid the React 19
 * "Encountered a script tag while rendering React component" error. React never
 * creates a <script> DOM node - the script is injected directly into <head>.
 *
 * Consent defaults are set BEFORE gtag.js loads (order within the effect).
 */
export function GoogleTags() {
  useEffect(() => {
    window.dataLayer = window.dataLayer || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function gtag(...args: any[]) { window.dataLayer!.push(args) }
    window.gtag = gtag

    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
      functionality_storage: "granted",
      personalization_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500,
    })

    // Load gtag.js after consent defaults are set
    const script = document.createElement("script")
    script.src = "https://www.googletagmanager.com/gtag/js?id=AW-17795889471"
    script.async = true
    script.onload = () => {
      gtag("js", new Date())
      gtag("config", "AW-17795889471", { allow_enhanced_conversions: true })
    }
    document.head.appendChild(script)

    // Capture gclid/gbraid/wbraid + UTM params on first page load.
    // Must run client-side after navigation so URL params are available.
    captureAttribution()

    return () => {
      if (script.parentNode) document.head.removeChild(script)
    }
  }, [])

  return null
}
